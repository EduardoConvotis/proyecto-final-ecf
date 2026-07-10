import { assertTransition, type OrderState } from './order-state.js';

// Revisión del supervisor (US2). FR-007/008/009.
export type ReviewOutcome = 'approve' | 'reject';

export interface ReviewResult {
  nextState: Extract<OrderState, 'Aprobada' | 'Rechazada'>;
  reusable: boolean; // true si la orden vuelve a ser editable por el técnico (rechazo)
}

// Decide la transición resultante validándola contra la máquina de estados.
export function decideReview(currentState: OrderState, outcome: ReviewOutcome): ReviewResult {
  if (outcome === 'approve') {
    assertTransition(currentState, 'Aprobada'); // FR-008
    return { nextState: 'Aprobada', reusable: false };
  }
  assertTransition(currentState, 'Rechazada'); // FR-009: reenviable
  return { nextState: 'Rechazada', reusable: true };
}
