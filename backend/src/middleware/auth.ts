import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Autenticación (JWT) + RBAC + ownership (ADR-0001, ADR-0010).
// Orden de comprobación: 401 no autenticado → 403 rol no autorizado → 404 recurso no propio.
export type Role = 'tecnico' | 'dispatcher' | 'supervisor';

export interface AuthClaims {
  sub: string; // userId
  role: Role;
}

const SECRET: string = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
const TTL = process.env.JWT_TTL ?? '8h'; // TTL = configuración (ADR-0010)

export function issueToken(claims: AuthClaims): string {
  const options = { expiresIn: TTL } as jwt.SignOptions;
  return jwt.sign(claims, SECRET, options);
}

// Extiende Request con los claims autenticados.
export interface AuthedRequest extends Request {
  auth?: AuthClaims;
}

function readClaims(req: Request): AuthClaims | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.slice(7), SECRET);
    if (typeof decoded === 'object' && decoded && 'sub' in decoded && 'role' in decoded) {
      return { sub: String(decoded.sub), role: (decoded as { role: Role }).role };
    }
    return null;
  } catch {
    return null;
  }
}

// FR-012, FR-028: exige sesión autenticada.
export const requireAuth: RequestHandler = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const claims = readClaims(req);
  if (!claims) {
    res.status(401).json({ code: 'unauthenticated', message: 'Se requiere iniciar sesión' });
    return;
  }
  req.auth = claims;
  next();
};

// FR-011, FR-019..FR-022: exige un rol autorizado (403 si no).
export function requireRole(...roles: Role[]): RequestHandler {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ code: 'unauthenticated', message: 'Se requiere iniciar sesión' });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ code: 'forbidden', message: 'Rol no autorizado para esta acción' });
      return;
    }
    next();
  };
}
