import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Test-first (Principio IV) — FR-005/006/019, EC-002/008.
const findUnique = vi.fn();
const $transaction = vi.fn();

vi.mock('../infrastructure/prisma.js', () => ({ prisma: { workOrder: { findUnique }, $transaction } }));
vi.mock('../infrastructure/audit.js', () => ({ recordAudit: vi.fn() }));
vi.mock('pino-http', () => ({ pinoHttp: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('../infrastructure/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { createApp } = await import('../server.js');
const { issueToken } = await import('../middleware/auth.js');
const app = createApp();
const dispatcher = issueToken({ sub: 'd1', role: 'dispatcher' });
const tecnico = issueToken({ sub: 'u1', role: 'tecnico' });

describe('POST /orders/:orderId/reassignment', () => {
  beforeEach(() => {
    findUnique.mockReset();
    $transaction.mockReset();
    $transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        reassignment: { create: vi.fn().mockResolvedValue({}) },
        workOrder: { update: vi.fn().mockResolvedValue({ id: 'o1', assignedTechnicianId: 'u2' }) },
      }),
    );
  });

  it('200 y técnico reasignado para una orden no aprobada (FR-005)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', state: 'Enviada', assignedTechnicianId: 'u1' });
    const res = await request(app).post('/api/v1/orders/o1/reassignment').set('Authorization', `Bearer ${dispatcher}`).send({ toTechnicianId: 'u2' });
    expect(res.status).toBe(200);
    expect(res.body.assignedTechnicianId).toBe('u2');
  });

  it('403 al reasignar una orden Aprobada (FR-006, EC-002)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', state: 'Aprobada', assignedTechnicianId: 'u1' });
    const res = await request(app).post('/api/v1/orders/o1/reassignment').set('Authorization', `Bearer ${dispatcher}`).send({ toTechnicianId: 'u2' });
    expect(res.status).toBe(403);
  });

  it('403 si el actor no es dispatcher (FR-019, EC-008)', async () => {
    const res = await request(app).post('/api/v1/orders/o1/reassignment').set('Authorization', `Bearer ${tecnico}`).send({ toTechnicianId: 'u2' });
    expect(res.status).toBe(403);
  });
});
