import { describe, it, expect } from 'vitest';
import { isPasswordCompliant, hashPassword, verifyPassword, WeakPasswordError } from './credentials.js';

// Test-first (Principio IV) — FR-026/FR-027, ADR-0010.
describe('credentials', () => {
  it('acepta contraseñas que cumplen la política (≥8, mayúscula, número, especial)', () => {
    expect(isPasswordCompliant('Abcdef1!')).toBe(true);
  });

  it('rechaza contraseñas débiles', () => {
    expect(isPasswordCompliant('short1!')).toBe(false); // <8
    expect(isPasswordCompliant('alllower1!')).toBe(false); // sin mayúscula
    expect(isPasswordCompliant('NoDigits!!')).toBe(false); // sin número
    expect(isPasswordCompliant('NoSpecial1')).toBe(false); // sin carácter especial
  });

  it('hashea y verifica correctamente', async () => {
    const hash = await hashPassword('Abcdef1!');
    expect(hash).not.toBe('Abcdef1!');
    expect(await verifyPassword('Abcdef1!', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('no permite hashear una contraseña que incumple la política', async () => {
    await expect(hashPassword('weak')).rejects.toBeInstanceOf(WeakPasswordError);
  });
});
