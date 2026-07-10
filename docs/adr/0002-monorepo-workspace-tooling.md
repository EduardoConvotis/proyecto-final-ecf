# ADR-0002: Monorepo con npm workspaces (sin Nx/Turborepo)

- **Estado**: Proposed
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: II, VI
- **Spec/Feature relacionada**: specs/001-order-execution-workflow
- **Supersede a**: —

## Contexto y problema

La constitución exige un **monorepo** con `frontend/` (Angular) y `backend/` (Express) en el mismo
repositorio (Restricciones Técnicas). Hay que decidir cómo se organizan y ejecutan los dos
proyectos (instalación de dependencias, scripts, build) sin introducir herramienta de monorepo
especulativa (Principio II) para un repo que hoy tiene exactamente dos aplicaciones y un contrato.

## Decisión

Se adopta **npm workspaces** (definidos en un `package.json` raíz) con dos workspaces:
`frontend/` y `backend/`. No se introduce Nx, Turborepo, ni Lerna. Cada workspace mantiene su
propio `package.json`, `tsconfig.json` (`strict: true`) y su propio `CHANGELOG`/versión SemVer
(Principio VI). El directorio `contracts/` no es un workspace de npm (no publica código, solo el
documento OpenAPI y su configuración de codegen).

## Justificación (apoyada en la constitución)

- **Principio II (Simplicidad/YAGNI)**: npm workspaces viene con Node.js/npm, sin dependencia
  adicional ni curva de aprendizaje de un orquestador de monorepo. Con dos aplicaciones, un
  orquestador de tareas (cache de builds, grafo de dependencias entre paquetes) resuelve un
  problema que no existe todavía.
- **Principio VI (SemVer)**: cada workspace versiona de forma independiente, lo que permite
  incrementar MAJOR/MINOR/PATCH por aplicación cuando el contrato o el código cambien de forma
  incompatible.

## Consecuencias

- **Positivas**: cero dependencias nuevas para la gestión del monorepo; `npm install` único en la
  raíz; scripts simples (`npm run build -w frontend`, etc.).
- **Negativas / coste**: sin cache de build ni ejecución incremental entre proyectos; si el
  monorepo crece a muchos paquetes, puede requerir revisar esta decisión (se documentaría como
  ADR nuevo que supersede a este).
- **Riesgos y mitigaciones**: ninguno significativo con dos workspaces; revisar si aparece un
  tercer paquete publicable.

## Alternativas consideradas

- **Nx** — descartada hoy: aporta generadores, cache remota y grafo de dependencias que no se
  necesitan con dos aplicaciones (Principio II). Reconsiderar si el número de paquetes crece.
- **Turborepo** — descartada por la misma razón: valor real solo con múltiples paquetes que
  comparten builds costosos.
- **Sin workspaces (repos separados por app, o carpetas sin gestión de dependencias)** —
  descartada: contradice el requisito explícito de monorepo de la constitución.

## Open questions

Ninguna.
