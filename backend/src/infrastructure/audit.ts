import { prisma } from './prisma.js';
import { logger } from './logger.js';

// Rastro de auditoría (FR-012, FR-013). Registra actor, acción, recurso y timestamp,
// tanto en la BD (auditable) como en el log estructurado (Principio V).
export interface AuditInput {
  actorId: string | null;
  action: string;
  resource: string;
}

export async function recordAudit(entry: AuditInput): Promise<void> {
  await prisma.auditEntry.create({ data: entry });
  logger.info({ audit: entry }, 'audit.event');
}
