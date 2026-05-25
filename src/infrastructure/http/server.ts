/**
 * @author alnosila — https://github.com/alnosila
 */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { RouteDependencies } from './routes.js';
import { registerRoutes } from './routes.js';
import { registerSwagger } from './swagger.js';

export function createServer(deps: RouteDependencies): Express {
  const app = express();
  app.use(express.json());

  registerSwagger(app);
  registerRoutes(app, deps);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    deps.logger.error({ err }, 'Unhandled error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}
