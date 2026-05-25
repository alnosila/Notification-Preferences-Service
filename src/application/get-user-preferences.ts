/**
 * @author alnosila — https://github.com/alnosila
 */

import { mergePreferences } from '../domain/merge-preferences.js';
import type { PreferencesRepository } from '../ports/repositories.js';
import type { UserPreferencesSnapshot } from '../ports/repositories.js';

export class GetUserPreferences {
  constructor(private readonly preferencesRepo: PreferencesRepository) {}

  async execute(userId: string): Promise<UserPreferencesSnapshot> {
    // Lazy create: пользователь появляется в БД при первом GET/POST, не отдельным эндпоинтом.
    await this.preferencesRepo.ensureUser(userId);

    const [defaults, overrides, quietHours] = await Promise.all([
      this.preferencesRepo.getDefaults(),
      this.preferencesRepo.getUserOverrides(userId),
      this.preferencesRepo.getQuietHours(userId),
    ]);

    const preferences = mergePreferences(defaults, overrides);

    return { userId, preferences, quietHours };
  }
}
