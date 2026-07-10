import bcrypt from 'bcrypt';

// Credenciales y política de contraseña (ADR-0010).
// Política: ≥8 caracteres, al menos una mayúscula, un número y un carácter especial.
// Se aplica al ESTABLECER contraseñas (provisión); el login solo verifica.
const PASSWORD_POLICY = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function isPasswordCompliant(password: string): boolean {
  return PASSWORD_POLICY.test(password);
}

export class WeakPasswordError extends Error {
  constructor() {
    super('La contraseña no cumple la política (≥8, mayúscula, número y carácter especial)');
    this.name = 'WeakPasswordError';
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (!isPasswordCompliant(password)) throw new WeakPasswordError();
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
