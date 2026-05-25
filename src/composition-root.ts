/**
 * @author alnosila — https://github.com/alnosila
 */

import { EvaluateNotificationUseCase } from './application/evaluate-notification.js';
import { GetUserPreferences } from './application/get-user-preferences.js';
import { UpdateUserPreferences } from './application/update-user-preferences.js';
import { logger } from './infrastructure/logging/logger.js';
import {
  PostgresGlobalPolicyRepository,
  PostgresIdempotencyRepository,
  PostgresPreferencesRepository,
} from './infrastructure/persistence/postgres-repositories.js';

export function createApplication() {
  const preferencesRepo = new PostgresPreferencesRepository();
  const globalPolicyRepo = new PostgresGlobalPolicyRepository();
  const idempotencyRepo = new PostgresIdempotencyRepository();

  const getUserPreferences = new GetUserPreferences(preferencesRepo);
  const updateUserPreferences = new UpdateUserPreferences(
    preferencesRepo,
    idempotencyRepo,
    getUserPreferences,
  );
  const evaluateNotification = new EvaluateNotificationUseCase(preferencesRepo, globalPolicyRepo);

  return {
    getUserPreferences,
    updateUserPreferences,
    evaluateNotification,
    logger,
  };
}
