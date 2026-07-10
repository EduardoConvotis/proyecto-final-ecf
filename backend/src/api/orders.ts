import { Router, type Response } from 'express';
import { prisma } from '../infrastructure/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { ownVisibilityFilter, isOwnOrder } from '../domain/orders-query.js';
import { recordAudit } from '../infrastructure/audit.js';

// Consulta de órdenes (US4). FR-010/018.
export const ordersRouter = Router();

// Lista solo las órdenes asignadas al usuario autenticado (vacío si no tiene).
ordersRouter.get('/orders', requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.auth?.sub ?? '';
  const orders = await prisma.workOrder.findMany({
    where: ownVisibilityFilter(userId),
    include: { materials: true },
  });
  await recordAudit({ actorId: userId, action: 'orders.listed', resource: 'orders' }); // FR-012
  res.status(200).json(orders);
});

// Detalle de una orden propia; 404 si no es del usuario (no revelar existencia).
ordersRouter.get('/orders/:orderId', requireAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.auth?.sub ?? '';
  const order = await prisma.workOrder.findUnique({
    where: { id: String(req.params.orderId) },
    include: { materials: true },
  });
  if (!isOwnOrder(order, userId)) {
    res.status(404).json({ code: 'not_found', message: 'Orden no encontrada' });
    return;
  }
  res.status(200).json(order);
});
