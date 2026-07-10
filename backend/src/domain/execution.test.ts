import { describe, it, expect } from 'vitest';
import { submitExecution, ExecutionValidationError, MAX_PHOTO_BYTES } from './execution.js';

// Test-first (Principio IV) — FR-002/003/004/014/015/016, EC-001/006/007.
const jpeg = (sizeBytes = 1000) => ({ contentType: 'image/jpeg', sizeBytes });

const base = {
  currentState: 'EnEjecucion' as const,
  location: 'Calle 1',
  signature: 'firma-ref',
  workDurationMinutes: 90,
  photos: [jpeg()],
};

describe('submitExecution', () => {
  it('acepta un envío válido y devuelve los datos validados', () => {
    const result = submitExecution(base);
    expect(result).toEqual({ location: 'Calle 1', signature: 'firma-ref', workDurationMinutes: 90 });
  });

  it('rechaza sin fotos (FR-003, EC-001)', () => {
    expect(() => submitExecution({ ...base, photos: [] })).toThrow(ExecutionValidationError);
  });

  it('rechaza más de 15 fotos (FR-004)', () => {
    expect(() => submitExecution({ ...base, photos: Array(16).fill(jpeg()) })).toThrow(ExecutionValidationError);
  });

  it('rechaza formato no JPEG o tamaño >10 MB (FR-014, EC-006)', () => {
    expect(() => submitExecution({ ...base, photos: [{ contentType: 'image/png', sizeBytes: 1000 }] })).toThrow(ExecutionValidationError);
    expect(() => submitExecution({ ...base, photos: [jpeg(MAX_PHOTO_BYTES + 1)] })).toThrow(ExecutionValidationError);
  });

  it('rechaza sin ubicación o sin firma (FR-015, EC-007)', () => {
    expect(() => submitExecution({ ...base, location: '' })).toThrow(ExecutionValidationError);
    expect(() => submitExecution({ ...base, signature: '' })).toThrow(ExecutionValidationError);
  });

  it('rechaza el envío desde un estado no permitido (FR-002)', () => {
    expect(() => submitExecution({ ...base, currentState: 'Aprobada' })).toThrow();
  });
});
