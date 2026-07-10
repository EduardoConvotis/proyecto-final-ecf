import { Router, type Response } from 'express';
import { prisma } from '../infrastructure/prisma.js';
import { recordAudit } from '../infrastructure/audit.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { reassign, ReassignNotAllowedError } from '../domain/reassign.js';
import { type OrderState } from '../domain/order-state.js';

// Reasignación por el dispatcher (US3). FR-005/006/019.
export const reassignRouter = Router();

reassignRouter.post(
  '/orders/:orderId/reassignment',
  requireAuth,
  requireRole('dispatcher'), // FR-019: solo dispatcher (403 si no)
  async (req: AuthedRequest, res: Response) => {
    const order = await prisma.workOrder.findUnique({ where: { id: String(req.params.orderId) } });
    if (!order) {
      res.status(404).json({ code: 'not_found', message: 'Orden no encontrada' });
      return;
    }
    const { toTechnicianId } = req.body as { toTechnicianId?: string };
    if (!toTechnicianId) {
      res.status(400).json({ code: 'invalid_request', message: 'toTechnicianId es obligatorio' });
      return;
    }
    try {
      const result = reassign({
        currentState: order.state as OrderState,
        fromTechnicianId: order.assignedTechnicianId,
        toTechnicianId,
      });
      const updated = await prisma.$transaction(async (tx) => {
        await tx.reassignment.create({
          data: {
            workOrderId: order.id,
            dispatcherId: req.auth?.sub ?? '',
            fromTechnicianId: result.fromTechnicianId,
            toTechnicianId: result.toTechnicianId,
          },
        });
        return tx.workOrder.update({ where: { id: order.id }, data: { assignedTechnicianId: toTechnicianId } });
      });
      await recordAudit({ actorId: req.auth?.sub ?? null, action: 'order.reassigned', resource: `order:${order.id}` });
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof ReassignNotAllowedError) {
        // FR-006: orden Aprobada no se reasigna; el técnico no cambia.
        res.status(403).json({ code: 'reassign_not_allowed', message: err.message });
        return;
      }
      throw err;
    }
  },
);
