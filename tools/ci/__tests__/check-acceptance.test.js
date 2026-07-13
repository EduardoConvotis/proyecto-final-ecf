// TDD del gate FR-005f: la lógica pura de evaluación de acceptance criteria.
// Ejecutar: npx vitest run tools/ci
import { describe, it, expect } from "vitest";
import { evaluateCheck, evaluateResults } from "../check-acceptance.js";

describe("evaluateCheck", () => {
  it("pasa cuando status y body coinciden", () => {
    const r = evaluateCheck(
      { name: "health", expectStatus: 200, expectBodyContains: "ok" },
      { status: 200, body: '{"status":"ok"}' }
    );
    expect(r.pass).toBe(true);
  });

  it("falla cuando el status no coincide", () => {
    const r = evaluateCheck(
      { name: "health", expectStatus: 200 },
      { status: 500, body: "" }
    );
    expect(r.pass).toBe(false);
    expect(r.detail).toContain("500");
  });

  it("falla cuando el body no contiene lo esperado", () => {
    const r = evaluateCheck(
      { name: "orders", expectStatus: 200, expectBodyContains: "orderId" },
      { status: 200, body: "[]" }
    );
    expect(r.pass).toBe(false);
  });

  it("falla si el check no tiene name", () => {
    const r = evaluateCheck({ expectStatus: 200 }, { status: 200, body: "" });
    expect(r.pass).toBe(false);
  });
});

describe("evaluateResults", () => {
  it("ok=true solo si todos pasan", () => {
    const checks = [
      { name: "a", expectStatus: 200 },
      { name: "b", expectStatus: 201 },
    ];
    const responses = [
      { status: 200, body: "" },
      { status: 201, body: "" },
    ];
    expect(evaluateResults(checks, responses).ok).toBe(true);
  });

  it("cuenta los fallos y marca ok=false", () => {
    const checks = [
      { name: "a", expectStatus: 200 },
      { name: "b", expectStatus: 200 },
    ];
    const responses = [
      { status: 200, body: "" },
      { status: 404, body: "" },
    ];
    const out = evaluateResults(checks, responses);
    expect(out.ok).toBe(false);
    expect(out.failed).toBe(1);
  });

  it("una respuesta ausente cuenta como fallo (fail-safe)", () => {
    const out = evaluateResults([{ name: "a", expectStatus: 200 }], []);
    expect(out.ok).toBe(false);
  });
});
