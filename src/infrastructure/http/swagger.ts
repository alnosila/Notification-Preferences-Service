/**
 * @author alnosila — https://github.com/alnosila
 */

import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi.js';

/** Swagger UI и JSON-спека (не зависят от доменной логики). */
export function registerSwagger(app: Express): void {
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Notification Preferences API',
  }));
}
