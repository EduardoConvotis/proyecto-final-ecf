import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition, canReassign, InvalidTransitionError } from './order-state.js';

// Test-first (Principio IV) — FR-001, FR-002, FR-006, FR-008, FR-009.
describe('order-state', () => {
  it('permite el ciclo feliz Asignada→EnEjecucion→Enviada→Aprobada', () => {
    expect(canTransition('Asignada', 'EnEjecucion')).toBe(true);
    expect(canTransition('EnEjecucion', 'Enviada')).toBe(true);
    expect(canTransition('Enviada', 'Aprobada')).toBe(true);
  });

  it('permite rechazo y reenvío: Enviada→Rechazada→Enviada', () => {
    expect(canTransition('Enviada', 'Rechazada')).toBe(true);
    expect(canTransition('Rechazada', 'Enviada')).toBe(true);
  });

  it('rechaza transiciones inválidas y desde el estado terminal Aprobada', () => {
    expect(canTransition('Asignada', 'Enviada')).toBe(false);
    expect(canTransition('Aprobada', 'Enviada')).toBe(false);
    expect(() => assertTransition('Aprobada', 'Enviada')).toThrow(InvalidTransitionError);
  });

  it('permite reasignar salvo cuando la orden está Aprobada (FR-006)', () => {
    expect(canReassign('Asignada')).toBe(true);
    expect(canReassign('Enviada')).toBe(true);
    expect(canReassign('Aprobada')).toBe(false);
  });
});
