/**
 * @author alnosila — https://github.com/alnosila
 */

import { InvalidPreferenceError } from '../domain/errors.js';
import {
  notificationTypeUsesChannel,
  type PreferenceChange,
  type QuietHours,
} from '../domain/types.js';
import { hashCommand } from '../ports/repositories.js';
import type { IdempotencyRepository, PreferencesRepository } from '../ports/repositories.js';
import type { GetUserPreferences } from './get-user-preferences.js';

export interface UpdateUserPreferencesInput {
  userId: string;
  changes?: PreferenceChange[];
  quietHours?: QuietHours;
  idempotencyKey?: string;
}

export class UpdateUserPreferences {
  constructor(
    private readonly preferencesRepo: PreferencesRepository,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly getUserPreferences: GetUserPreferences,
  ) {}

  async execute(input: UpdateUserPreferencesInput) {
    const { userId, changes = [], quietHours, idempotencyKey } = input;

    for (const change of changes) {
      if (!notificationTypeUsesChannel(change.notificationType, change.channel)) {
        throw new InvalidPreferenceError(
          `Channel ${change.channel} does not apply to ${change.notificationType}`,
        );
      }
    }

    // Повтор с тем же Idempotency-Key: не пишем в БД, возвращаем текущий снимок (идемпотентность).
    if (idempotencyKey) {
      const alreadyApplied = await this.idempotencyRepo.exists(idempotencyKey);
      if (alreadyApplied) {
        return this.getUserPreferences.execute(userId);
      }
    }

    await this.preferencesRepo.ensureUser(userId);

    for (const change of changes) {
      await this.preferencesRepo.upsertOverride(
        userId,
        change.notificationType,
        change.channel,
        change.enabled,
      );
    }

    if (quietHours) {
      await this.preferencesRepo.upsertQuietHours(userId, quietHours);
    }

    // Ключ сохраняем только после успешного применения — при сбое клиент может безопасно повторить.
    if (idempotencyKey) {
      await this.idempotencyRepo.record(idempotencyKey, userId, hashCommand(changes, quietHours));
    }

    return this.getUserPreferences.execute(userId);
  }
}
