/**
 * @author alnosila — https://github.com/alnosila
 */

import { findEffectivePreference } from './merge-preferences.js';
import { isWithinQuietHours } from './quiet-hours.js';
import {
  notificationCategory,
  notificationTypeUsesChannel,
  type ChannelPreference,
  type EvaluateInput,
  type EvaluateResult,
  type GlobalPolicy,
  type QuietHours,
} from './types.js';

export interface EvaluateContext {
  preferences: ChannelPreference[];
  quietHours: QuietHours | null;
  globalPolicies: GlobalPolicy[];
}

/**
 * Решение allow/deny. Порядок проверок фиксирован — от него зависит `reason` в ответе.
 */
export function evaluateNotification(
  input: EvaluateInput,
  context: EvaluateContext,
): EvaluateResult {
  const { notificationType, channel, region, datetime } = input;

  // Несовместимая пара type+channel (например marketing_email + sms) — сразу deny.
  if (!notificationTypeUsesChannel(notificationType, channel)) {
    return { decision: 'deny', reason: 'blocked_by_default' };
  }

  // 1. Глобальная политика по региону (сильнее пользовательских настроек).
  const globalDeny = context.globalPolicies.find(
    (p) =>
      p.action === 'deny' &&
      p.notificationType === notificationType &&
      p.channel === channel &&
      p.region === region,
  );
  if (globalDeny) {
    return { decision: 'deny', reason: 'blocked_by_global_policy' };
  }

  // 2. Эффективная настройка: default_preferences + user_preference_overrides.
  const preference = findEffectivePreference(context.preferences, notificationType, channel);

  if (!preference || !preference.enabled) {
    // source нужен, чтобы отличить «выключил пользователь» от «выключено по умолчанию».
    return {
      decision: 'deny',
      reason:
        preference?.source === 'user_override'
          ? 'blocked_by_user_preference'
          : 'blocked_by_default',
    };
  }

  // 3. Quiet hours — только marketing; transactional не блокируем.
  const category = notificationCategory(notificationType);
  if (isWithinQuietHours(context.quietHours, datetime, category)) {
    return { decision: 'deny', reason: 'blocked_by_quiet_hours' };
  }

  return { decision: 'allow' };
}
