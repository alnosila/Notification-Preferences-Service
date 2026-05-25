/**
 * @author alnosila — https://github.com/alnosila
 */

import type { Channel, GlobalPolicy, NotificationType, QuietHours } from '../../domain/types.js';
import type { DefaultPreferenceRow, UserOverrideRow } from '../../domain/merge-preferences.js';
import type {
  GlobalPolicyRepository,
  IdempotencyRepository,
  PreferencesRepository,
} from '../../ports/repositories.js';
import { getPool } from './db.js';

export class PostgresPreferencesRepository implements PreferencesRepository {
  async ensureUser(userId: string): Promise<void> {
    // Без отдельного «create user» — достаточно строки в users для FK overrides.
    await getPool().query(`INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [
      userId,
    ]);
  }

  async getDefaults(): Promise<DefaultPreferenceRow[]> {
    const result = await getPool().query<{
      notification_type: NotificationType;
      channel: Channel;
      enabled: boolean;
    }>(`SELECT notification_type, channel, enabled FROM default_preferences`);

    return result.rows.map((r) => ({
      notificationType: r.notification_type,
      channel: r.channel,
      enabled: r.enabled,
    }));
  }

  async getUserOverrides(userId: string): Promise<UserOverrideRow[]> {
    const result = await getPool().query<{
      notification_type: NotificationType;
      channel: Channel;
      enabled: boolean;
    }>(
      `SELECT notification_type, channel, enabled
       FROM user_preference_overrides WHERE user_id = $1`,
      [userId],
    );

    return result.rows.map((r) => ({
      notificationType: r.notification_type,
      channel: r.channel,
      enabled: r.enabled,
    }));
  }

  async getQuietHours(userId: string): Promise<QuietHours | null> {
    const result = await getPool().query<{
      start_time: string;
      end_time: string;
      timezone: string;
    }>(`SELECT start_time, end_time, timezone FROM user_quiet_hours WHERE user_id = $1`, [userId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      start: row.start_time,
      end: row.end_time,
      timezone: row.timezone,
    };
  }

  async upsertOverride(
    userId: string,
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean,
  ): Promise<void> {
    // Храним только отличия от default_preferences, не полную копию матрицы настроек.
    await getPool().query(
      `INSERT INTO user_preference_overrides (user_id, notification_type, channel, enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, notification_type, channel)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`,
      [userId, notificationType, channel, enabled],
    );
  }

  async upsertQuietHours(userId: string, quietHours: QuietHours): Promise<void> {
    await getPool().query(
      `INSERT INTO user_quiet_hours (user_id, start_time, end_time, timezone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         timezone = EXCLUDED.timezone,
         updated_at = now()`,
      [userId, quietHours.start, quietHours.end, quietHours.timezone],
    );
  }
}

export class PostgresGlobalPolicyRepository implements GlobalPolicyRepository {
  async getAll(): Promise<GlobalPolicy[]> {
    const result = await getPool().query<{
      notification_type: NotificationType;
      channel: Channel;
      region: string;
      action: 'deny' | 'allow';
    }>(`SELECT notification_type, channel, region, action FROM global_policies`);

    return result.rows.map((r) => ({
      notificationType: r.notification_type,
      channel: r.channel,
      region: r.region,
      action: r.action,
    }));
  }
}

export class PostgresIdempotencyRepository implements IdempotencyRepository {
  async exists(key: string): Promise<boolean> {
    const result = await getPool().query(
      `SELECT 1 FROM preference_commands WHERE idempotency_key = $1`,
      [key],
    );
    return result.rows.length > 0;
  }

  async record(key: string, userId: string, commandHash: string): Promise<void> {
    // DO NOTHING: гонка двух параллельных запросов с одним ключом не должна падать с ошибкой.
    await getPool().query(
      `INSERT INTO preference_commands (idempotency_key, user_id, command_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [key, userId, commandHash],
    );
  }
}
