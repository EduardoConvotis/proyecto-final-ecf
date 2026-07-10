import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Adaptador de almacén de evidencias fuera de la BD relacional (ADR-0006).
// La BD guarda solo la referencia (storageRef); el binario vive en el almacén de archivos.
const ROOT = process.env.EVIDENCE_STORE_DIR ?? join(process.cwd(), '.evidence-store');

export interface StoredEvidence {
  storageRef: string;
  contentType: string;
  sizeBytes: number;
}

export interface EvidenceStore {
  put(fileName: string, contentType: string, bytes: Buffer): Promise<StoredEvidence>;
}

export const fileEvidenceStore: EvidenceStore = {
  async put(fileName, contentType, bytes) {
    await mkdir(ROOT, { recursive: true });
    const storageRef = `${Date.now()}-${fileName}`;
    await writeFile(join(ROOT, storageRef), bytes);
    return { storageRef, contentType, sizeBytes: bytes.byteLength };
  },
};
