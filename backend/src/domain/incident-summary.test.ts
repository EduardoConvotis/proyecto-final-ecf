import { describe, it, expect } from 'vitest';
import { hasSufficientEvidence, isGrounded, validateSummary, abstain } from './incident-summary.js';

// Test-first (Principio IV) — FR-023/024/025.
describe('incident-summary domain', () => {
  it('abstención: notas vacías o muy cortas → evidencia insuficiente (FR-023, EC-012/013)', () => {
    expect(hasSufficientEvidence('')).toBe(false);
    expect(hasSufficientEvidence('hola')).toBe(false);
    expect(hasSufficientEvidence('El cliente reporta una fuga en el baño principal')).toBe(true);
    expect(abstain().status).toBe('insufficient_evidence');
  });

  it('grounding: cada punto clave debe ser un fragmento literal de las notas (FR-024)', () => {
    const notes = 'Fuga en el baño; se cambió el sifón';
    expect(isGrounded(notes, [{ text: 'Hubo una fuga', sourceNoteFragment: 'Fuga en el baño' }])).toBe(true);
    expect(isGrounded(notes, [{ text: 'Incendio', sourceNoteFragment: 'incendio en la cocina' }])).toBe(false);
  });

  it('validateSummary degrada a provider_failed si un punto no está respaldado (FR-024/025)', () => {
    const notes = 'Fuga en el baño';
    const bad = validateSummary(notes, {
      status: 'ok',
      summary: 'resumen',
      keyPoints: [{ text: 'Incendio', sourceNoteFragment: 'no existe' }],
      missing: [],
    });
    expect(bad.status).toBe('provider_failed');
  });

  it('validateSummary conserva un resumen bien fundamentado', () => {
    const notes = 'Fuga en el baño principal';
    const ok = validateSummary(notes, {
      status: 'ok',
      summary: 'Fuga detectada',
      keyPoints: [{ text: 'Fuga', sourceNoteFragment: 'Fuga en el baño' }],
      missing: [],
    });
    expect(ok.status).toBe('ok');
  });
});
