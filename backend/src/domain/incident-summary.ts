// Componente de resumen de incidencia (US5). FR-017/023/024/025.
// Contrato: contracts/ai/incident-summary.contract.md; verificado por eval-gate (ADR-0009).
export type SummaryStatus = 'ok' | 'insufficient_evidence' | 'provider_failed';

export interface KeyPoint {
  text: string;
  sourceNoteFragment: string; // fragmento literal de las notas (grounding, FR-024)
}

export interface IncidentSummaryResult {
  status: SummaryStatus;
  summary: string | null;
  keyPoints: KeyPoint[];
  missing: string[];
}

// Interfaz del proveedor (ADR-0007). El adaptador concreto es intercambiable.
export interface IncidentSummarizer {
  summarize(notes: string): Promise<IncidentSummaryResult>;
}

export const MIN_USEFUL_NOTE_LENGTH = 20;

// FR-023: evidencia insuficiente si las notas están vacías o son demasiado cortas.
export function hasSufficientEvidence(notes: string | null | undefined): boolean {
  return !!notes && notes.trim().length >= MIN_USEFUL_NOTE_LENGTH;
}

export function abstain(): IncidentSummaryResult {
  return { status: 'insufficient_evidence', summary: null, keyPoints: [], missing: ['notas suficientes'] };
}

// FR-024: cada punto clave debe estar respaldado por un fragmento real de las notas.
export function isGrounded(notes: string, keyPoints: KeyPoint[]): boolean {
  return keyPoints.every((k) => k.sourceNoteFragment.length > 0 && notes.includes(k.sourceNoteFragment));
}

// Valida la salida del proveedor: abstención respetada y grounding correcto; si no, se
// trata como fallo (FR-025) para no mostrar salida no validada.
export function validateSummary(notes: string, result: IncidentSummaryResult): IncidentSummaryResult {
  if (result.status !== 'ok') return result;
  if (result.keyPoints.length === 0 || !isGrounded(notes, result.keyPoints)) {
    return { status: 'provider_failed', summary: null, keyPoints: [], missing: [] };
  }
  return result;
}
