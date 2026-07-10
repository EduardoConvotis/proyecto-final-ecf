/**
 * Pure parsers for the SDD traceability graph (Constitution Principle III).
 *
 * All functions take file *contents* (strings), never touch disk, so they stay
 * unit-testable (Principle IV). Disk access lives in repo.ts.
 */

export interface Law {
  id: string; // LAW-01 ...
  numeral: string; // I, II, ... or "—" for Governance
  title: string;
}

export interface Requirement {
  id: string; // FR-001
  text: string;
  principles: string; // raw cell from the trace table, e.g. "III, IV, VII"
}

export interface EdgeCase {
  id: string | null; // EC-001
  text: string;
  relatedFr: string[];
}

/** Slice the markdown between a start heading regex and the next heading of same-or-higher level. */
function sliceSection(md: string, startHeading: RegExp, stopHeading: RegExp): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inside = false;
  for (const line of lines) {
    if (!inside) {
      if (startHeading.test(line)) inside = true;
      continue;
    }
    if (stopHeading.test(line)) break;
    out.push(line);
  }
  return out.join("\n");
}

/** Parse constitution principles (Core Principles + Governance) into stable Law IDs. */
export function parseLaws(constitutionMd: string): Law[] {
  const core = sliceSection(constitutionMd, /^##\s+Core Principles\b/i, /^##\s+(?!#)/);
  const laws: Law[] = [];
  let n = 0;
  for (const line of core.split(/\r?\n/)) {
    const m = line.match(/^###\s+([IVXLCDM]+)\.\s+(.+?)\s*$/);
    if (m) {
      n += 1;
      laws.push({ id: `LAW-${String(n).padStart(2, "0")}`, numeral: m[1], title: m[2] });
    }
  }
  if (/^##\s+Governance\b/im.test(constitutionMd)) {
    n += 1;
    laws.push({ id: `LAW-${String(n).padStart(2, "0")}`, numeral: "—", title: "Governance" });
  }
  return laws;
}

const FR_BULLET = /^-\s+\*\*((?:FR|RF)-\d+)\*\*:\s*(.*)$/;

/** Parse functional requirements from a spec, joining wrapped continuation lines. */
export function parseRequirements(specMd: string): Requirement[] {
  const links = parsePrincipleLinks(specMd);
  const lines = specMd.split(/\r?\n/);
  const reqs: Requirement[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(FR_BULLET);
    if (!m) continue;
    let text = m[2].trim();
    let j = i + 1;
    while (
      j < lines.length &&
      lines[j].trim() !== "" &&
      !/^-\s/.test(lines[j]) &&
      !/^#{1,6}\s/.test(lines[j]) &&
      !/^\|/.test(lines[j])
    ) {
      text += ` ${lines[j].trim()}`;
      j += 1;
    }
    reqs.push({ id: m[1], text: text.trim(), principles: links[m[1]] ?? "" });
  }
  return reqs;
}

/** Parse the "Requisito → Principio" trace table into id → raw principles cell. */
export function parsePrincipleLinks(specMd: string): Record<string, string> {
  const links: Record<string, string> = {};
  for (const line of specMd.split(/\r?\n/)) {
    const m = line.match(/^\|\s*((?:FR|RF)-\d+)\s*\|\s*([^|]+?)\s*\|/);
    if (m) links[m[1]] = m[2].trim();
  }
  return links;
}

/** Parse the Edge Cases section, joining wrapped lines and extracting any referenced FR ids. */
export function parseEdgeCases(specMd: string): EdgeCase[] {
  const section = sliceSection(specMd, /^###\s+Edge Cases\b/i, /^#{1,3}\s+(?!Edge Cases)/i);
  const lines = section.split(/\r?\n/);
  const cases: EdgeCase[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^-\s+(?:\*\*(EC-\d+)\*\*:\s*)?(.+)$/);
    if (!m) continue;
    let text = m[2].trim();
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== "" && !/^-\s/.test(lines[j]) && !/^#{1,6}\s/.test(lines[j])) {
      text += ` ${lines[j].trim()}`;
      j += 1;
    }
    const relatedFr = Array.from(text.matchAll(/(?:FR|RF)-\d+/gi)).map((r) => r[0].toUpperCase());
    cases.push({ id: m[1] ?? null, text: text.trim(), relatedFr });
  }
  return cases;
}

export interface Task {
  id: string; // T001 ...
  text: string;
  relatedFr: string[];
  isTest: boolean;
}

const TASK_LINE = /^\s*-\s*\[[ xX]?\]\s*(T\d+)\b\s*(.*)$/;

/** Parse tasks.md task bullets, extracting task id, referenced FRs and whether it is a test task. */
export function parseTasks(tasksMd: string): Task[] {
  const tasks: Task[] = [];
  for (const line of tasksMd.split(/\r?\n/)) {
    const m = line.match(TASK_LINE);
    if (!m) continue;
    const text = m[2].trim();
    const relatedFr = Array.from(text.matchAll(/(?:FR|RF)-\d+/gi)).map((r) => r[0].toUpperCase());
    const isTest = /\b(test|tests|testing|tdd|spec|eval)\b/i.test(text);
    tasks.push({ id: m[1], text, relatedFr, isTest });
  }
  return tasks;
}

export interface TaskCoverage {
  spec: string;
  tasksFile: string;
  requirementCount: number;
  taskCount: number;
  testTaskCount: number;
  frToTasks: Record<string, string[]>;
  requirementsWithoutTask: string[];
  tasksWithoutRequirement: string[];
  optionalTestsWordingPresent: boolean; // LAW-04 smell: template's "tests OPTIONAL" wording leaked
  ok: boolean;
}

/** Deterministic FR ↔ task coverage between a spec and its tasks.md (Constitution Principle III/IV). */
export function taskCoverage(
  specPath: string,
  specMd: string,
  tasksPath: string,
  tasksMd: string,
): TaskCoverage {
  const reqs = parseRequirements(specMd).map((r) => r.id);
  const tasks = parseTasks(tasksMd);

  const frToTasks: Record<string, string[]> = {};
  for (const fr of reqs) frToTasks[fr] = [];
  for (const t of tasks) {
    for (const fr of t.relatedFr) {
      (frToTasks[fr] ??= []).push(t.id);
    }
  }
  const requirementsWithoutTask = reqs.filter((fr) => (frToTasks[fr] ?? []).length === 0);
  const tasksWithoutRequirement = tasks.filter((t) => t.relatedFr.length === 0).map((t) => t.id);
  const optionalTestsWordingPresent =
    /tests?\b[^\n]*\boptional\b/i.test(tasksMd) || /\boptional\b[^\n]*\btests?\b/i.test(tasksMd);
  const testTaskCount = tasks.filter((t) => t.isTest).length;

  const ok = requirementsWithoutTask.length === 0 && !optionalTestsWordingPresent;

  return {
    spec: specPath,
    tasksFile: tasksPath,
    requirementCount: reqs.length,
    taskCount: tasks.length,
    testTaskCount,
    frToTasks,
    requirementsWithoutTask,
    tasksWithoutRequirement,
    optionalTestsWordingPresent,
    ok,
  };
}

/**
 * Which FR ids are referenced inside the "User Scenarios & Testing" section
 * (acceptance scenarios + edge cases) — a proxy for "has an explicit test reference".
 */
export function requirementsReferencedInTests(specMd: string): Set<string> {
  const section = sliceSection(specMd, /^##\s+User Scenarios\b/i, /^##\s+Requirements\b/i);
  const refs = new Set<string>();
  for (const match of section.matchAll(/(?:FR|RF)-\d+/gi)) {
    refs.add(match[0].toUpperCase());
  }
  return refs;
}

export interface CoverageReport {
  spec: string;
  requirementCount: number;
  /** FRs with no explicit reference in the User Scenarios / Edge Cases section. */
  requirementsWithoutTestReference: string[];
  /** FRs whose trace-table principles cell is empty. */
  requirementsWithoutPrinciple: string[];
  edgeCases: number;
  edgeCasesWithoutFr: string[];
  /** Constitution laws (numeral) not referenced anywhere in the spec's trace table. */
  lawsNotReferencedInSpec: Array<{ id: string; numeral: string; title: string }>;
  ok: boolean;
}

/** Build the deterministic coverage report for one spec against the constitution laws. */
export function coverageReport(specPath: string, specMd: string, laws: Law[]): CoverageReport {
  const reqs = parseRequirements(specMd);
  const testRefs = requirementsReferencedInTests(specMd);
  const edges = parseEdgeCases(specMd);
  const linkCell = Object.values(parsePrincipleLinks(specMd)).join(" ");

  const requirementsWithoutTestReference = reqs.filter((r) => !testRefs.has(r.id)).map((r) => r.id);
  const requirementsWithoutPrinciple = reqs.filter((r) => r.principles.length === 0).map((r) => r.id);
  const edgeCasesWithoutFr = edges.filter((e) => e.relatedFr.length === 0).map((e) => e.id ?? e.text.slice(0, 40));

  const lawsNotReferencedInSpec = laws
    .filter((l) => l.numeral !== "—")
    .filter((l) => !new RegExp(`\\b${l.numeral}\\b`).test(linkCell))
    .map((l) => ({ id: l.id, numeral: l.numeral, title: l.title }));

  const ok =
    requirementsWithoutTestReference.length === 0 &&
    requirementsWithoutPrinciple.length === 0 &&
    edgeCasesWithoutFr.length === 0;

  return {
    spec: specPath,
    requirementCount: reqs.length,
    requirementsWithoutTestReference,
    requirementsWithoutPrinciple,
    edgeCases: edges.length,
    edgeCasesWithoutFr,
    lawsNotReferencedInSpec,
    ok,
  };
}
