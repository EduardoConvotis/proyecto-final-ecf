// Máquina de estados de la orden de trabajo (FR-001, FR-002, FR-008, FR-009).
// Asignada → EnEjecucion → Enviada → (Aprobada | Rechazada); Rechazada → Enviada (reenvío).
export type OrderState = 'Asignada' | 'EnEjecucion' | 'Enviada' | 'Aprobada' | 'Rechazada';

const TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  Asignada: ['EnEjecucion'],
  EnEjecucion: ['Enviada'],
  Enviada: ['Aprobada', 'Rechazada'],
  Aprobada: [], // terminal
  Rechazada: ['Enviada'], // corrección y reenvío
};

export function canTransition(from: OrderState, to: OrderState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderState, to: OrderState) {
    super(`Transición inválida de ${from} a ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: OrderState, to: OrderState): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

// Reasignación permitida en cualquier estado excepto Aprobada (FR-006).
export function canReassign(state: OrderState): boolean {
  return state !== 'Aprobada';
}
