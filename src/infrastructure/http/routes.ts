/**
 * @author alnosila — https://github.com/alnosila
 */

import type { Express, Request, Response } from 'express';
import { InvalidPreferenceError } from '../../domain/errors.js';
import type { EvaluateNotificationUseCase } from '../../application/evaluate-notification.js';
import type { GetUserPreferences } from '../../application/get-user-preferences.js';
import type { UpdateUserPreferences } from '../../application/update-user-preferences.js';
import type { Logger } from '../logging/logger.js';
import { evaluateBodySchema, updatePreferencesBodySchema, userIdParamsSchema } from './schemas.js';

export interface RouteDependencies {
  getUserPreferences: GetUserPreferences;
  updateUserPreferences: UpdateUserPreferences;
  evaluateNotification: EvaluateNotificationUseCase;
  logger: Logger;
}

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

// Express 4 не перехватывает reject из async-роутов — пробрасываем в error middleware.
function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: (err?: unknown) => void) => {
    fn(req, res).catch(next);
  };
}

export function registerRoutes(app: Express, deps: RouteDependencies): void {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get(
    '/users/:id/preferences',
    asyncHandler(async (req, res) => {
      const params = userIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
      }

      const snapshot = await deps.getUserPreferences.execute(params.data.id);
      res.json({
        userId: snapshot.userId,
        preferences: snapshot.preferences,
        quietHours: snapshot.quietHours,
      });
    }),
  );

  app.post(
    '/users/:id/preferences',
    asyncHandler(async (req, res) => {
      const params = userIdParamsSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: 'Invalid user id' });
        return;
      }

      const body = updatePreferencesBodySchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: 'Invalid request body', details: body.error.flatten() });
        return;
      }

      // Стандартный заголовок для безопасных повторов POST (см. UpdateUserPreferences).
      const rawKey = req.headers['idempotency-key'];
      const idempotencyKey = typeof rawKey === 'string' && rawKey.length > 0 ? rawKey : undefined;

      try {
        const snapshot = await deps.updateUserPreferences.execute({
          userId: params.data.id,
          changes: body.data.changes,
          quietHours: body.data.quietHours,
          idempotencyKey,
        });

        deps.logger.info(
          {
            event: 'preference.updated',
            userId: params.data.id,
            changesCount: body.data.changes.length,
            hasQuietHours: Boolean(body.data.quietHours),
            idempotencyKey,
          },
          'User preferences updated',
        );

        res.json({
          userId: snapshot.userId,
          preferences: snapshot.preferences,
          quietHours: snapshot.quietHours,
        });
      } catch (err) {
        if (err instanceof InvalidPreferenceError) {
          res.status(400).json({ error: err.message, code: err.code });
          return;
        }
        throw err;
      }
    }),
  );

  app.post(
    '/evaluate',
    asyncHandler(async (req, res) => {
      const body = evaluateBodySchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: 'Invalid request body', details: body.error.flatten() });
        return;
      }

      const result = await deps.evaluateNotification.execute(body.data);

      deps.logger.info(
        {
          event: 'notification.evaluated',
          userId: body.data.userId,
          notificationType: body.data.notificationType,
          channel: body.data.channel,
          region: body.data.region,
          decision: result.decision,
          reason: result.reason,
        },
        'Notification delivery evaluated',
      );

      // metrics.increment('evaluate.decision', { decision: result.decision, reason: result.reason });

      res.json(result);
    }),
  );
}
