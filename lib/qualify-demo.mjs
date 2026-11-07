import { DeskConfigSchema, SuppressionSchema, qualifyAll, HeuristicReviewer, MemoryLlmCache, toCaseRecord } from '../taxappeal-qualify/dist/src/index.js';
import configData from '../taxappeal-qualify/config/desk.placeholder.json' with { type: 'json' };
import candidates from '../taxappeal-qualify/data/candidates.sample.json' with { type: 'json' };
import suppressionData from '../taxappeal-qualify/data/suppression.sample.json' with { type: 'json' };

// Deliberately offline: public visitors cannot trigger paid model calls or outreach.
export async function runQualifyDemo() {
  const config = DeskConfigSchema.parse(configData);
  const run = await qualifyAll(candidates, {
    config, today: '2026-11-05', suppression: SuppressionSchema.parse(suppressionData),
    priorResults: new Map(), llm: new HeuristicReviewer(), llmCache: new MemoryLlmCache(),
    models: { primary: 'mock-model', escalation: null },
  });
  const byParcel = new Map(candidates.map(c => [c.parcelId, c]));
  return {
    mode: 'synthetic', reviewer: 'offline heuristic', asOf: '2026-11-05',
    runAt: new Date().toISOString(), configVersion: config.version, counts: run.counts,
    merged: run.merged, released: run.results.filter(r => r.releaseDate).length,
    cases: run.results.map(r => toCaseRecord(r, { candidate: byParcel.get(r.parcelId), config })),
  };
}
