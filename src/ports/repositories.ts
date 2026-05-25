/**
 * @author alnosila — https://github.com/alnosila
 */

import type {
  ChannelPreference,
  GlobalPolicy,
  NotificationType,
  Channel,
  QuietHours,
  PreferenceChange,
} from '../domain/types.js';
import type { DefaultPreferenceRow, UserOverrideRow } from '../domain/merge-preferences.js';

export interface UserPreferencesSnapshot {
  userId: string;
  preferences: ChannelPreference[];
  quietHours: QuietHours | null;
}

export interface PreferencesRepository {
  ensureUser(userId: string): Promise<void>;
  getDefaults(): Promise<DefaultPreferenceRow[]>;
  getUserOverrides(userId: string): Promise<UserOverrideRow[]>;
  getQuietHours(userId: string): Promise<QuietHours | null>;
  upsertOverride(
    userId: string,
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean,
  ): Promise<void>;
  upsertQuietHours(userId: string, quietHours: QuietHours): Promise<void>;
}

export interface GlobalPolicyRepository {
  getAll(): Promise<GlobalPolicy[]>;
}

export interface IdempotencyRepository {
  exists(key: string): Promise<boolean>;
  record(key: string, userId: string, commandHash: string): Promise<void>;
}

/** Снимок тела команды для аудита; при расширении идемпотентности можно сверять с повторным запросом. */
export function hashCommand(changes: PreferenceChange[], quietHours?: QuietHours): string {
  return JSON.stringify({ changes, quietHours });
}
