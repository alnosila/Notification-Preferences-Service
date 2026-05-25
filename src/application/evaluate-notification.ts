/**
 * @author alnosila — https://github.com/alnosila
 */

import { evaluateNotification as evaluate } from '../domain/evaluate.js';
import { mergePreferences } from '../domain/merge-preferences.js';
import type { EvaluateInput, EvaluateResult } from '../domain/types.js';
import type { GlobalPolicyRepository, PreferencesRepository } from '../ports/repositories.js';

export class EvaluateNotificationUseCase {
  constructor(
    private readonly preferencesRepo: PreferencesRepository,
    private readonly globalPolicyRepo: GlobalPolicyRepository,
  ) {}

  async execute(input: EvaluateInput): Promise<EvaluateResult> {
    await this.preferencesRepo.ensureUser(input.userId);

    const [defaults, overrides, quietHours, globalPolicies] = await Promise.all([
      this.preferencesRepo.getDefaults(),
      this.preferencesRepo.getUserOverrides(input.userId),
      this.preferencesRepo.getQuietHours(input.userId),
      this.globalPolicyRepo.getAll(),
    ]);

    const preferences = mergePreferences(defaults, overrides);

    // Вся бизнес-логика allow/deny — в domain/evaluate (без I/O, удобно тестировать).
    return evaluate(input, { preferences, quietHours, globalPolicies });
  }
}
