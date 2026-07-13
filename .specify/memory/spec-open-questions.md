# Spec open questions (deferred by spec-author-normalizer)

- Author detected: Product Owner (confidence: med)

Estado tras la resolución del usuario (2026-07-13). Ver `specs/002-cicd-pipeline/pipeline-specify.md`.

- Q1: ✅ RESUELTA — Ambos componentes se empaquetan como imágenes en GHCR
  (`ghcr.io/<org>/<repo>/fieldops-<comp>:<ver>`), auth con `GITHUB_TOKEN`, `permissions: packages: write`.
- Q2: ⚠️ ABIERTA (menor) — Alcance de Trivy: se asume que aplica a la imagen de cada componente
  modificado (coherente con FR-003/FR-005g). Confirmar en planning si aplica solo a uno.
- Q3: ✅ RESUELTA — Acceptance criteria verificados con Spectral.
- Q4: ⚠️ ABIERTA (sin confirmar) — "Constitución del sistema" del gate por IA. Asunción: docs de
  `.specify/memory/` (`constitution.md` + `pipeline-constitution.md`). Confirmar en `/speckit-plan`
  junto al contrato de E/S y evals del agente (FR-005h/FR-017).
- Q5: ✅ RESUELTA (vía pipeline-constitution v1.1.0) — Fase de prueba: cualquier miembro del equipo aprueba.
- Q6: ✅ RESUELTA — Snapshots de dev versionadas por SHA de commit (FR-007).
- Q7: ✅ RESUELTA (vía pipeline-constitution v1.1.0) — SemVer por Conventional Commits, por componente.
- Q8: ✅ RESUELTA — `pre` respeta el aislamiento por componente; solo se redespliega lo cambiado (FR-010b).
- Q9: ✅ RESUELTA (vía pipeline-constitution v1.1.0, Principio VIII) — Rollback al último artefacto estable (FR-014).
