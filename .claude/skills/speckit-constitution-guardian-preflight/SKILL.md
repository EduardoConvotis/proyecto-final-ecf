---
name: "speckit-constitution-guardian-preflight"
description: "Pre-constitution guard. Runs before /speckit-constitution and, ONLY when there is no real constitution yet AND the project is empty or only has the basics (spec-kit + node_modules), interviews the user with a set of foundational questions so the constitution can be drafted from scratch."
argument-hint: "(none — invoked automatically as a before_constitution hook)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "constitution-guardian"
  source: ".specify/extensions/constitution-guardian/commands/speckit.constitution-guardian.preflight.md"
user-invocable: true
disable-model-invocation: false
---

# Constitution Guardian — Pre-flight interview

You run **before** `/speckit-constitution`. Your job is to gate the interview and,
only when the gate opens, collect the foundational answers the constitution needs
so it can be authored from scratch. When you finish, control returns to
`/speckit-constitution`, which will use your gathered answers to fill the template.

Ask every question in the **user's language** (they are writing in Spanish → ask in Spanish).

## Gate — evaluate BOTH conditions before asking anything

Do **not** ask any question until both conditions below are satisfied. If either
fails, print one short line explaining why you're skipping and hand control back
immediately (do not block the constitution flow).

### Condition A — There is no real constitution yet

1. Read `.specify/memory/constitution.md` (it may not exist).
2. Treat the constitution as **NOT yet defined** (gate OPEN on A) when any of these hold:
   - the file does not exist, or
   - it still contains unresolved template tokens of the form `[ALL_CAPS_IDENTIFIER]`
     (e.g. `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`), meaning it is still the pristine template.
3. Treat the constitution as **already defined** (gate CLOSED) when the file exists
   and has no unresolved `[...]` placeholder tokens. In that case skip with:
   `Constitution Guardian: ya existe una constitución ratificada — omito la entrevista inicial.`

### Condition B — The project is empty or has only the basics

1. List the project root and top-level entries (ignore this evaluation's own noise).
2. Classify each top-level entry as **basic** or **substantive**:
   - **Basic (allowed):** `.specify/`, `.claude/`, `.git/`, `.gitignore`, `node_modules/`,
     `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `README.md`,
     `LICENSE`, editor/CI dotfiles (`.editorconfig`, `.vscode/`, `.github/`), and empty dirs.
   - **Substantive:** anything else that indicates real work already exists —
     application source directories (`src/`, `lib/`, `app/`, `packages/`), test suites,
     build config beyond scaffolding, or a populated `specs/` with real features.
3. Gate OPEN on B when there are **no substantive entries** (empty project, or only
   the basics such as an installed spec-kit and `node_modules`).
4. Gate CLOSED when substantive entries exist. Skip with:
   `Constitution Guardian: el proyecto ya tiene código/trabajo — la entrevista inicial está pensada para proyectos desde cero, la omito.`

**Both A and B must be OPEN to proceed.** Otherwise skip silently-but-clearly as above.

## Interview — only when the gate is fully OPEN

Tell the user briefly: estás por crear la constitución del proyecto desde cero;
harás unas preguntas básicas para fundamentarla. Then ask the following. Group
related questions, accept "no sé / usa un valor por defecto", and never invent a
ratification date — if unknown, mark it as a TODO for the constitution step.

1. **Identidad** — ¿Nombre del proyecto y una frase que describa su propósito?
2. **Tipo** — ¿Qué es? (librería · CLI · API/servicio · app web · app móvil · monorepo · otro)
3. **Principios núcleo** — ¿Cuáles son los valores o reglas *innegociables*? ¿Cuántos
   principios quieres (la plantilla trae 5; puede ser menos o más)? Para cada uno pide
   nombre corto + una regla concreta y verificable.
4. **Disciplina de calidad** — ¿TDD obligatorio? ¿Cobertura mínima? ¿Tests de integración
   requeridos? ¿Revisión de código obligatoria?
5. **Restricciones técnicas** — ¿Stack, lenguajes o límites tecnológicos fijos? ¿Simplicidad/YAGNI?
6. **Observabilidad y versionado** — ¿Logging estructurado? ¿Política de versionado
   (p. ej. SemVer MAJOR.MINOR.PATCH) y de cambios incompatibles?
7. **Gobernanza** — ¿Quién ratifica y enmienda la constitución? ¿Cadencia de revisión
   de cumplimiento? ¿Fecha de ratificación (RATIFICATION_DATE)? Si no se sabe, se marca TODO.

## Hand-off

When done, emit a compact, structured block titled `## Constitution inputs (from guardian)`
capturing every answer keyed by the template placeholders where possible
(`PROJECT_NAME`, `PRINCIPLE_N_NAME`, `PRINCIPLE_N_DESCRIPTION`, `GOVERNANCE`,
`RATIFICATION_DATE`, `VERSIONING`, ...). This block is the input `/speckit-constitution`
will consume in its Outline step. Do not write the constitution file yourself — that is
the constitution command's job. Return control so the constitution update proceeds.
