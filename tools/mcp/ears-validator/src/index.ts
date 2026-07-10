#!/usr/bin/env node
/**
 * EARS Validator MCP server.
 *
 * Exposes deterministic EARS validation so the `spec-reviewer` agent (and any SDD
 * command) can check functional requirements mechanically instead of by LLM judgment,
 * enforcing the constitution's rule "ningún RF debe estar de otra manera".
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { validateEars, validateRequirementsBlock, EARS_TEMPLATES } from "./ears.js";

const server = new McpServer({ name: "ears-validator", version: "0.1.0" });

const asText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

server.registerTool(
  "validate_ears",
  {
    title: "Validate a single EARS requirement",
    description:
      "Classify one functional requirement against the EARS patterns and report whether it " +
      "is valid, which pattern it uses, any violations, and a corrected rewrite skeleton. " +
      "Accepts an optional leading FR-###/RF-### id and markdown bold markers.",
    inputSchema: { text: z.string().describe("The requirement text, e.g. 'FR-002: When ...'") },
  },
  async ({ text }) => asText(validateEars(text)),
);

server.registerTool(
  "validate_requirements_block",
  {
    title: "Validate a block of requirements",
    description:
      "Validate every functional requirement found in a markdown block or multi-line string. " +
      "Returns one EARS result per detected requirement plus a summary of how many fail.",
    inputSchema: {
      text: z.string().describe("Markdown or multi-line text containing FR-###/RF-### requirements"),
    },
  },
  async ({ text }) => {
    const results = validateRequirementsBlock(text);
    const failing = results.filter((r) => !r.ok);
    return asText({
      total: results.length,
      valid: results.length - failing.length,
      invalid: failing.length,
      failingIds: failing.map((r) => r.requirementId ?? r.clause.slice(0, 40)),
      results,
    });
  },
);

server.registerTool(
  "ears_reference",
  {
    title: "EARS pattern reference",
    description: "Return the canonical EARS pattern templates the validator recognizes.",
    inputSchema: {},
  },
  async () => asText(EARS_TEMPLATES),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  // stderr only — stdout is the MCP transport channel.
  process.stderr.write(`ears-validator MCP failed to start: ${String(err)}\n`);
  process.exit(1);
});
