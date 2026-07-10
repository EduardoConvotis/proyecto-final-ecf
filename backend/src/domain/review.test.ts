import { describe, it, expect } from 'vitest';
import { decideReview } from './review.js';

// Test-first (Principio IV) — FR-007/008/009, EC-003.
describe('decideReview', () => {
  it('aprueba una ejecución Enviada → Aprobada (FR-008)', () => {
    expect(decideReview('Enviada', 'approve')).toEqual({ nextState: 'Aprobada', reusable: false });
  });

  it('rechaza una ejecución Enviada → Rechazada y queda reenviable (FR-009, EC-003)', () => {
    expect(decideReview('Enviada', 'reject')).toEqual({ nextState: 'Rechazada', reusable: true });
  });

  it('no permite decidir sobre una orden que no está Enviada', () => {
    expect(() => decideReview('Aprobada', 'approve')).toThrow();
    expect(() => decideReview('Asignada', 'reject')).toThrow();
  });
});
