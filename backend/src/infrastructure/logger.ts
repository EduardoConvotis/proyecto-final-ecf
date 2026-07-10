import pino from 'pino';

// Logging estructurado (Principio V, ADR-0004). Redacta campos sensibles:
// nunca se registran contraseñas ni tokens en claro.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'password',
      'passwordHash',
      'token',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
