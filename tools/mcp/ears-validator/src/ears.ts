/**
 * Pure EARS (Easy Approach to Requirements Syntax) classifier/validator.
 *
 * No I/O here so it stays unit-testable (Constitution Principle IV — Test-First).
 * Accepts the modal verbs `shall` and `MUST` (the FieldOps spec uses SHALL/MUST).
 */

export type EarsPattern =
  | "ubiquitous"
  | "event-driven"
  | "state-driven"
  | "unwanted-behavior"
  | "optional-feature"
  | "complex"
  | "unknown";

export interface EarsResult {
  /** Original text as received. */
  input: string;
  /** Requirement id detected and stripped (FR-### / RF-###), if any. */
  requirementId: string | null;
  /** The clause actually analyzed (id and bold markers removed). */
  clause: string;
  /** True when the clause is a valid EARS statement. */
  ok: boolean;
  pattern: EarsPattern;
  /** Modal verb found. */
  modal: "SHALL" | "MUST" | null;
  /** Human-readable reasons the clause fails (empty when ok). */
  violations: string[];
  /** A concrete EARS rewrite skeleton when not ok (null when ok). */
  suggestion: string | null;
}

const ID_PREFIX = /^\s*[-*]?\s*\**\s*((?:FR|RF)-\d+)\**\s*[:.]?\s*/i;
const MODAL_RE = /\b(shall|must)\b/i;

/** "the <actor> shall|must <response>" — the mandatory main clause of every EARS pattern. */
const MAIN = /\bthe\s+\S[^,]*?\s+(?:shall|must)\b\s+\S.*/i;

const PATTERNS: ReadonlyArray<{ pattern: EarsPattern; re: RegExp }> = [
  { pattern: "unwanted-behavior", re: /^if\s+.+?,?\s*then\s+the\s+.+?\s+(?:shall|must)\s+.+/i },
  { pattern: "event-driven", re: /^when\s+.+?,\s*the\s+.+?\s+(?:shall|must)\s+.+/i },
  { pattern: "state-driven", re: /^while\s+.+?,\s*the\s+.+?\s+(?:shall|must)\s+.+/i },
  { pattern: "optional-feature", re: /^where\s+.+?,\s*the\s+.+?\s+(?:shall|must)\s+.+/i },
  { pattern: "ubiquitous", re: /^the\s+.+?\s+(?:shall|must)\s+.+/i },
];

/** Reference skeletons, also exposed by the `ears_reference` tool. */
export const EARS_TEMPLATES: Record<Exclude<EarsPattern, "unknown">, string> = {
  ubiquitous: "The <system> shall <response>.",
  "event-driven": "When <trigger>, the <system> shall <response>.",
  "state-driven": "While <state>, the <system> shall <response>.",
  "unwanted-behavior": "If <condition>, then the <system> shall <response>.",
  "optional-feature": "Where <feature is included>, the <system> shall <response>.",
  complex: "When <trigger> while <state>, the <system> shall <response>.",
};

function stripId(raw: string): { id: string | null; clause: string } {
  const m = raw.match(ID_PREFIX);
  const id = m ? m[1].toUpperCase() : null;
  const clause = raw.replace(ID_PREFIX, "").replace(/\*\*/g, "").trim();
  return { id, clause };
}

/** Validate a single requirement string. */
export function validateEars(raw: string): EarsResult {
  const { id, clause } = stripId(raw);
  const violations: string[] = [];

  const modalMatch = clause.match(MODAL_RE);
  const modal = modalMatch ? (modalMatch[1].toUpperCase() as "SHALL" | "MUST") : null;

  if (clause.length === 0) {
    return {
      input: raw,
      requirementId: id,
      clause,
      ok: false,
      pattern: "unknown",
      modal: null,
      violations: ["Texto vacío: no hay requisito que validar."],
      suggestion: EARS_TEMPLATES.ubiquitous,
    };
  }

  if (!modal) {
    violations.push('Falta el verbo modal obligatorio ("shall" o "MUST").');
  }

  // Detect leading trigger keyword to give precise feedback.
  const startsWith = (kw: string): boolean => new RegExp(`^${kw}\\b`, "i").test(clause);
  const isEventLike = startsWith("when") || startsWith("while") || startsWith("where") || startsWith("if");

  // A "complex" statement combines triggers, e.g. "When X while Y, the system shall Z".
  const hasWhen = /\bwhen\b/i.test(clause);
  const hasWhile = /\bwhile\b/i.test(clause);
  const looksComplex = (startsWith("when") && hasWhile) || (startsWith("while") && hasWhen);

  let pattern: EarsPattern = "unknown";
  for (const candidate of PATTERNS) {
    if (candidate.re.test(clause)) {
      pattern = candidate.pattern;
      break;
    }
  }
  if (pattern === "event-driven" && looksComplex) {
    pattern = "complex";
  }

  // Targeted violations when structure is off.
  if (pattern === "unknown") {
    if (startsWith("if") && !/\bthen\b/i.test(clause)) {
      violations.push('Patrón "unwanted behavior": tras la condición "If …" falta la palabra "then".');
    }
    if (isEventLike && !/,/.test(clause)) {
      violations.push("Falta la coma que separa la cláusula inicial (When/While/Where/If) del núcleo.");
    }
    if (modal && !MAIN.test(clause)) {
      violations.push('Falta el núcleo obligatorio "the <sistema> shall/MUST <respuesta>".');
    }
    if (!isEventLike && !modal) {
      violations.push("No coincide con ningún patrón EARS (Ubiquitous/When/While/Where/If-then).");
    }
  }

  const ok = pattern !== "unknown" && modal !== null && violations.length === 0;

  const suggestion = ok
    ? null
    : buildSuggestion(clause, pattern, { hasWhen, hasWhile, startsWith });

  return { input: raw, requirementId: id, clause, ok, pattern, modal, violations, suggestion };
}

function buildSuggestion(
  clause: string,
  pattern: EarsPattern,
  ctx: { hasWhen: boolean; hasWhile: boolean; startsWith: (kw: string) => boolean },
): string {
  if (ctx.startsWith("if")) return EARS_TEMPLATES["unwanted-behavior"];
  if (ctx.startsWith("when") && ctx.hasWhile) return EARS_TEMPLATES.complex;
  if (ctx.startsWith("when")) return EARS_TEMPLATES["event-driven"];
  if (ctx.startsWith("while")) return EARS_TEMPLATES["state-driven"];
  if (ctx.startsWith("where")) return EARS_TEMPLATES["optional-feature"];
  if (pattern === "complex") return EARS_TEMPLATES.complex;
  return EARS_TEMPLATES.ubiquitous;
}

/** Validate a batch: a markdown block or array of requirement strings. */
export function validateRequirementsBlock(text: string): EarsResult[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /(?:FR|RF)-\d+/i.test(l) || /\b(shall|must)\b/i.test(l))
    .filter((l) => l.length > 0);
  return lines.map(validateEars);
}
