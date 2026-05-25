/**
 * @author alnosila — https://github.com/alnosila
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { GetUserPreferences } from '../../src/application/get-user-preferences.js';
import { UpdateUserPreferences } from '../../src/application/update-user-preferences.js';
import { mergePreferences } from '../../src/domain/merge-preferences.js';
import type { DefaultPreferenceRow, UserOverrideRow } from '../../src/domain/merge-preferences.js';
import type { QuietHours, NotificationType, Channel } from '../../src/domain/types.js';
import type { IdempotencyRepository, PreferencesRepository } from '../../src/ports/repositories.js';

const DEFAULTS: DefaultPreferenceRow[] = [
  { notificationType: 'transactional_email', channel: 'email', enabled: true },
  { notificationType: 'marketing_email', channel: 'email', enabled: false },
  { notificationType: 'marketing_sms', channel: 'sms', enabled: false },
  { notificationType: 'marketing_push', channel: 'push', enabled: false },
  { notificationType: 'transactional_push', channel: 'push', enabled: true },
];

class InMemoryPreferencesRepository implements PreferencesRepository {
  users = new Set<string>();
  overrides = new Map<string, boolean>();
  quietHours = new Map<string, QuietHours>();

  private key(userId: string, type: NotificationType, channel: Channel) {
    return `${userId}:${type}:${channel}`;
  }

  async ensureUser(userId: string): Promise<void> {
    this.users.add(userId);
  }

  async getDefaults(): Promise<DefaultPreferenceRow[]> {
    return DEFAULTS;
  }

  async getUserOverrides(userId: string): Promise<UserOverrideRow[]> {
    const rows: UserOverrideRow[] = [];
    for (const [k, enabled] of this.overrides) {
      if (!k.startsWith(`${userId}:`)) continue;
      const [, notificationType, channel] = k.split(':') as [string, NotificationType, Channel];
      rows.push({ notificationType, channel, enabled });
    }
    return rows;
  }

  async getQuietHours(userId: string): Promise<QuietHours | null> {
    return this.quietHours.get(userId) ?? null;
  }

  async upsertOverride(
    userId: string,
    notificationType: NotificationType,
    channel: Channel,
    enabled: boolean,
  ): Promise<void> {
    this.overrides.set(this.key(userId, notificationType, channel), enabled);
  }

  async upsertQuietHours(userId: string, quietHours: QuietHours): Promise<void> {
    this.quietHours.set(userId, quietHours);
  }
}

class InMemoryIdempotencyRepository implements IdempotencyRepository {
  keys = new Set<string>();

  async exists(key: string): Promise<boolean> {
    return this.keys.has(key);
  }

  async record(key: string, _userId: string, _commandHash: string): Promise<void> {
    this.keys.add(key);
  }
}

describe('Scenario 5: Idempotency', () => {
  let prefsRepo: InMemoryPreferencesRepository;
  let idempotencyRepo: InMemoryIdempotencyRepository;
  let update: UpdateUserPreferences;

  beforeEach(() => {
    prefsRepo = new InMemoryPreferencesRepository();
    idempotencyRepo = new InMemoryIdempotencyRepository();
    const get = new GetUserPreferences(prefsRepo);
    update = new UpdateUserPreferences(prefsRepo, idempotencyRepo, get);
  });

  it('applying the same disable twice with idempotency key does not break state', async () => {
    const change = {
      notificationType: 'marketing_email' as const,
      channel: 'email' as const,
      enabled: false,
    };

    const first = await update.execute({
      userId: 'user-1',
      changes: [change],
      idempotencyKey: 'key-1',
    });

    const marketingPref = first.preferences.find(
      (p) => p.notificationType === 'marketing_email' && p.channel === 'email',
    );
    expect(marketingPref?.enabled).toBe(false);

    const second = await update.execute({
      userId: 'user-1',
      changes: [change],
      idempotencyKey: 'key-1',
    });

    expect(second).toEqual(first);
    expect(idempotencyRepo.keys.size).toBe(1);

    const overrideCount = [...prefsRepo.overrides.keys()].filter((k) =>
      k.startsWith('user-1:'),
    ).length;
    expect(overrideCount).toBe(1);
  });

  it('merge is stable for repeated identical overrides', () => {
    const mergedOnce = mergePreferences(DEFAULTS, [
      { notificationType: 'marketing_email', channel: 'email', enabled: false },
    ]);
    const mergedTwice = mergePreferences(DEFAULTS, [
      { notificationType: 'marketing_email', channel: 'email', enabled: false },
      { notificationType: 'marketing_email', channel: 'email', enabled: false },
    ]);
    expect(mergedTwice.filter((p) => p.notificationType === 'marketing_email')).toEqual(
      mergedOnce.filter((p) => p.notificationType === 'marketing_email'),
    );
  });
});
