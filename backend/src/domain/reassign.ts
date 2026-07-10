import { canReassign, type OrderState } from './order-state.js';

// Reasignación por el dispatcher (US3). FR-005/006.
export class ReassignNotAllowedError extends Error {
  constructor() {
    super('No se puede reasignar una orden Aprobada');
    this.name = 'ReassignNotAllowedError';
  }
}

export interface ReassignInput {
  currentState: OrderState;
  fromTechnicianId: string;
  toTechnicianId: string;
}

export interface ReassignResult {
  fromTechnicianId: string;
  toTechnicianId: string;
}

// Permitida en cualquier estado excepto Aprobada (FR-006).
export function reassign(input: ReassignInput): ReassignResult {
  if (!canReassign(input.currentState)) throw new ReassignNotAllowedError();
  return { fromTechnicianId: input.fromTechnicianId, toTechnicianId: input.toTechnicianId };
}
