import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test-first (Principio IV) — FR-013: el rastro de auditoría persiste actor/acción/recurso.
const create = vi.fn();
const info = vi.fn();
vi.mock('./prisma.js', () => ({ prisma: { auditEntry: { create } } }));
vi.mock('./logger.js', () => ({ logger: { info } }));

const { recordAudit } = await import('./audit.js');

describe('recordAudit', () => {
  beforeEach(() => {
    create.mockReset();
    info.mockReset();
  });

  it('persiste la entrada en la BD y la registra en el log estructurado', async () => {
    const entry = { actorId: 'u1', action: 'execution.submitted', resource: 'order:o1' };
    await recordAudit(entry);
    expect(create).toHaveBeenCalledWith({ data: entry });
    expect(info).toHaveBeenCalledWith({ audit: entry }, 'audit.event');
  });
});
