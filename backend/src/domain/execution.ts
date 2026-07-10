import { assertTransition, type OrderState } from './order-state.js';

// Reglas de envío de ejecución (US1). FR-002/003/004/014/015/016.
export const MAX_PHOTOS = 15;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_CONTENT_TYPE = 'image/jpeg';

export interface PhotoMeta {
  contentType: string;
  sizeBytes: number;
}

export interface SubmitInput {
  currentState: OrderState;
  location: string | undefined;
  signature: string | undefined;
  workDurationMinutes: number | undefined;
  photos: PhotoMeta[];
}

export interface ValidatedExecution {
  location: string;
  signature: string;
  workDurationMinutes: number;
}

export class ExecutionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionValidationError';
  }
}

export function submitExecution(input: SubmitInput): ValidatedExecution {
  // Solo desde EnEjecucion se puede enviar (FR-002); no cambia estado si es inválido.
  assertTransition(input.currentState, 'Enviada');

  // FR-003: al menos una foto. FR-004: máximo 15.
  if (input.photos.length < 1) throw new ExecutionValidationError('Se requiere al menos una foto de evidencia');
  if (input.photos.length > MAX_PHOTOS) throw new ExecutionValidationError(`Máximo ${MAX_PHOTOS} fotos`);

  // FR-014: formato JPEG y tamaño ≤10 MB por foto.
  for (const p of input.photos) {
    if (p.contentType !== ALLOWED_CONTENT_TYPE) throw new ExecutionValidationError('Solo se aceptan fotos JPEG');
    if (p.sizeBytes > MAX_PHOTO_BYTES) throw new ExecutionValidationError('Cada foto debe pesar ≤10 MB');
  }

  // FR-015: ubicación y firma obligatorias.
  if (!input.location?.trim()) throw new ExecutionValidationError('La ubicación es obligatoria');
  if (!input.signature?.trim()) throw new ExecutionValidationError('La firma es obligatoria');

  // FR-016: duración del trabajo registrada.
  if (input.workDurationMinutes === undefined || input.workDurationMinutes < 0) {
    throw new ExecutionValidationError('La duración del trabajo es obligatoria');
  }

  return {
    location: input.location,
    signature: input.signature,
    workDurationMinutes: input.workDurationMinutes,
  };
}
