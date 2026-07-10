import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Test-first (Principio IV) — FR-002/003/011/015; EC-001; ownership 404. Envío multipart.
const findUnique = vi.fn();
const $transaction = vi.fn();

vi.mock('../infrastructure/prisma.js', () => ({ prisma: { workOrder: { findUnique }, $transaction } }));
vi.mock('../infrastructure/evidence-store.js', () => ({
  fileEvidenceStore: { put: vi.fn().mockResolvedValue({ storageRef: 'ref', contentType: 'image/jpeg', sizeBytes: 3 }) },
}));
vi.mock('../infrastructure/audit.js', () => ({ recordAudit: vi.fn() }));
vi.mock('pino-http', () => ({ pinoHttp: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('../infrastructure/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { createApp } = await import('../server.js');
const { issueToken } = await import('../middleware/auth.js');
const app = createApp();

const tecnicoToken = issueToken({ sub: 'u1', role: 'tecnico' });
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

function submit(token: string) {
  return request(app)
    .post('/api/v1/orders/o1/execution')
    .set('Authorization', `Bearer ${token}`)
    .field('location', 'Calle 1')
    .field('signature', 'firma')
    .field('workDurationMinutes', '90');
}

describe('POST /api/v1/orders/:orderId/execution', () => {
  beforeEach(() => {
    findUnique.mockReset();
    $transaction.mockReset();
    $transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        executionRecord: { create: vi.fn().mockResolvedValue({ id: 'e1' }) },
        workOrder: { update: vi.fn().mockResolvedValue({ id: 'o1', state: 'Enviada' }) },
      }),
    );
  });

  it('201 y orden Enviada para un envío válido del técnico asignado (FR-002)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', assignedTechnicianId: 'u1', state: 'EnEjecucion' });
    const res = await submit(tecnicoToken).attach('photos', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    expect(res.body.state).toBe('Enviada');
  });

  it('400 si el envío no tiene fotos (FR-003, EC-001)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', assignedTechnicianId: 'u1', state: 'EnEjecucion' });
    const res = await submit(tecnicoToken); // sin adjuntar fotos
    expect(res.status).toBe(400);
  });

  it('403 si el actor no tiene rol técnico (FR-011)', async () => {
    const dispToken = issueToken({ sub: 'u2', role: 'dispatcher' });
    const res = await submit(dispToken).attach('photos', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(403);
  });

  it('404 si la orden no está asignada al técnico (ownership)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', assignedTechnicianId: 'otro', state: 'EnEjecucion' });
    const res = await submit(tecnicoToken).attach('photos', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(404);
  });
});
