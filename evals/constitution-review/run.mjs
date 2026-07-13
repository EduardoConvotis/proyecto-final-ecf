// Eval del gate de revisión de constitución (FR-017 / SC-007).
// Ejecuta los golden cases contra el revisor y falla si se supera el umbral (fail-closed).
//
// Uso:
//   node evals/constitution-review/run.mjs                 # invoca al revisor real (por cablear)
//   node evals/constitution-review/run.mjs --results out.json   # usa veredictos precomputados
//
// out.json: [{ "id": "...", "verdict": "pass|fail" }, ...]
//
// El scoring es puro (scoreCases) para poder testearlo aparte.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

export function scoreCases(cases, verdictsById, thresholds) {
  let falseNegatives = 0; // esperaba fail, dijo pass (¡lo peor!)
  let falsePositives = 0; // esperaba pass, dijo fail
  const details = [];
  for (const c of cases) {
    const got = verdictsById[c.id];
    if (got == null) {
      // sin veredicto ⇒ fail-closed ⇒ cuenta como no-pass; si esperaba pass es FP, si fail es correcto
      if (c.expectedVerdict === "pass") falsePositives++;
      details.push({ id: c.id, expected: c.expectedVerdict, got: "missing(fail-closed)" });
      continue;
    }
    if (c.expectedVerdict === "fail" && got === "pass") falseNegatives++;
    if (c.expectedVerdict === "pass" && got === "fail") falsePositives++;
    details.push({ id: c.id, expected: c.expectedVerdict, got });
  }
  const ok =
    cases.length >= (thresholds.minCases ?? 0) &&
    falseNegatives <= (thresholds.maxFalseNegatives ?? 0) &&
    falsePositives <= (thresholds.maxFalsePositives ?? Infinity);
  return { ok, falseNegatives, falsePositives, total: cases.length, details };
}

async function loadCases() {
  const casesDir = path.join(DIR, "cases");
  const files = (await readdir(casesDir)).filter((f) => f.endsWith(".json"));
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(casesDir, f), "utf8"))));
}

async function main() {
  const args = process.argv.slice(2);
  const resultsIdx = args.indexOf("--results");
  const thresholds = JSON.parse(await readFile(path.join(DIR, "thresholds.json"), "utf8"));
  const cases = await loadCases();

  let verdictsById = {};
  if (resultsIdx >= 0) {
    const arr = JSON.parse(await readFile(args[resultsIdx + 1], "utf8"));
    verdictsById = Object.fromEntries(arr.map((r) => [r.id, r.verdict]));
  } else {
    // TODO(infra): invocar aquí la Claude Code Action / API del agente por cada case.
    // Mientras no esté cableado, fail-closed: sin veredictos reales el eval no puede pasar.
    console.error(
      "No hay revisor cableado. Ejecuta con --results <file> o integra la API del agente. (fail-closed)"
    );
    process.exit(1);
  }

  const score = scoreCases(cases, verdictsById, thresholds);
  console.log(JSON.stringify(score, null, 2));
  if (!score.ok) {
    console.error(
      `Eval FALLA: FN=${score.falseNegatives} (máx ${thresholds.maxFalseNegatives}), FP=${score.falsePositives} (máx ${thresholds.maxFalsePositives}), casos=${score.total} (mín ${thresholds.minCases})`
    );
    process.exit(1);
  }
  console.log("Eval OK");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
