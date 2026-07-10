import { describe, it, expect } from 'vitest';
import { ownVisibilityFilter, isOwnOrder } from './orders-query.js';

// Test-first (Principio IV) — FR-010, EC-004.
describe('orders visibility', () => {
  it('filtra por el técnico asignado', () => {
    expect(ownVisibilityFilter('u1')).toEqual({ assignedTechnicianId: 'u1' });
  });

  it('reconoce solo las órdenes propias (ownership → 404 si no)', () => {
    expect(isOwnOrder({ assignedTechnicianId: 'u1' }, 'u1')).toBe(true);
    expect(isOwnOrder({ assignedTechnicianId: 'otro' }, 'u1')).toBe(false);
    expect(isOwnOrder(null, 'u1')).toBe(false);
  });
});
