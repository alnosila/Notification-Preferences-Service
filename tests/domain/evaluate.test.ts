/**
 * @author alnosila — https://github.com/alnosila
 */

import { describe, expect, it } from 'vitest';
import { evaluateNotification } from '../../src/domain/evaluate.js';
import { mergePreferences } from '../../src/domain/merge-preferences.js';
import { isWithinQuietHours } from '../../src/domain/quiet-hours.js';
import type { ChannelPreference, GlobalPolicy, QuietHours } from '../../src/domain/types.js';

const DEFAULTS = [
  { notificationType: 'transactional_email' as const, channel: 'email' as const, enabled: true },
  { notificationType: 'marketing_email' as const, channel: 'email' as const, enabled: false },
  { notificationType: 'marketing_sms' as const, channel: 'sms' as const, enabled: false },
  { notificationType: 'marketing_push' as const, channel: 'push' as const, enabled: false },
  { notificationType: 'transactional_push' as const, channel: 'push' as const, enabled: true },
];

function toPreferences(
  defaults: typeof DEFAULTS,
  overrides: { notificationType: string; channel: string; enabled: boolean }[] = [],
): ChannelPreference[] {
  return mergePreferences(defaults, overrides as never);
}

describe('Scenario 1: New user and defaults', () => {
  it('transactional_email is enabled by default', () => {
    const preferences = toPreferences(DEFAULTS);
    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'transactional_email',
        channel: 'email',
        region: 'US',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: [] },
    );
    expect(result).toEqual({ decision: 'allow' });
  });

  it('marketing_email is disabled by default', () => {
    const preferences = toPreferences(DEFAULTS);
    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'marketing_email',
        channel: 'email',
        region: 'US',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: [] },
    );
    expect(result).toEqual({ decision: 'deny', reason: 'blocked_by_default' });
  });
});

describe('Scenario 2: User changes preferences', () => {
  it('keeps transactional email allowed when marketing email is explicitly disabled', () => {
    const preferences = toPreferences(DEFAULTS, [
      { notificationType: 'marketing_email', channel: 'email', enabled: false },
    ]);

    const marketing = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'marketing_email',
        channel: 'email',
        region: 'US',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: [] },
    );
    expect(marketing.decision).toBe('deny');

    const transactional = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'transactional_email',
        channel: 'email',
        region: 'US',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: [] },
    );
    expect(transactional).toEqual({ decision: 'allow' });
  });

  it('allows marketing email when user enables override', () => {
    const preferences = toPreferences(DEFAULTS, [
      { notificationType: 'marketing_email', channel: 'email', enabled: true },
    ]);

    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'marketing_email',
        channel: 'email',
        region: 'US',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: [] },
    );
    expect(result).toEqual({ decision: 'allow' });
  });
});

describe('Scenario 3: Quiet hours', () => {
  const quietHours: QuietHours = {
    start: '22:00',
    end: '08:00',
    timezone: 'Europe/Berlin',
  };

  it('blocks marketing push during quiet hours', () => {
    const preferences = toPreferences(DEFAULTS, [
      { notificationType: 'marketing_push', channel: 'push', enabled: true },
    ]);

    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'marketing_push',
        channel: 'push',
        region: 'US',
        datetime: '2026-05-21T21:30:00Z',
      },
      { preferences, quietHours, globalPolicies: [] },
    );
    expect(result).toEqual({ decision: 'deny', reason: 'blocked_by_quiet_hours' });
  });

  it('allows transactional push during quiet hours', () => {
    const preferences = toPreferences(DEFAULTS);

    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'transactional_push',
        channel: 'push',
        region: 'US',
        datetime: '2026-05-21T21:30:00Z',
      },
      { preferences, quietHours, globalPolicies: [] },
    );
    expect(result).toEqual({ decision: 'allow' });
  });

  it('detects overnight quiet hours window', () => {
    expect(isWithinQuietHours(quietHours, '2026-05-21T23:00:00Z', 'marketing')).toBe(true);
    expect(isWithinQuietHours(quietHours, '2026-05-21T10:00:00Z', 'marketing')).toBe(false);
  });
});

describe('Scenario 4: Global policies', () => {
  const policies: GlobalPolicy[] = [
    {
      notificationType: 'marketing_sms',
      channel: 'sms',
      region: 'EU',
      action: 'deny',
    },
  ];

  it('denies marketing_sms in EU regardless of user preference', () => {
    const preferences = toPreferences(DEFAULTS, [
      { notificationType: 'marketing_sms', channel: 'sms', enabled: true },
    ]);

    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'marketing_sms',
        channel: 'sms',
        region: 'EU',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: policies },
    );
    expect(result).toEqual({ decision: 'deny', reason: 'blocked_by_global_policy' });
  });

  it('allows same notification in US when only EU policy exists', () => {
    const preferences = toPreferences(DEFAULTS, [
      { notificationType: 'marketing_sms', channel: 'sms', enabled: true },
    ]);

    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'marketing_sms',
        channel: 'sms',
        region: 'US',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: policies },
    );
    expect(result).toEqual({ decision: 'allow' });
  });
});

describe('Scenario 5: Evaluate priority', () => {
  it('global policy wins over enabled user preference', () => {
    const preferences = toPreferences(DEFAULTS, [
      { notificationType: 'marketing_sms', channel: 'sms', enabled: true },
    ]);
    const policies: GlobalPolicy[] = [
      {
        notificationType: 'marketing_sms',
        channel: 'sms',
        region: 'EU',
        action: 'deny',
      },
    ];

    const result = evaluateNotification(
      {
        userId: 'user-1',
        notificationType: 'marketing_sms',
        channel: 'sms',
        region: 'EU',
        datetime: '2026-05-21T12:00:00Z',
      },
      { preferences, quietHours: null, globalPolicies: policies },
    );
    expect(result.reason).toBe('blocked_by_global_policy');
  });
});
