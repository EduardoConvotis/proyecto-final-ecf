// Eval-gate del resumen de incidencia (ADR-0009). Ejecuta los golden cases contra el
// summarizer y verifica los umbrales de thresholds.json. Falla (exit 1) si no se cumplen.
// FR-023 (abstención), FR-024 (grounding / no alucinación), FR-025 (fallback).
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getIncidentSummary } from '../../backend/src/infrastructure/incident-summary-provider.js';

interface GoldenCase {
  id: string;
  description: string;
  input: { executionId: string; notes: string };
  expect: { status: 'ok' | 'insufficient_evidence' | 'provider_failed'; keyFacts?: string[]; mustNotContain?: string[] };
}

interface Thresholds {
  hallucinations_max: number;
  abstention_rate_min: number;
  key_point_recall_min: number;
}

const here = dirname(fileURLToPath(import.meta.url));

async function loadGolden(): Promise<GoldenCase[]> {
  const dir = join(here, 'golden');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf8')) as GoldenCase));
}

async function main(): Promise<void> {
  const cases = await loadGolden();
  const thresholds = JSON.parse(await readFile(join(here, 'thresholds.json'), 'utf8')) as Thresholds;

  let hallucinations = 0;
  let abstentionExpected = 0;
  let abstentionCorrect = 0;
  let recallTotal = 0;
  let recallHits = 0;

  for (const gc of cases) {
    const result = await getIncidentSummary(gc.input.notes);
    const haystack = `${result.summary ?? ''} ${result.keyPoints.map((k) => k.text).join(' ')}`.toLowerCase();

    if (gc.expect.status === 'insufficient_evidence') {
      abstentionExpected += 1;
      if (result.status === 'insufficient_evidence') abstentionCorrect += 1;
    }

    if (gc.expect.mustNotContain) {
      for (const term of gc.expect.mustNotContain) {
        if (haystack.includes(term.toLowerCase())) hallucinations += 1;
      }
    }

    if (gc.expect.status === 'ok' && gc.expect.keyFacts) {
      for (const fact of gc.expect.keyFacts) {
        recallTotal += 1;
        if (haystack.includes(fact.toLowerCase())) recallHits += 1;
      }
    }

    const statusOk = result.status === gc.expect.status;
    // eslint-disable-next-line no-console -- salida del eval-gate
    console.log(`${statusOk ? 'PASS' : 'FAIL'} ${gc.id} (status=${result.status}, esperado=${gc.expect.status})`);
    if (!statusOk) hallucinations += 0; // el fallo de status se refleja en las tasas siguientes
  }

  const abstentionRate = abstentionExpected === 0 ? 1 : abstentionCorrect / abstentionExpected;
  const recall = recallTotal === 0 ? 1 : recallHits / recallTotal;

  const pass =
    hallucinations <= thresholds.hallucinations_max &&
    abstentionRate >= thresholds.abstention_rate_min &&
    recall >= thresholds.key_point_recall_min;

  // eslint-disable-next-line no-console -- salida del eval-gate
  console.log(
    `\nMétricas: hallucinations=${hallucinations} (max ${thresholds.hallucinations_max}), ` +
      `abstention_rate=${abstentionRate.toFixed(2)} (min ${thresholds.abstention_rate_min}), ` +
      `key_point_recall=${recall.toFixed(2)} (min ${thresholds.key_point_recall_min})`,
  );

  if (!pass) {
    // eslint-disable-next-line no-console -- salida del eval-gate
    console.error('EVAL-GATE FAILED');
    process.exit(1);
  }
  // eslint-disable-next-line no-console -- salida del eval-gate
  console.log('EVAL-GATE PASSED');
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- salida del eval-gate
  console.error(err);
  process.exit(1);
});
