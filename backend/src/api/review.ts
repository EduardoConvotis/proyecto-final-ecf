import { Router, type Response } from 'express';
import { prisma } from '../infrastructure/prisma.js';
import { recordAudit } from '../infrastructure/audit.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { decideReview, type ReviewOutcome } from '../domain/review.js';
import { InvalidTransitionError, type OrderState } from '../domain/order-state.js';
import { getIncidentSummary } from '../infrastructure/incident-summary-provider.js';

// Revisión del supervisor (US2) + resumen de incidencia (US5).
// FR-007/008/009/017/020/021/022/023/024/025.
export const reviewRouter = Router();

async function latestExecution(orderId: string) {
  return prisma.executionRecord.findFirst({ where: { workOrderId: orderId }, orderBy: { submittedAt: 'desc' } });
}

// GET: abre la ejecución enviada para revisión, incluyendo el resumen de incidencia.
reviewRouter.get(
  '/orders/:orderId/review',
  requireAuth,
  requireRole('supervisor'), // FR-020: solo supervisor
  async (req: AuthedRequest, res: Response) => {
    const order = await prisma.workOrder.findUnique({ where: { id: String(req.params.orderId) } });
    if (!order) {
      res.status(404).json({ code: 'not_found', message: 'Orden no encontrada' });
      return;
    }
    const execution = await latestExecution(order.id);
    const notes = execution?.technicianNotes ?? null;
    const incidentSummary = await getIncidentSummary(notes); // FR-017/023/024/025
    await recordAudit({ actorId: req.auth?.sub ?? null, action: 'review.opened', resource: `order:${order.id}` });
    res.status(200).json({ order, technicianNotes: notes, incidentSummary });
  },
);

// POST: aprueba o rechaza la ejecución enviada.
reviewRouter.post(
  '/orders/:orderId/review',
  requireAuth,
  requireRole('supervisor'), // FR-021/022: solo supervisor
  async (req: AuthedRequest, res: Response) => {
    const order = await prisma.workOrder.findUnique({ where: { id: String(req.params.orderId) } });
    if (!order) {
      res.status(404).json({ code: 'not_found', message: 'Orden no encontrada' });
      return;
    }
    const { outcome } = req.body as { outcome?: ReviewOutcome };
    if (outcome !== 'approve' && outcome !== 'reject') {
      res.status(400).json({ code: 'invalid_outcome', message: 'outcome debe ser approve o reject' });
      return;
    }
    try {
      const decision = decideReview(order.state as OrderState, outcome);
      const execution = await latestExecution(order.id);
      const updated = await prisma.$transaction(async (tx) => {
        if (execution) {
          await tx.reviewDecision.create({
            data: {
              executionRecordId: execution.id,
              supervisorId: req.auth?.sub ?? '',
              outcome: outcome === 'approve' ? 'approved' : 'rejected',
            },
          });
        }
        return tx.workOrder.update({ where: { id: order.id }, data: { state: decision.nextState } });
      });
      await recordAudit({
        actorId: req.auth?.sub ?? null,
        action: outcome === 'approve' ? 'review.approved' : 'review.rejected',
        resource: `order:${order.id}`,
      });
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        res.status(409).json({ code: 'invalid_state', message: err.message });
        return;
      }
      throw err;
    }
  },
);
