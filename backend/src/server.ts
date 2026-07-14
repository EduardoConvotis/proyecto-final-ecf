import express, { type ErrorRequestHandler } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './infrastructure/logger.js';
import { authRouter } from './api/auth.js';
import { executionRouter } from './api/execution.js';
import { reviewRouter } from './api/review.js';
import { reassignRouter } from './api/reassign.js';
import { ordersRouter } from './api/orders.js';

// Bootstrap del backend (Express). Contract-first: la validación OpenAPI se monta en
// producción vía middleware/openapi.ts; aquí se deja el wiring base.
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger })); // logging estructurado por request (Principio V)

  // Healthchecks: usados por el gate de acceptance (tools/ci/acceptance/backend.json),
  // por `wait-on` en CI y por los healthchecks de despliegue. No tocan la base de datos.
  const health = (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok' });
  };
  app.get('/health', health);
  app.get('/api/health', health);

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', executionRouter);
  app.use('/api/v1', reviewRouter);
  app.use('/api/v1', reassignRouter);
  app.use('/api/v1', ordersRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const raw = (err as { statusCode?: unknown }).statusCode;
    const status = typeof raw === 'number' && raw >= 400 && raw < 600 ? raw : 500;
    logger.error({ err }, 'unhandled.error');
    res.status(status).json({
      code: status === 400 ? 'bad_request' : 'internal_error',
      message: status === 400 ? 'Solicitud inválida' : 'Error interno',
    });
  };
  app.use(errorHandler);
  return app;
}

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== 'test') {
  createApp().listen(port, () => logger.info({ port }, 'fieldops.backend.listening'));
}
