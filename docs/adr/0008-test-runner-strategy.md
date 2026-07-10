# ADR-0008: Estrategia de test runner (Vitest en backend; runner nativo de Angular en frontend)

- **Estado**: Proposed
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: I, IV
- **Spec/Feature relacionada**: specs/001-order-execution-workflow
- **Supersede a**: —

## Contexto y problema

El Principio IV (TDD, no negociable) exige que cada requisito tenga un test unitario trazable,
escrito antes que el código. Hay que elegir el runner de tests para `backend/` (Node/Express,
TypeScript estricto) y confirmar el de `frontend/` (Angular), sin introducir dos configuraciones
divergentes sin justificación.

## Decisión

- **Backend**: **Vitest** para los tests unitarios de `domain/` (reglas de negocio de FR-002…
  FR-022) y de los adaptadores de `infrastructure/` con dobles de prueba. Se elige por su soporte
  nativo de TypeScript/ESM sin transpilación adicional y arranque rápido, coherente con
  TypeScript estricto (Principio I) sin configuración extra de tipos para los tests.
- **Frontend**: se mantiene el **runner por defecto que provee Angular CLI** en su versión estable
  vigente al hacer el scaffold (a la fecha de esta decisión, Jasmine + Karma; si la versión estable
  de Angular usada en el scaffold trae otro runner por defecto, se adopta ese por la misma
  justificación de "usar lo que el framework provee de fábrica"). No se sustituye por Vitest en el
  frontend en esta propuesta: cambiar el runner por defecto de Angular es una decisión con coste
  de configuración no exigida por ningún requisito actual (Principio II).
- Ambos runners se limitan a **tests unitarios** por ahora (tests de integración no son
  obligatorios según la constitución); cada test referencia su `FR-XXX`/`US-N` de origen en su
  descripción o comentario, para trazabilidad (Principio III, reforzada aquí para IV).

## Justificación (apoyada en la constitución)

- **Principio IV**: contar con un runner rápido y con buen soporte TS en el backend reduce la
  fricción del ciclo Red-Green-Refactor, haciendo más probable que se siga en la práctica.
- **Principio I**: Vitest ejecuta TypeScript directamente sin paso de compilación manual adicional,
  preservando `strict: true` en los tests igual que en el código de producción.
- **Principio II**: no se reemplaza el runner por defecto de Angular sin una razón concreta; usar
  lo que el framework trae de fábrica es la opción más simple para el frontend.

## Consecuencias

- **Positivas**: ciclo de test rápido en backend; cero configuración adicional de test runner en
  frontend (se usa lo que Angular CLI configura al hacer el scaffold).
- **Negativas / coste**: dos runners distintos en el monorepo (Vitest en backend, el nativo de
  Angular en frontend) — aceptado porque cada uno es la opción por defecto/más simple en su propio
  ecosistema, no una elección arbitraria de dos herramientas equivalentes.
- **Riesgos y mitigaciones**: divergencia de convenciones de test entre frontend y backend
  (mitigación: ambos exigen igualmente el `FR-XXX`/`US-N` en la descripción del test, sea cual sea
  el runner).

## Alternativas consideradas

- **Jest en backend** — descartada frente a Vitest: mayor configuración para ESM/TypeScript
  moderno para lograr el mismo resultado (Principio II).
- **Unificar un único runner (Vitest) en frontend y backend, reemplazando el de Angular CLI** —
  descartada por ahora: exigiría configuración adicional en el frontend (builder experimental /
  no soportado de fábrica al momento de esta decisión) sin que ningún requisito actual lo exija;
  se reconsiderará con un ADR nuevo si Angular adopta Vitest como runner de fábrica en la versión
  usada para el scaffold.

## Open questions

Ninguna.
