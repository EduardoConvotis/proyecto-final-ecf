# ADR-0006: Almacenamiento de evidencias fotográficas fuera de la base relacional

- **Estado**: Proposed
- **Fecha**: 2026-07-10
- **Decisores**: eduardo.cordero (propuesta de arquitectura)
- **Principios de constitución**: II
- **Spec/Feature relacionada**: specs/001-order-execution-workflow (FR-003, FR-004, FR-014)
- **Supersede a**: —

## Contexto y problema

Cada envío de ejecución adjunta entre 1 y 15 fotos JPEG de hasta 10 MB cada una (FR-004, FR-014);
FR-003 exige rechazar el envío si falta al menos una. Con hasta 15 fotos × 10 MB por envío, hay
que decidir dónde vive el binario de cada foto sin acoplar esa decisión a PostgreSQL (ADR-0005) de
forma innecesaria.

## Decisión

Las fotos de evidencia se guardan como **archivos en un almacén de objetos/archivos**, detrás de
un adaptador propio (`backend/src/infrastructure/storage`, interfaz mínima tipo
`EvidenceStorage.save(file) -> uri` / `.read(uri)`), y **solo sus metadatos** (URI, nombre,
tamaño, tipo MIME, orden/ejecución a la que pertenecen) se persisten en PostgreSQL vía Prisma. En
desarrollo/test, el adaptador usa el **sistema de archivos local**; el proveedor concreto de
producción (disco montado, almacenamiento de objetos gestionado, etc.) es intercambiable porque el
dominio solo conoce la interfaz `EvidenceStorage`, no una implementación concreta.

## Justificación (apoyada en la constitución)

- **Principio II (Simplicidad/YAGNI)**: guardar binarios de hasta 150 MB por envío (15 × 10 MB)
  como BLOB en PostgreSQL degradaría el rendimiento de la base transaccional que también sirve las
  consultas de órdenes (SC-002: 95% de consultas en <2s); separar el binario del dato relacional es
  la solución más simple que no compromete ese requisito. No se elige aquí un proveedor cloud
  específico de producción — sería complejidad/costo no exigido todavía por la spec; el adaptador
  de disco local basta para desarrollo y deja la puerta abierta sin comprometerse.

## Consecuencias

- **Positivas**: la base de datos relacional se mantiene ligera y rápida; el binario se puede
  servir/streamear independientemente; el proveedor de almacenamiento de producción se decide más
  adelante sin tocar el dominio ni el contrato.
- **Negativas / coste**: dos sistemas a mantener coherentes (metadato en Postgres + archivo en el
  almacén); requiere limpieza de huérfanos si una escritura falla a mitad de camino (a cubrir con
  test-first en la tarea correspondiente).
- **Riesgos y mitigaciones**: archivo guardado pero metadato no persistido (o viceversa) →
  mitigación: escribir el metadato solo tras confirmar la escritura del archivo, y hacerlo dentro
  de la misma unidad de trabajo transaccional del envío de ejecución.

## Alternativas consideradas

- **BLOB en PostgreSQL** — descartada: penaliza el rendimiento de la tabla transaccional de
  órdenes con archivos de hasta 10 MB cada uno (hasta 150 MB por envío), en tensión con SC-002.
- **Comprometerse ya con un proveedor cloud específico (p. ej. un objeto storage gestionado
  concreto)** — descartada por ahora: ningún requisito de la spec fija el proveedor de producción;
  decidirlo ya sería anticipar una necesidad no confirmada (Principio II). Se deja como pregunta
  abierta en `docs/architecture.md`.

## Open questions

- Proveedor de almacenamiento de archivos en producción — ver `docs/architecture.md`, §6.
