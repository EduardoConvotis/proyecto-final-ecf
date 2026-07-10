import { describe, it, expect } from 'vitest';
import { reassign, ReassignNotAllowedError } from './reassign.js';

// Test-first (Principio IV) — FR-005/006, EC-002.
describe('reassign', () => {
  it('reasigna una orden no aprobada y registra from/to (FR-005)', () => {
    expect(reassign({ currentState: 'Enviada', fromTechnicianId: 'a', toTechnicianId: 'b' })).toEqual({
      fromTechnicianId: 'a',
      toTechnicianId: 'b',
    });
  });

  it('rechaza reasignar una orden Aprobada (FR-006, EC-002)', () => {
    expect(() => reassign({ currentState: 'Aprobada', fromTechnicianId: 'a', toTechnicianId: 'b' })).toThrow(
      ReassignNotAllowedError,
    );
  });
});
