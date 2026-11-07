#!/usr/bin/env node
/**
 * Qualify CLI.
 *
 *   qualify run      --candidates <file> --config <file> [--suppression <file>] [--today YYYY-MM-DD]
 *                    [--llm naive|mock|off] [--out out/results.json] [--audit out/audit.jsonl]
 *   qualify show     --results <file> --case <caseId>
 *   qualify review   --results <file> --case <caseId> --by <name>
 *                    (--approve | --reject <CODE> | --exclude-comps id,id [--patch '<json>'])
 *                    [--note <text>] [--candidates <file> --config <file>]   (edit needs these)
 *   qualify cases    --results <file> [--candidates <file>] [--config <file>] [--export out/cases.json]
 *                    (exports results as dossier-shaped case records for the Claim OS UI)
 *   qualify validate-config --config <file>
 *   qualify codes
 *
 * Env: NAIVE_API_KEY (or the repo's VETTA_API_KEY), NAIVE_API_BASE_URL (or VETTA_API_BASE_URL),
 *      QUALIFY_MODEL, QUALIFY_ESCALATION_MODEL, QUALIFY_TIMEZONE. Read from taxappeal-qualify/.env, then the repo-root .env.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { loadDeskConfig, loadSuppression } from "./config.js";
import { CODES } from "./codes.js";
import { appendAudit, toAuditRecord } from "./audit.js";
import type { QualifyContext } from "./draft.js";
import { FileLlmCache, type LlmClient } from "./llm/client.js";
import { NaiveLlmClient, naiveCredentialsFromEnv } from "./llm/naive.js";
import { HeuristicReviewer } from "./llm/mock.js";
import { qualifyAll } from "./pipeline.js";
import { renderCase, renderTable } from "./report.js";
import { toCaseRecord, toQualifyBeat } from "./case.js";
import { applyReview, ReviewError, type ReviewAction } from "./review.js";
import type { QualifyResult } from "./types.js";
import { getPath, todayIn } from "./util.js";

// taxappeal-qualify/.env first, then the repo-root .env (where the team keeps VETTA_API_KEY).
// loadEnvFile never overwrites a variable that is already set, so the first file wins.
for (const envFile of [".env", "../.env"]) {
  try {
    (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(envFile);
  } catch {
    /* file absent — fine */
  }
}


interface ResultsFile {
  runAt: string;
  today: string;
  configVersion: string;
  counts: Record<string, number>;
  results: QualifyResult[];
}

const [cmd, ...rest] = process.argv.slice(2);
const { values: a } = parseArgs({
  args: rest,
  options: {
    candidates: { type: "string" },
    config: { type: "string" },
    suppression: { type: "string" },
    today: { type: "string" },
    llm: { type: "string" },
    out: { type: "string", default: "out/results.json" },
    audit: { type: "string", default: "out/audit.jsonl" },
    results: { type: "string", default: "out/results.json" },
    case: { type: "string" },
    by: { type: "string" },
    approve: { type: "boolean" },
    reject: { type: "string" },
    "exclude-comps": { type: "string" },
    patch: { type: "string" },
    note: { type: "string" },
    json: { type: "boolean" },
    export: { type: "string" },
  },
  allowPositionals: false,
});

function need(v: string | undefined, name: string): string {
  if (!v) fail(`--${name} is required`);
  return v!;
}
function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(2);
}
const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));
function writeJson(p: string, v: unknown) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
}

function makeLlm(mode: string | undefined): { client: LlmClient | null; note: string } {
  const { apiKey: key, baseUrl } = naiveCredentialsFromEnv();
  const m = mode ?? (key ? "naive" : "off");
  if (m === "off") return { client: null, note: key ? "LLM off (--llm off)" : "LLM off (no NAIVE_API_KEY / VETTA_API_KEY; use --llm mock for an offline reviewer)" };
  if (m === "mock") return { client: new HeuristicReviewer(), note: "LLM: offline heuristic reviewer (mock)" };
  if (m === "naive") {
    if (!key) fail("--llm naive needs NAIVE_API_KEY (or VETTA_API_KEY) in the environment, taxappeal-qualify/.env, or the repo-root .env");
    return { client: new NaiveLlmClient({ apiKey: key, baseUrl }), note: "LLM: Naïve model proxy" };
  }
  fail(`unknown --llm ${m} (naive|mock|off)`);
}

