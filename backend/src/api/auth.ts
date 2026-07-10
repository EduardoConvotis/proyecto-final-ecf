import { Router, type Request, type Response } from 'express';
import { prisma } from '../infrastructure/prisma.js';
import { verifyPassword } from '../domain/credentials.js';
import { issueToken, requireAuth, type Role } from '../middleware/auth.js';
import { recordAudit } from '../infrastructure/audit.js';

// Router de autenticación (FR-026, FR-027, FR-029; ADR-0010).
export const authRouter = Router();

// POST /auth/login — credenciales válidas → 200 con token+rol; inválidas → 401 genérico.
authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const genericFail = () => {
    // FR-027: mensaje genérico idéntico para usuario inexistente o contraseña incorrecta.
    res.status(401).json({ code: 'invalid_credentials', message: 'Usuario o contraseña incorrectos' });
  };
  if (!username || !password) return genericFail();

  const user = await prisma.user.findUnique({ where: { username } });
  // Verificar siempre (aunque no exista) para no filtrar existencia por timing/rama.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    await recordAudit({ actorId: user?.id ?? null, action: 'login.failed', resource: 'auth' });
    return genericFail();
  }

  const token = issueToken({ sub: user.id, role: user.role as Role });
  await recordAudit({ actorId: user.id, action: 'login.success', resource: 'auth' });
  res.status(200).json({ token, role: user.role });
});

// POST /auth/logout — logout stateless (FR-029): el cliente descarta el token.
authRouter.post('/logout', requireAuth, async (req, res: Response) => {
  const actorId = (req as { auth?: { sub: string } }).auth?.sub ?? null;
  await recordAudit({ actorId, action: 'logout', resource: 'auth' });
  res.status(204).send();
});
