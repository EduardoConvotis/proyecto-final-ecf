# ADR-0012: GHCR como registro centralizado + build-once/promote de imágenes inmutables

- **Estado**: Accepted
- **Fecha**: 2026-07-13
- **Decisores**: equipo FieldOps (usuario) + agente `architect`
- **Principios de constitución**: VI, V (`.specify/memory/pipeline-constitution.md` v1.1.0)
- **Spec/Feature relacionada**: `specs/002-cicd-pipeline/pipeline-specify.md` — FR-007, FR-009,
  FR-010, FR-010b, FR-012, FR-013
- **Supersede a**: —

## Contexto y problema

El Principio VI (pipeline-constitution) exige que las imágenes Docker residan en un registro
centralizado y que, una vez publicadas tras superar CI, los despliegues posteriores las reutilicen
"tal cual" en todos los entornos — "lo que pasó CI es lo que llega a producción" (FR-012, FR-013).
El usuario ya fijó el registro (GHCR) y el esquema de nombre de imagen; falta documentar cómo este
mecanismo satisface build-once/promote de forma verificable y qué implica para el versionado
(snapshot vs SemVer).

## Decisión

Se usa **GitHub Container Registry (GHCR)** como único registro de imágenes, con el esquema:

```
ghcr.io/<org-o-usuario>/<repo>/fieldops-<componente>:<tag>
```

- `<componente>` ∈ {`front`, `back`}.
- `<tag>` = `sha-<gitsha>` para snapshots de `develop` (FR-007) o el SemVer limpio del componente
  (p. ej. `1.4.0`) para releases de `main` (FR-009).
- Autenticación de push vía el `GITHUB_TOKEN` inyectado automáticamente por GitHub Actions (sin
  secretos adicionales que gestionar), con `permissions: packages: write` declarado explícitamente
  en los workflows `develop-*` y `main-*` (nunca en `pr-validate-*`, que no publica nada).
- **Build-once**: la imagen se construye y publica exactamente una vez por evento relevante (merge
  a `develop` o push a `main`), únicamente en los workflows `develop-*`/`main-*`. Todo job de
  *deploy* (a `dev`, `pre` o `prod`) referencia la imagen por su tag/digest existente; ningún job de
  deploy ejecuta `docker build`.
- **Promoción `pre → prod`**: es un *redeploy* de la misma referencia de imagen ya en GHCR, gatillado
  tras la aprobación manual (ver ADR-0014); no se reconstruye ni se reetiqueta.

## Justificación (apoyada en la constitución)

- **Principio VI**: "el job de deploy no reconstruye la imagen; referencia la que pasó CI" se
  cumple literalmente separando build (solo en `develop-*`/`main-*`) de deploy (jobs downstream que
  solo hacen `pull`/redeploy por tag).
- **Principio V**: el versionado SemVer limpio por componente en `main` requiere un tag inequívoco
  y trazable; usar el propio tag de imagen como el SemVer del componente hace que "qué versión está
  en cada entorno" (SC-005 de la spec) sea una simple inspección del tag de la imagen desplegada.
- Usar GHCR (integrado nativamente con GitHub Actions vía `GITHUB_TOKEN`) evita introducir un
  registro externo y sus credenciales — coherente con Principio II de `constitution.md`
  (Simplicidad/YAGNI): no se añade infraestructura de registro propia sin necesidad.

## Consecuencias

- **Positivas**: verificación trivial de FR-013 (comparar el tag/digest desplegado en `prod` contra
  el publicado tras CI); no hay credenciales de registro que rotar manualmente.
- **Negativas / coste**: GHCR ata la disponibilidad del registro a GitHub; migrar de registro en el
  futuro implicaría reescribir la referencia en todos los workflows y en el mecanismo de deploy.
- **Riesgos y mitigaciones**:
  - *Riesgo*: el job de Trivy en `pr-validate-backend.yml` construye una imagen para escanearla,
    lo que podría confundirse con una violación de build-once. *Mitigación*: esa imagen de PR nunca
    se publica en GHCR ni se usa en ningún deploy; se documenta explícitamente en
    `docs/architecture.md` §7.3 como excepción no contradictoria con este ADR.
  - *Riesgo*: visibilidad/retención de paquetes en GHCR (imágenes viejas acumulándose). *Mitigación*:
    política de retención de GHCR (fuera del alcance de esta arquitectura; a definir en tasks si es
    necesario).

## Alternativas consideradas

- **Docker Hub u otro registro externo** — descartado: requeriría gestionar credenciales/secretos
  adicionales fuera de GitHub, más complejidad operativa sin un requisito que lo exija (Principio
  II, `constitution.md`).
- **Reconstruir la imagen en cada entorno con la misma etiqueta de commit** — descartado
  explícitamente: contradice el Principio VI (build-once/promote) y el FR-012/FR-013 de la spec.
