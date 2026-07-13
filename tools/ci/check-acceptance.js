// Verificación de acceptance criteria contra la API (gate FR-005f, componente backend).
// Feature 002-cicd-pipeline. Sin dependencias externas (usa fetch global de Node >=18).
//
// Uso:  node tools/ci/check-acceptance.js --base http://localhost:3000 --checks tools/ci/acceptance/backend.json
// Sale con código !=0 si algún check falla (bloquea el merge vía el job del workflow).
//
// La lógica de evaluación (evaluateCheck / evaluateResults) es PURA y sin red, para poder
// testearla en TDD (tools/ci/__tests__/check-acceptance.test.js).

/**
 * Evalúa un check contra una respuesta ya obtenida.
 * @param {{name:string, expectStatus?:number, expectBodyContains?:string}} check
 * @param {{status:number, body:string}} response
 * @returns {{name:string, pass:boolean, detail:string}}
 */
export function evaluateCheck(check, response) {
  if (typeof check?.name !== "string" || check.name.length === 0) {
    return { name: String(check?.name ?? "?"), pass: false, detail: "check sin 'name'" };
  }
  if (typeof check.expectStatus === "number" && response.status !== check.expectStatus) {
    return {
      name: check.name,
      pass: false,
      detail: `status esperado ${check.expectStatus}, recibido ${response.status}`,
    };
  }
  if (
    typeof check.expectBodyContains === "string" &&
    !String(response.body ?? "").includes(check.expectBodyContains)
  ) {
    return {
      name: check.name,
      pass: false,
      detail: `el body no contiene "${check.expectBodyContains}"`,
    };
  }
  return { name: check.name, pass: true, detail: "ok" };
}

/**
 * Agrega resultados. `responses[i]` corresponde a `checks[i]`.
 * @returns {{ok:boolean, total:number, failed:number, results:Array}}
 */
export function evaluateResults(checks, responses) {
  const results = checks.map((c, i) => evaluateCheck(c, responses[i] ?? { status: 0, body: "" }));
  const failed = results.filter((r) => !r.pass).length;
  return { ok: failed === 0, total: results.length, failed, results };
}

// ----- Runner (efectos: red + proceso). No se ejecuta al importar en tests. -----
async function main() {
  const args = process.argv.slice(2);
  const get = (flag, def) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : def;
  };
  const base = get("--base", process.env.API_BASE_URL || "http://localhost:3000");
  const checksPath = get("--checks", "tools/ci/acceptance/backend.json");

  const { readFile } = await import("node:fs/promises");
  const checks = JSON.parse(await readFile(checksPath, "utf8"));

  const responses = [];
  for (const c of checks) {
    try {
      const res = await fetch(base + c.path, { method: c.method || "GET" });
      responses.push({ status: res.status, body: await res.text() });
    } catch (err) {
      responses.push({ status: 0, body: String(err) });
    }
  }

  const summary = evaluateResults(checks, responses);
  for (const r of summary.results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : " — " + r.detail}`);
  }
  console.log(`\n${summary.total - summary.failed}/${summary.total} acceptance checks OK`);
  if (!summary.ok) process.exit(1);
}

// Ejecuta solo si se invoca directamente (no al importarse desde el test).
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
