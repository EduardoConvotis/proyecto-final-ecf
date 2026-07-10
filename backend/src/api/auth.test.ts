import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Test-first (Principio IV) — FR-026, FR-027, FR-029; EC-015.
const findUnique = vi.fn();
const verifyPassword = vi.fn();

vi.mock('../infrastructure/prisma.js', () => ({ prisma: { user: { findUnique } } }));
vi.mock('../domain/credentials.js', () => ({ verifyPassword }));
vi.mock('../infrastructure/audit.js', () => ({ recordAudit: vi.fn() }));
vi.mock('pino-http', () => ({ pinoHttp: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('../infrastructure/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

const { createApp } = await import('../server.js');
const { issueToken } = await import('../middleware/auth.js');
const app = createApp();

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    findUnique.mockReset();
    verifyPassword.mockReset();
  });

  it('devuelve 200 con token y rol para credenciales válidas (FR-026)', async () => {
    findUnique.mockResolvedValue({ id: 'u1', role: 'tecnico', passwordHash: 'h' });
    verifyPassword.mockResolvedValue(true);
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'tecnico1', password: 'Abcdef1!' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('tecnico');
    expect(typeof res.body.token).toBe('string');
  });

  it('devuelve 401 genérico para contraseña incorrecta (FR-027, EC-015)', async () => {
    findUnique.mockResolvedValue({ id: 'u1', role: 'tecnico', passwordHash: 'h' });
    verifyPassword.mockResolvedValue(false);
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'tecnico1', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('invalid_credentials');
  });

  it('devuelve 401 genérico IDÉNTICO para usuario inexistente (FR-027, EC-015)', async () => {
    findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'nope', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('invalid_credentials');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('devuelve 401 sin sesión (FR-028)', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({});
    expect(res.status).toBe(401);
  });

  it('devuelve 204 con sesión válida (FR-029)', async () => {
    const token = issueToken({ sub: 'u1', role: 'tecnico' });
    const res = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(204);
  });
});