async function run() {
  const config = loadDeskConfig(need(a.config, "config"));
  const today = a.today ?? todayIn(process.env.QUALIFY_TIMEZONE);
  const raws = readJson(need(a.candidates, "candidates"));
  if (!Array.isArray(raws)) fail("candidates file must be a JSON array");

  const prior = new Map<string, QualifyResult>();
  if (existsSync(a.out!)) for (const r of (readJson(a.out!) as ResultsFile).results ?? []) prior.set(r.caseId, r);

  const { client, note } = makeLlm(a.llm);
  const primary = process.env.QUALIFY_MODEL || config.llm.model || (a.llm === "mock" ? "mock-model" : null);
  const ctx: QualifyContext = {
    config,
    today,
    suppression: loadSuppression(a.suppression),
    priorResults: prior,
    llm: client,
    llmCache: client ? new FileLlmCache(".cache/llm") : undefined,
    models: { primary, escalation: process.env.QUALIFY_ESCALATION_MODEL || config.llm.escalationModel },
  };

  const sum = await qualifyAll(raws, ctx);
  const file: ResultsFile = { runAt: new Date().toISOString(), today, configVersion: config.version, counts: sum.counts, results: sum.results };
  writeJson(a.out!, file);
  appendAudit(a.audit!, sum.results.map((r) => toAuditRecord(r, "qualified", today)));

  if (a.json) return console.log(JSON.stringify(file, null, 2));
  console.log(`Qualify · ${config.jurisdiction.name} · config ${config.version} · today ${today}`);
  console.log(note + (client && primary ? ` · model ${primary}` : ""));
  console.log();
  console.log(renderTable(sum));
  console.log(`\nWrote ${a.out} and appended ${sum.results.length} record(s) to ${a.audit}`);
}

async function review() {
  const path = a.results!;
  const file = readJson(path) as ResultsFile;
  const id = need(a.case, "case");
  const by = need(a.by, "by");
  const i = file.results.findIndex((r) => r.caseId === id);
  if (i < 0) fail(`no case ${id} in ${path}`);
  const current = file.results[i]!;

  let action: ReviewAction;
  if (a.approve) action = { type: "approve", note: a.note };
  else if (a.reject) action = { type: "reject", code: a.reject, note: a.note };
  else if (a["exclude-comps"] || a.patch)
    action = {
      type: "edit",
      excludeComps: a["exclude-comps"]?.split(",").map((s) => s.trim()).filter(Boolean),
      patch: a.patch ? JSON.parse(a.patch) : undefined,
      note: a.note,
    };
  else fail("choose one of --approve, --reject <CODE>, --exclude-comps, --patch");

  let opts = {};
  if (action.type === "edit") {
    const config = loadDeskConfig(need(a.config, "config"));
    const raws = readJson(need(a.candidates, "candidates")) as unknown[];
    const candidate = raws.filter((r) => getPath(r, "parcelId") === current.parcelId && getPath(r, "jurisdictionId") === current.jurisdictionId).at(-1);
    if (!candidate) fail(`candidate ${current.parcelId} not found in ${a.candidates}`);
    opts = {
      candidate,
      ctx: { config, today: file.today, suppression: loadSuppression(a.suppression), priorResults: new Map(), llm: null } satisfies QualifyContext,
    };
  }

  try {
    const updated = await applyReview(current, action, by, opts);
    file.results[i] = updated;
    file.counts = file.results.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
    writeJson(path, file);
    appendAudit(a.audit!, [toAuditRecord(updated, "reviewed")]);
    console.log(renderCase(updated));
  } catch (e) {
    if (e instanceof ReviewError) fail(e.message);
    throw e;
  }
}

function show() {
  const file = readJson(a.results!) as ResultsFile;
  const r = file.results.find((x) => x.caseId === need(a.case, "case"));
  if (!r) fail(`no case ${a.case}`);
  console.log(a.json ? JSON.stringify(r, null, 2) : renderCase(r!));
}

/** Export results as dossier-shaped case records (prototype `caseRecord` fields + Qualify fields). */
function cases() {
  const file = readJson(a.results!) as ResultsFile;
  const config = a.config ? loadDeskConfig(a.config) : undefined;
  const raws = a.candidates ? (readJson(a.candidates) as unknown[]) : [];
  // Newest record per parcel, matching qualifyAll's dedupe.
  const byKey = new Map<string, unknown>();
  for (const c of [...raws].sort((x, y) => String(getPath(x, "provenance.fetchedAt") ?? "").localeCompare(String(getPath(y, "provenance.fetchedAt") ?? ""))))
    byKey.set(`${getPath(c, "jurisdictionId")}|${getPath(c, "parcelId")}`, c);
  const out = {
    exportedAt: new Date().toISOString(),
    today: file.today,
    configVersion: file.configVersion,
    counts: file.counts,
    cases: file.results.map((r) => ({
      ...toCaseRecord(r, { candidate: byKey.get(`${r.jurisdictionId}|${r.parcelId}`), config }),
      beat: toQualifyBeat(r),
    })),
  };
  if (a.export) {
    writeJson(a.export, out);
    console.log(`Wrote ${out.cases.length} case record(s) to ${a.export}`);
  } else console.log(JSON.stringify(out, null, 2));
}

async function main() {
  switch (cmd) {
    case "run":
      return run();
    case "review":
      return review();
    case "show":
      return show();
    case "cases":
      return cases();
    case "validate-config":
      loadDeskConfig(need(a.config, "config"));
      return console.log("config OK");
    case "codes":
      for (const [k, v] of Object.entries(CODES)) console.log(`${k.padEnd(24)} ${v}`);
      return;
    default:
      console.log(readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]!.replace(/^#!.*\n\/\*\*?/, "").replace(/^ \* ?/gm, ""));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
