import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Test-first (Principio IV) — FR-007/008/009/017/020/021/022.
const findUnique = vi.fn();
const findFirst = vi.fn();
const $transaction = vi.fn();

vi.mock('../infrastructure/prisma.js', () => ({
  prisma: { workOrder: { findUnique }, executionRecord: { findFirst }, $transaction },
}));
vi.mock('../infrastructure/audit.js', () => ({ recordAudit: vi.fn() }));
vi.mock('pino-http', () => ({ pinoHttp: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('../infrastructure/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { createApp } = await import('../server.js');
const { issueToken } = await import('../middleware/auth.js');
const app = createApp();
const supervisor = issueToken({ sub: 's1', role: 'supervisor' });
const tecnico = issueToken({ sub: 'u1', role: 'tecnico' });

describe('review endpoints', () => {
  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockReset();
    $transaction.mockReset();
    $transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        reviewDecision: { create: vi.fn().mockResolvedValue({}) },
        workOrder: { update: vi.fn().mockResolvedValue({ id: 'o1', state: 'Aprobada' }) },
      }),
    );
  });

  it('GET review devuelve 200 con incidentSummary para el supervisor (FR-017)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', state: 'Enviada' });
    findFirst.mockResolvedValue({ id: 'e1', technicianNotes: 'El cliente reporta una fuga en el baño principal' });
    const res = await request(app).get('/api/v1/orders/o1/review').set('Authorization', `Bearer ${supervisor}`);
    expect(res.status).toBe(200);
    expect(res.body.incidentSummary.status).toBe('ok');
  });

  it('GET review con notas insuficientes → status insufficient_evidence (FR-023)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', state: 'Enviada' });
    findFirst.mockResolvedValue({ id: 'e1', technicianNotes: 'hola' });
    const res = await request(app).get('/api/v1/orders/o1/review').set('Authorization', `Bearer ${supervisor}`);
    expect(res.body.incidentSummary.status).toBe('insufficient_evidence');
  });

  it('POST approve → 200 y orden Aprobada (FR-008)', async () => {
    findUnique.mockResolvedValue({ id: 'o1', state: 'Enviada' });
    findFirst.mockResolvedValue({ id: 'e1', technicianNotes: 'x' });
    const res = await request(app).post('/api/v1/orders/o1/review').set('Authorization', `Bearer ${supervisor}`).send({ outcome: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('Aprobada');
  });

  it('403 si un no-supervisor abre o decide la revisión (FR-020/021/022)', async () => {
    const get = await request(app).get('/api/v1/orders/o1/review').set('Authorization', `Bearer ${tecnico}`);
    const post = await request(app).post('/api/v1/orders/o1/review').set('Authorization', `Bearer ${tecnico}`).send({ outcome: 'approve' });
    expect(get.status).toBe(403);
    expect(post.status).toBe(403);
  });
});
