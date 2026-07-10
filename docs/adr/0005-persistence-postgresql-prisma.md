# ADR-0005: Persistencia relacional — PostgreSQL + Prisma

- **Estado**: Proposed
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: I, II, V
- **Spec/Feature relacionada**: specs/001-order-execution-workflow (FR-001, FR-012, FR-013, FR-018)

## Contexto y problema

La spec exige mantener órdenes con estado de ciclo de vida (FR-001), materiales con cantidad y
precio por orden (FR-018), reasignaciones con quién/desde/hacia/cuándo (FR-005), y un rastro
auditable transaccional de cada cambio de estado (FR-013) junto al registro de acceso (FR-012).
Esto implica datos relacionales con integridad referencial (una ejecución pertenece a una orden;
una orden tiene 0..N materiales; cada transición de estado debe auditarse en la misma operación
que el cambio). Hay que elegir el motor de base de datos y la forma de acceso a datos desde
TypeScript estricto (Principio I), sin sobre-diseñar para escalas o necesidades que la spec no
pide (Principio II).

## Decisión

Se adopta **PostgreSQL** como motor de persistencia y **Prisma** como capa de acceso a datos
(ORM + generador de tipos) en `backend/src/infrastructure/persistence`:

- el **dominio** (`backend/src/domain`) no importa Prisma directamente; depende de interfaces de
  repositorio mínimas (p. ej. `WorkOrderRepository`) que la capa de infraestructura implementa,
  para poder testear el dominio sin base de datos real (Principio IV, sin introducir un framework
  de DI — inyección manual por constructor basta).
- cada cambio de estado (envío, reasignación, aprobación, rechazo) y su entrada de auditoría
  correspondiente se escriben en **una misma transacción de Prisma**, para que nunca exista un
  estado sin su rastro auditable (FR-013).
- el esquema de Prisma (`schema.prisma`) modela: orden de trabajo, registro de ejecución, foto de
  evidencia (metadatos; el binario vive en el almacén de archivos, ver ADR-0006), material,
  reasignación, decisión de revisión, y entrada de auditoría — reflejando 1:1 las "Key Entities" de
  la spec.

## Justificación (apoyada en la constitución)

- **Principio I (TypeScript estricto)**: Prisma genera tipos TypeScript a partir del esquema, sin
  `any` en la capa de acceso a datos, consistente con el resto del stack tipado por generación
  (contrato OpenAPI → tipos de API; esquema Prisma → tipos de persistencia).
- **Principio V (Observabilidad)**: la escritura transaccional del cambio de estado + su entrada de
  auditoría garantiza que el log estructurado (ADR-0004) tenga siempre un correlato persistido y
  consultable, no solo un log efímero.
- **Principio II (Simplicidad/YAGNI)**: un único motor relacional resuelve todos los requisitos de
  datos de la spec (relaciones orden↔ejecución↔materiales↔auditoría); no se introduce un segundo
  almacén (p. ej. NoSQL para "métricas") porque el dashboard de productividad está explícitamente
  fuera de alcance ("eso lo vemos").

## Consecuencias

- **Positivas**: integridad referencial y transacciones ACID nativas para el requisito crítico de
  "estado + auditoría en la misma operación"; tipos derivados del esquema (sin mantenerlos a
  mano); migraciones versionadas con Prisma Migrate.
- **Negativas / coste**: requiere una instancia de PostgreSQL en cada entorno (dev/test/prod);
  Prisma añade una dependencia y un paso de generación de cliente al build.
- **Riesgos y mitigaciones**: acoplar el dominio a Prisma por comodidad (mitigación: interfaces de
  repositorio explícitas en `domain/`, revisadas en cada plan/tarea que toque persistencia).

## Alternativas consideradas

- **SQLite** — descartada como elección de producción: adecuada para prototipos, pero no resuelve
  bien escritura concurrente multiusuario (varios técnicos/supervisores operando a la vez), que sí
  es un escenario real de esta spec.
- **MongoDB / NoSQL documental** — descartada: los datos son intrínsecamente relacionales (orden →
  ejecución → materiales/evidencias, con integridad referencial exigida por FR-013); modelar esto
  en un documento único o con referencias manuales añade complejidad sin beneficio (Principio II).
- **SQL crudo / query builder (p. ej. `pg` directo o Knex) sin ORM** — descartada: se perderían los
  tipos derivados automáticamente del esquema, obligando a mantener tipos de persistencia a mano,
  en tensión con el espíritu "derivar, no mantener a mano" que ya aplica al contrato (Principio
  VII) y encaja igual de bien en la capa de datos (Principio I).
- **TypeORM** — descartada frente a Prisma: generación de tipos menos estricta por defecto y mayor
  superficie de configuración para el mismo resultado; Prisma resuelve el caso de uso con menos
  código propio (Principio II).

## Open questions

- Motor/hosting de PostgreSQL en producción (self-hosted vs gestionado) — no lo fija ningún
  requisito de la spec; se deja fuera de esta decisión (ver `docs/architecture.md`, §6).
