#!/usr/bin/env node
/**
 * Traceability MCP server.
 *
 * Serves the SDD traceability graph (Constitution Principle III) as queryable tools so the
 * `constitution-traceability` and `spec-reviewer` agents get deterministic answers instead of
 * re-parsing markdown each run. Read-only over .specify/ and specs/.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { parseLaws, parseRequirements, parseEdgeCases, requirementsReferencedInTests, coverageReport, parseTasks, taskCoverage } from "./parse.js";
import { readConstitution, resolveSpecs, findSpecs, activeSpec, readIfExists, siblingDoc } from "./repo.js";

const server = new McpServer({ name: "traceability", version: "0.1.0" });

const asText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const laws = (): ReturnType<typeof parseLaws> => {
  const md = readConstitution();
  return md ? parseLaws(md) : [];
};

server.registerTool(
  "list_laws",
  {
    title: "List constitution laws",
    description: "Parse .specify/memory/constitution.md and return every principle (law) with its stable LAW-ID.",
    inputSchema: {},
  },
  async () => {
    const md = readConstitution();
    if (!md) return asText({ error: "No constitution found at .specify/memory/constitution.md" });
    return asText({ laws: parseLaws(md) });
  },
);

server.registerTool(
  "list_specs",
  {
    title: "List feature specs",
    description: "List all specs/<feature>/spec.md files and which one is active (from .specify/feature.json).",
    inputSchema: {},
  },
  async () => asText({ active: activeSpec(), specs: findSpecs() }),
);

server.registerTool(
  "list_requirements",
  {
    title: "List functional requirements",
    description:
      "List every functional requirement (FR/RF) with its text and linked constitution principles. " +
      "Optional `spec` = a feature dir name, a path, or omit to use the active spec (or all specs).",
    inputSchema: { spec: z.string().optional().describe("Feature dir (e.g. '001-order-execution-workflow') or path") },
  },
  async ({ spec }) => {
    const specs = resolveSpecs(spec);
    if (specs.length === 0) return asText({ error: "No matching spec found", requested: spec ?? null });
    const out = specs.map((rel) => {
      const md = readIfExists(rel) ?? "";
      return { spec: rel, requirements: parseRequirements(md) };
    });
    return asText(out.length === 1 ? out[0] : { specs: out });
  },
);

server.registerTool(
  "get_requirement",
  {
    title: "Get one requirement with its traceability",
    description:
      "Return a single FR/RF: its text, linked constitution principles, whether it is referenced by " +
      "acceptance scenarios / edge cases (test traceability), and the edge cases that reference it.",
    inputSchema: {
      id: z.string().describe("Requirement id, e.g. 'FR-003'"),
      spec: z.string().optional().describe("Optional feature dir or path to disambiguate"),
    },
  },
  async ({ id, spec }) => {
    const wanted = id.toUpperCase();
    for (const rel of resolveSpecs(spec)) {
      const md = readIfExists(rel) ?? "";
      const req = parseRequirements(md).find((r) => r.id === wanted);
      if (req) {
        const referencedInTests = requirementsReferencedInTests(md).has(wanted);
        const relatedEdgeCases = parseEdgeCases(md).filter((e) => e.relatedFr.includes(wanted));
        return asText({
          spec: rel,
          requirement: req,
          traceability: {
            principles: req.principles || null,
            hasTestReference: referencedInTests,
            relatedEdgeCases,
          },
        });
      }
    }
    return asText({ error: `Requirement ${wanted} not found`, searched: resolveSpecs(spec) });
  },
);

server.registerTool(
  "coverage_report",
  {
    title: "Traceability coverage / gaps",
    description:
      "Deterministic gap report for a spec: FRs without a test reference, FRs without a linked principle, " +
      "edge cases without an FR, and constitution laws not referenced in the spec's trace table. " +
      "Complements (does not replace) the spec-reviewer agent's judgment.",
    inputSchema: { spec: z.string().optional().describe("Feature dir or path; omit for active/all specs") },
  },
  async ({ spec }) => {
    const specs = resolveSpecs(spec);
    if (specs.length === 0) return asText({ error: "No matching spec found", requested: spec ?? null });
    const l = laws();
    const reports = specs.map((rel) => coverageReport(rel, readIfExists(rel) ?? "", l));
    return asText(reports.length === 1 ? reports[0] : { reports });
  },
);

server.registerTool(
  "list_tasks",
  {
    title: "List tasks for a feature",
    description:
      "List tasks parsed from the feature's tasks.md (id, text, referenced FRs, whether it is a test task). " +
      "Optional `spec` = feature dir or path; omit for the active/all specs.",
    inputSchema: { spec: z.string().optional().describe("Feature dir or path") },
  },
  async ({ spec }) => {
    const specs = resolveSpecs(spec);
    if (specs.length === 0) return asText({ error: "No matching spec found", requested: spec ?? null });
    const out = specs.map((rel) => {
      const tasksRel = siblingDoc(rel, "tasks.md");
      const md = readIfExists(tasksRel);
      return md === null
        ? { spec: rel, tasksFile: tasksRel, error: "tasks.md not found (run /speckit-tasks first)" }
        : { spec: rel, tasksFile: tasksRel, tasks: parseTasks(md) };
    });
    return asText(out.length === 1 ? out[0] : { specs: out });
  },
);

server.registerTool(
  "task_coverage",
  {
    title: "FR ↔ task coverage",
    description:
      "Deterministic coverage between a spec's functional requirements and its tasks.md: FR→tasks map, " +
      "requirements with no task, tasks with no requirement, test-task count, and whether the template's " +
      "'tests OPTIONAL' wording leaked (LAW-04 smell). Optional `spec` = feature dir or path.",
    inputSchema: { spec: z.string().optional().describe("Feature dir or path; omit for active/all specs") },
  },
  async ({ spec }) => {
    const specs = resolveSpecs(spec);
    if (specs.length === 0) return asText({ error: "No matching spec found", requested: spec ?? null });
    const reports = specs.map((rel) => {
      const specMd = readIfExists(rel) ?? "";
      const tasksRel = siblingDoc(rel, "tasks.md");
      const tasksMd = readIfExists(tasksRel);
      if (tasksMd === null) return { spec: rel, tasksFile: tasksRel, error: "tasks.md not found (run /speckit-tasks first)" };
      return taskCoverage(rel, specMd, tasksRel, tasksMd);
    });
    return asText(reports.length === 1 ? reports[0] : { reports });
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`traceability MCP failed to start: ${String(err)}\n`);
  process.exit(1);
});
