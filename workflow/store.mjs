import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');

export class CaseStore {
  constructor(path) {
    const absolute = resolve(path);
    mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(absolute);
    chmodSync(absolute, 0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, input_hash TEXT UNIQUE NOT NULL, data TEXT NOT NULL, lease_until INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, bytes BLOB NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(case_id,kind));`);
  }
  create(input) {
    const hash = digest(input);
    const existing = this.db.prepare('SELECT id FROM cases WHERE input_hash=?').get(hash);
    if (existing) return { record: this.get(existing.id), created: false };
    const record = { id: randomUUID(), inputHash: hash, input, mode: 'REAL_INPUT', status: 'IMPORTED', stage: 'qualify', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), qualification: null, evidence: null, authorization: null, blocker: null };
    this.db.prepare('INSERT INTO cases(id,input_hash,data) VALUES(?,?,?)').run(record.id, hash, JSON.stringify(record));
    this.event(record.id, 'imported', 'Property record imported; no discovery or outreach was performed.', { inputHash: hash });
    return { record, created: true };
  }
  get(id) { const row = this.db.prepare('SELECT data FROM cases WHERE id=?').get(id); return row ? JSON.parse(row.data) : null; }
  save(record) {
    record.updatedAt = new Date().toISOString(); record.version++;
    this.db.prepare('UPDATE cases SET data=? WHERE id=?').run(JSON.stringify(record), record.id);
    return record;
  }
  list() { return this.db.prepare('SELECT data FROM cases ORDER BY rowid DESC LIMIT 100').all().map(row => JSON.parse(row.data)); }
  event(id, type, summary, detail = {}) {
    this.db.prepare('INSERT INTO events(case_id,data) VALUES(?,?)').run(id, JSON.stringify({ at: new Date().toISOString(), type, summary, detail }));
  }
  events(id) { return this.db.prepare('SELECT seq,data FROM events WHERE case_id=? ORDER BY seq').all(id).map(row => ({ seq: row.seq, ...JSON.parse(row.data) })); }
  acquire(id) { return this.db.prepare('UPDATE cases SET lease_until=? WHERE id=? AND lease_until<?').run(Date.now()+300_000, id, Date.now()).changes === 1; }
  release(id) { this.db.prepare('UPDATE cases SET lease_until=0 WHERE id=?').run(id); }
  artifact(caseId, kind, name, mime, bytes) {
    const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const sha = digest(body), prior = this.db.prepare('SELECT id,sha256 FROM artifacts WHERE case_id=? AND kind=?').get(caseId, kind);
    if (prior && prior.sha256 !== sha) throw new Error('An existing artifact cannot be overwritten; import a revised case.');
    if (!prior) this.db.prepare('INSERT INTO artifacts VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), caseId, kind, name, mime, body, sha, new Date().toISOString());
    return this.artifacts(caseId).find(a => a.kind === kind);
  }
  artifacts(id) { return this.db.prepare('SELECT id,kind,name,mime,sha256,created_at AS createdAt,length(bytes) AS size FROM artifacts WHERE case_id=?').all(id); }
  download(caseId, id) { return this.db.prepare('SELECT * FROM artifacts WHERE case_id=? AND id=?').get(caseId,id); }
  close() { this.db.close(); }
  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result=work(); this.db.exec('COMMIT'); return result; }
    catch(error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
