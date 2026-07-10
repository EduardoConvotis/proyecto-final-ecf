import {
  abstain,
  hasSufficientEvidence,
  validateSummary,
  type IncidentSummarizer,
  type IncidentSummaryResult,
  type KeyPoint,
} from '../domain/incident-summary.js';
import { logger } from './logger.js';

// Adaptador por defecto (ADR-0007). El proveedor concreto de IA está diferido; este
// adaptador determinista extrae puntos clave como fragmentos LITERALES de las notas,
// garantizando grounding (FR-024) y reproducibilidad para la eval. Reemplazable sin
// tocar el caso de uso.
export const defaultSummarizer: IncidentSummarizer = {
  async summarize(notes: string): Promise<IncidentSummaryResult> {
    const sentences = notes
      .split(/(?<=[.;\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 3);
    const keyPoints: KeyPoint[] = sentences.map((s) => ({ text: s, sourceNoteFragment: s }));
    return { status: 'ok', summary: sentences.join(' '), keyPoints, missing: [] };
  },
};

// Caso de uso (US5): aplica abstención (FR-023), valida grounding (FR-024) y hace
// fallback a notas crudas + log si el proveedor falla (FR-025). Nunca bloquea la revisión.
export async function getIncidentSummary(
  notes: string | null | undefined,
  summarizer: IncidentSummarizer = defaultSummarizer,
): Promise<IncidentSummaryResult> {
  if (!hasSufficientEvidence(notes)) return abstain(); // FR-023
  const safeNotes = notes as string;
  try {
    const result = await summarizer.summarize(safeNotes);
    return validateSummary(safeNotes, result); // FR-024
  } catch (err) {
    logger.error({ err }, 'incident-summary.provider_failed'); // FR-025: registra el fallo
    return { status: 'provider_failed', summary: null, keyPoints: [], missing: [] };
  }
}
