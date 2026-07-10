import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Test-first (Principio IV) — FR-010/018, EC-004.
const findMany = vi.fn();
const findUnique = vi.fn();

vi.mock('../infrastructure/prisma.js', () => ({ prisma: { workOrder: { findMany, findUnique } } }));
vi.mock('../infrastructure/audit.js', () => ({ recordAudit: vi.fn() }));
vi.mock('pino-http', () => ({ pinoHttp: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('../infrastructure/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { createApp } = await import('../server.js');
const { issueToken } = await import('../middleware/auth.js');
const app = createApp();
const token = issueToken({ sub: 'u1', role: 'tecnico' });

describe('orders listing', () => {
  beforeEach(() => {
    findMany.mockReset();
    findUnique.mockReset();
  });

  it('GET /orders filtra por el usuario y devuelve su lista (FR-010)', async () => {
    findMany.mockResolvedValue([{ id: 'o1', assignedTechnicianId: 'u1' }]);
    const res = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { assignedTechnicianId: 'u1' } }));
  });

  it('GET /orders devuelve lista vacía sin error si no tiene órdenes (EC-004)', async () => {
    findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /orders/:id devuelve 404 para una orden ajena (ownership)', async () => {
    findUnique.mockResolvedValue({ id: 'o9', assignedTechnicianId: 'otro' });
    const res = await request(app).get('/api/v1/orders/o9').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('GET /orders/:id devuelve 200 para una orden propia', async () => {
    findUnique.mockResolvedValue({ id: 'o1', assignedTechnicianId: 'u1' });
    const res = await request(app).get('/api/v1/orders/o1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
