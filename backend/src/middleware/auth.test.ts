import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { issueToken, requireAuth, requireRole, type AuthedRequest } from './auth.js';

// Test-first (Principio IV) — FR-011, FR-012, FR-028, FR-019..022.
function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('auth middleware', () => {
  it('requireAuth rechaza con 401 si no hay token (FR-028)', () => {
    const req = { header: () => undefined } as unknown as AuthedRequest;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuth acepta un token válido y adjunta los claims', () => {
    const token = issueToken({ sub: 'u1', role: 'tecnico' });
    const req = { header: (h: string) => (h.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined) } as unknown as AuthedRequest;
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.auth?.role).toBe('tecnico');
  });

  it('requireRole devuelve 403 si el rol no está autorizado (FR-019..022)', () => {
    const req = { auth: { sub: 'u1', role: 'tecnico' } } as AuthedRequest;
    const res = mockRes();
    const next = vi.fn();
    requireRole('supervisor')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireRole deja pasar al rol correcto', () => {
    const req = { auth: { sub: 'u1', role: 'supervisor' } } as AuthedRequest;
    const res = mockRes();
    const next = vi.fn();
    requireRole('supervisor')(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
