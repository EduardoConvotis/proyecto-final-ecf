import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEars, validateRequirementsBlock } from "../src/ears.js";

test("ubiquitous requirement is valid", () => {
  const r = validateEars("FR-001: The system SHALL maintain each work order with a lifecycle state.");
  assert.equal(r.ok, true);
  assert.equal(r.pattern, "ubiquitous");
  assert.equal(r.modal, "SHALL");
  assert.equal(r.requirementId, "FR-001");
});

test("event-driven requirement is valid", () => {
  const r = validateEars(
    "FR-002: When a technician submits the execution, the system SHALL record the execution.",
  );
  assert.equal(r.ok, true);
  assert.equal(r.pattern, "event-driven");
});

test("unwanted-behavior requirement is valid", () => {
  const r = validateEars(
    "FR-003: If a technician submits without a photo, then the system SHALL reject the submission.",
  );
  assert.equal(r.ok, true);
  assert.equal(r.pattern, "unwanted-behavior");
});

test("state-driven and optional-feature are valid", () => {
  assert.equal(validateEars("While offline, the system MUST queue submissions.").pattern, "state-driven");
  assert.equal(
    validateEars("Where push notifications are enabled, the system SHALL notify the technician.").pattern,
    "optional-feature",
  );
});

test("complex requirement (When ... while ...) is classified complex", () => {
  const r = validateEars("When an order is submitted while offline, the system SHALL queue it.");
  assert.equal(r.pattern, "complex");
  assert.equal(r.ok, true);
});

test("missing modal verb fails with a violation", () => {
  const r = validateEars("FR-099: The system records the execution.");
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.toLowerCase().includes("modal")));
  assert.ok(r.suggestion);
});

test("non-EARS prose fails and gets a suggestion", () => {
  const r = validateEars("El usuario puede ver sus órdenes rápidamente.");
  assert.equal(r.ok, false);
  assert.equal(r.pattern, "unknown");
  assert.ok(r.suggestion);
});

test("If without then is flagged", () => {
  const r = validateEars("If the order is approved the system SHALL lock it.");
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.toLowerCase().includes("then")));
});

test("block validation counts failures", () => {
  const block = [
    "- **FR-001**: The system SHALL maintain each order.",
    "- **FR-002**: The system records executions.",
  ].join("\n");
  const results = validateRequirementsBlock(block);
  assert.equal(results.length, 2);
  assert.equal(results.filter((r) => !r.ok).length, 1);
});
