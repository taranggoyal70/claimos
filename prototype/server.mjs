import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
const API_BASE = process.env.VETTA_API_BASE_URL || 'https://api.vetta.sh';
const API_KEY = process.env.VETTA_API_KEY || '';
const audioCache = new Map();
let cliStatus = { checkedAt: 0, configured: false };
const ROUTES = new Map([
  ['/', 'index.html'],
  ['/live', 'live.html'],
  ['/app', 'app.html'],
  ['/case', 'case.html'],
  ['/desks', 'desks.html'],
  ['/intake', 'intake.html'],
  ['/proof', 'proof.html'],
]);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
};

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error('request_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function hasCliProfile() {
  if (API_KEY) return { configured: true, source: 'api-key' };
  if (Date.now() - cliStatus.checkedAt < 30_000) return { configured: cliStatus.configured, source: cliStatus.configured ? 'cli-profile' : 'none' };
  try {
    await execFileAsync('vetta', ['whoami'], { timeout: 8_000, maxBuffer: 128_000 });
    cliStatus = { checkedAt: Date.now(), configured: true };
  } catch {
    cliStatus = { checkedAt: Date.now(), configured: false };
  }
  return { configured: cliStatus.configured, source: cliStatus.configured ? 'cli-profile' : 'none' };
}

async function directSpeech({ text, voice, speed }) {
  const generated = await fetch(`${API_BASE}/v1/media/audio/speech`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify({ text, model: 'tts/auto', voice, speed, format: 'wav' }),
  });
  if (!generated.ok) throw new Error(`naive_speech_${generated.status}:${await generated.text()}`);
  const speech = await generated.json();
  const fileId = speech?.file?.id;
  if (!fileId) throw new Error('naive_speech_missing_file');
  const downloaded = await fetch(`${API_BASE}/v1/files/${encodeURIComponent(fileId)}?download=true`, {
    headers: { authorization: `Bearer ${API_KEY}` },
  });
  if (!downloaded.ok) throw new Error(`naive_file_${downloaded.status}:${await downloaded.text()}`);
  return { bytes: Buffer.from(await downloaded.arrayBuffer()), contentType: downloaded.headers.get('content-type') || 'audio/wav', model: speech.model };
}

async function cliSpeech({ text, voice, speed }) {
  const { stdout } = await execFileAsync('vetta', [
    'media', 'speak', text,
    '--model', 'tts/auto',
    '--voice', voice,
    '--format', 'wav',
    '--speed', String(speed),
    '--json',
  ], { timeout: 60_000, maxBuffer: 2_000_000 });
  const speech = JSON.parse(String(stdout));
  const fileId = speech?.file?.id;
  if (!fileId) throw new Error('naive_cli_missing_file');
  const downloaded = await execFileAsync('vetta', ['file', 'download', fileId], {
    timeout: 30_000,
    encoding: 'buffer',
    maxBuffer: 12_000_000,
  });
  return { bytes: Buffer.from(downloaded.stdout), contentType: speech.file.content_type || 'audio/wav', model: speech.model };
}

async function generateSpeech(input) {
  const key = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  if (audioCache.has(key)) return audioCache.get(key);
  const status = await hasCliProfile();
  if (!status.configured) throw new Error('naive_not_configured');
  const pending = API_KEY ? directSpeech(input) : cliSpeech(input);
  audioCache.set(key, pending);
  try {
    const result = await pending;
    audioCache.set(key, result);
    return result;
  } catch (error) {
    audioCache.delete(key);
    throw error;
  }
}

async function serveStatic(request, response) {
  const rawPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  const relative = ROUTES.get(rawPath) || decodeURIComponent(rawPath.slice(1));
  const safe = normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
  const path = join(ROOT, safe);
  if (!path.startsWith(ROOT)) return json(response, 403, { error: 'forbidden' });
  try {
    const info = await stat(path);
    const filePath = info.isDirectory() ? join(path, 'index.html') : path;
    const bytes = await readFile(filePath);
    response.writeHead(200, { 'content-type': TYPES[extname(filePath)] || 'application/octet-stream' });
    response.end(bytes);
  } catch {
    json(response, 404, { error: 'not_found' });
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === 'GET' && url.pathname === '/api/qualify') {
      const { runQualifyDemo } = await import('../lib/qualify-demo.mjs');
      return json(response, 200, await runQualifyDemo());
    }
    if (request.method === 'GET' && url.pathname === '/api/voice/status') {
      const status = await hasCliProfile();
      return json(response, 200, { provider: 'naive', ...status, fallback: 'browser' });
    }
    if (request.method === 'POST' && url.pathname === '/api/voice/speak') {
      const body = await readJson(request);
      const text = String(body.text || '').trim();
      const allowedVoices = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']);
      const voice = allowedVoices.has(body.voice) ? body.voice : 'coral';
      const speed = Math.max(0.5, Math.min(2, Number(body.speed || 1)));
      if (!text || text.length > 4096) return json(response, 400, { error: 'invalid_text' });
      const audio = await generateSpeech({ text, voice, speed });
      response.writeHead(200, {
        'content-type': audio.contentType,
        'cache-control': 'private, max-age=3600',
        'x-naive-model': audio.model || 'unknown',
      });
      return response.end(audio.bytes);
    }
    return serveStatic(request, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'naive_not_configured' ? 503 : message === 'request_too_large' ? 413 : 502;
    json(response, status, { error: message.split(':', 1)[0] });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Claim OS prototype: http://127.0.0.1:${PORT}`);
  console.log(`Naive voice: ${API_KEY ? 'VETTA_API_KEY' : 'CLI profile (vetta login)'}`);
});
