/**
 * Disk access for the traceability MCP. Kept separate from parse.ts so parsing stays pure.
 * The project root is process.cwd() (Claude Code launches MCP servers from the project dir),
 * overridable with FIELDOPS_ROOT for tests / non-standard layouts.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function projectRoot(): string {
  return process.env.FIELDOPS_ROOT ?? process.cwd();
}

export function readIfExists(relPath: string): string | null {
  const abs = join(projectRoot(), relPath);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
}

export function readConstitution(): string | null {
  return readIfExists(".specify/memory/constitution.md");
}

export function readTraceability(): string | null {
  return readIfExists(".specify/memory/traceability.md");
}

/** All feature specs: specs/<dir>/spec.md, sorted by directory name. */
export function findSpecs(): string[] {
  const specsDir = join(projectRoot(), "specs");
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join("specs", d.name, "spec.md"))
    .filter((rel) => existsSync(join(projectRoot(), rel)))
    .sort();
}

/** The "active" feature spec from .specify/feature.json, if recorded. */
export function activeSpec(): string | null {
  const raw = readIfExists(".specify/feature.json");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { feature_directory?: unknown };
    if (typeof parsed.feature_directory === "string") {
      const rel = join(parsed.feature_directory, "spec.md");
      return existsSync(join(projectRoot(), rel)) ? rel : null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Sibling document in the same feature directory as a spec (e.g. spec.md → tasks.md). */
export function siblingDoc(specRelPath: string, name: string): string {
  return specRelPath.replace(/spec\.md$/, name);
}

/**
 * Resolve the spec paths a tool should operate on.
 * - explicit: a directory name ("001-...") or a path → that spec only
 * - otherwise: the active spec if known, else every spec found
 */
export function resolveSpecs(explicit?: string): string[] {
  if (explicit && explicit.length > 0) {
    const candidates = [
      explicit,
      join(explicit, "spec.md"),
      join("specs", explicit, "spec.md"),
    ];
    const found = candidates.find((c) => existsSync(join(projectRoot(), c)));
    return found ? [found] : [];
  }
  const active = activeSpec();
  if (active) return [active];
  return findSpecs();
}
