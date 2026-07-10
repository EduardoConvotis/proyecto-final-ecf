import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as OpenApiValidator from 'express-openapi-validator';
import type { RequestHandler } from 'express';

// Validación request/response contra el contrato OpenAPI (Principio VII, ADR-0003).
// contracts/openapi.yaml es la única fuente de verdad.
const here = dirname(fileURLToPath(import.meta.url));
const apiSpec = join(here, '../../../contracts/openapi.yaml');

export function openApiValidators(): RequestHandler[] {
  return OpenApiValidator.middleware({
    apiSpec,
    validateRequests: true,
    validateResponses: true,
  });
}
