/**
 * @author alnosila — https://github.com/alnosila
 */

import type { ChannelPreference, NotificationType, Channel } from './types.js';

export interface DefaultPreferenceRow {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export interface UserOverrideRow {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

/**
 * Собирает «эффективные» настройки: полный список из defaults,
 * поверх — только те пары type+channel, которые пользователь явно менял (sparse overrides).
 */
export function mergePreferences(
  defaults: DefaultPreferenceRow[],
  overrides: UserOverrideRow[],
): ChannelPreference[] {
  const overrideMap = new Map(
    overrides.map((o) => [`${o.notificationType}:${o.channel}`, o.enabled]),
  );

  return defaults.map((d) => {
    const key = `${d.notificationType}:${d.channel}`;
    const override = overrideMap.get(key);
    if (override !== undefined) {
      return {
        notificationType: d.notificationType,
        channel: d.channel,
        enabled: override,
        source: 'user_override' as const,
      };
    }
    return {
      notificationType: d.notificationType,
      channel: d.channel,
      enabled: d.enabled,
      source: 'default' as const,
    };
  });
}

export function findEffectivePreference(
  preferences: ChannelPreference[],
  notificationType: NotificationType,
  channel: Channel,
): ChannelPreference | undefined {
  return preferences.find((p) => p.notificationType === notificationType && p.channel === channel);
}
