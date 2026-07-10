import { Router, type Response } from 'express';
import multer from 'multer';
import { prisma } from '../infrastructure/prisma.js';
import { fileEvidenceStore } from '../infrastructure/evidence-store.js';
import { recordAudit } from '../infrastructure/audit.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { submitExecution, ExecutionValidationError } from '../domain/execution.js';

// POST /orders/{orderId}/execution — el técnico asignado registra la ejecución (US1).
// FR-002/003/004/014/015/016, FR-011. La evidencia llega como multipart/form-data.
export const executionRouter = Router();

// Almacenamiento en memoria; las validaciones de formato/tamaño las hace el dominio (FR-014)
// para devolver 400 con mensaje claro en vez de un error opaco de multer.
const upload = multer({ storage: multer.memoryStorage() });

executionRouter.post(
  '/orders/:orderId/execution',
  requireAuth,
  requireRole('tecnico'),
  upload.array('photos', 15),
  async (req: AuthedRequest, res: Response) => {
    const orderId = String(req.params.orderId);
    const order = await prisma.workOrder.findUnique({ where: { id: orderId } });
    // Ownership: solo el técnico asignado (404 si no es suya, no revelar existencia).
    if (!order || order.assignedTechnicianId !== req.auth?.sub) {
      res.status(404).json({ code: 'not_found', message: 'Orden no encontrada' });
      return;
    }

    try {
      const body = req.body as {
        technicianNotes?: string;
        location?: string;
        signature?: string;
        workDurationMinutes?: string;
      };
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];

      const validated = submitExecution({
        currentState: order.state,
        location: body.location,
        signature: body.signature,
        workDurationMinutes: body.workDurationMinutes !== undefined ? Number(body.workDurationMinutes) : undefined,
        photos: files.map((f) => ({ contentType: f.mimetype, sizeBytes: f.size })),
      });

      const stored = await Promise.all(files.map((f) => fileEvidenceStore.put(f.originalname, f.mimetype, f.buffer)));

      const updated = await prisma.$transaction(async (tx) => {
        await tx.executionRecord.create({
          data: {
            workOrderId: order.id,
            technicianNotes: body.technicianNotes ?? null,
            location: validated.location,
            signatureRef: validated.signature,
            workDurationMinutes: validated.workDurationMinutes,
            photos: { create: stored.map((s) => ({ storageRef: s.storageRef, contentType: s.contentType, sizeBytes: s.sizeBytes })) },
          },
        });
        return tx.workOrder.update({ where: { id: order.id }, data: { state: 'Enviada' } });
      });

      await recordAudit({ actorId: req.auth?.sub ?? null, action: 'execution.submitted', resource: `order:${order.id}` });
      res.status(201).json(updated);
    } catch (err) {
      if (err instanceof ExecutionValidationError) {
        res.status(400).json({ code: 'invalid_submission', message: err.message });
        return;
      }
      throw err;
    }
  },
);
