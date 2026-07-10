import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLaws,
  parseRequirements,
  parseEdgeCases,
  requirementsReferencedInTests,
  coverageReport,
  parseTasks,
  taskCoverage,
} from "../src/parse.js";

const CONSTITUTION = `# Demo Constitution

## Core Principles

### I. TypeScript Estricto
rule...

### II. Simplicidad y YAGNI
rule...

### VII. Contract-First (Contratos en OpenAPI)
rule...

## Restricciones Técnicas
- stuff

## Governance
Amendments...
`;

const SPEC = `# Feature Specification: Demo

## User Scenarios & Testing *(mandatory)*

### User Story 1

**Acceptance Scenarios**:

1. **Given** x, **When** y, **Then** z (covers FR-001).

### Edge Cases

- **EC-001**: something happens and the reference wraps onto the next line
  (relacionado con FR-002).
- **EC-002**: another thing with no requirement link.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system SHALL maintain each order with a lifecycle
  state.
- **FR-002**: When a technician submits, the system SHALL record it.
- **FR-003**: The system SHALL protect data.

### Trazabilidad Requisito → Principio

| Requisito | Principio(s) |
|-----------|--------------|
| FR-001 | III |
| FR-002 | III, IV, VII |
| FR-003 |  |
`;

test("parseLaws extracts principles plus governance with stable ids", () => {
  const laws = parseLaws(CONSTITUTION);
  assert.equal(laws.length, 4);
  assert.deepEqual(laws[0], { id: "LAW-01", numeral: "I", title: "TypeScript Estricto" });
  assert.equal(laws[2].numeral, "VII");
  assert.equal(laws[3].title, "Governance");
  assert.equal(laws[3].id, "LAW-04");
});

test("parseRequirements joins wrapped lines and links principles", () => {
  const reqs = parseRequirements(SPEC);
  assert.equal(reqs.length, 3);
  assert.equal(reqs[0].id, "FR-001");
  assert.match(reqs[0].text, /lifecycle state\.$/); // continuation joined
  assert.equal(reqs[1].principles, "III, IV, VII");
  assert.equal(reqs[2].principles, "");
});

test("parseEdgeCases extracts ids and related FRs (incl. wrapped lines)", () => {
  const edges = parseEdgeCases(SPEC);
  assert.equal(edges.length, 2);
  assert.deepEqual(edges[0].relatedFr, ["FR-002"]); // FR ref lives on the wrapped 2nd line
  assert.deepEqual(edges[1].relatedFr, []);
});

test("requirementsReferencedInTests finds FRs mentioned in scenarios/edge cases", () => {
  const refs = requirementsReferencedInTests(SPEC);
  assert.ok(refs.has("FR-001"));
  assert.ok(refs.has("FR-002"));
  assert.ok(!refs.has("FR-003")); // never referenced outside its definition
});

const TASKS = `# Tasks: Demo

- [ ] T001 [P] [US1] Write failing test for FR-001 lifecycle state
- [ ] T002 [US1] Implement FR-001 lifecycle state
- [ ] T003 [P] [US1] Test and implement FR-002 submission
- [ ] T004 Setup project scaffolding
`;

test("parseTasks extracts ids, FRs and test flag", () => {
  const tasks = parseTasks(TASKS);
  assert.equal(tasks.length, 4);
  assert.equal(tasks[0].id, "T001");
  assert.deepEqual(tasks[0].relatedFr, ["FR-001"]);
  assert.equal(tasks[0].isTest, true);
  assert.equal(tasks[3].isTest, false); // setup task
  assert.deepEqual(tasks[3].relatedFr, []);
});

test("taskCoverage maps FRs to tasks and flags gaps", () => {
  const cov = taskCoverage("specs/demo/spec.md", SPEC, "specs/demo/tasks.md", TASKS);
  assert.deepEqual(cov.frToTasks["FR-001"], ["T001", "T002"]);
  assert.deepEqual(cov.frToTasks["FR-002"], ["T003"]);
  assert.deepEqual(cov.requirementsWithoutTask, ["FR-003"]); // FR-003 has no task
  assert.ok(cov.tasksWithoutRequirement.includes("T004"));
  assert.equal(cov.optionalTestsWordingPresent, false);
  assert.equal(cov.ok, false);
});

test("taskCoverage detects leaked 'tests OPTIONAL' wording (LAW-04)", () => {
  const cov = taskCoverage("s", SPEC, "t", "- [ ] T001 Tests are OPTIONAL for FR-001\n- [ ] T002 impl FR-002\n- [ ] T003 impl FR-003");
  assert.equal(cov.optionalTestsWordingPresent, true);
  assert.equal(cov.ok, false);
});

test("coverageReport flags gaps deterministically", () => {
  const report = coverageReport("specs/demo/spec.md", SPEC, parseLaws(CONSTITUTION));
  assert.deepEqual(report.requirementsWithoutTestReference, ["FR-003"]);
  assert.deepEqual(report.requirementsWithoutPrinciple, ["FR-003"]);
  assert.deepEqual(report.edgeCasesWithoutFr, ["EC-002"]);
  // Laws I, II referenced? trace cells only mention III/IV/VII → I and II are not referenced.
  const numerals = report.lawsNotReferencedInSpec.map((l) => l.numeral).sort();
  assert.deepEqual(numerals, ["I", "II"]);
  assert.equal(report.ok, false);
});
