/**
 * @author alnosila — https://github.com/alnosila
 */

export const NOTIFICATION_TYPES = [
  'transactional_email',
  'marketing_email',
  'marketing_sms',
  'marketing_push',
  'transactional_push',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CHANNELS = ['email', 'sms', 'push', 'messenger'] as const;
export type Channel = (typeof CHANNELS)[number];

export const REGIONS = ['EU', 'US', 'GLOBAL'] as const;
export type Region = (typeof REGIONS)[number];

export type Decision = 'allow' | 'deny';

export type DenyReason =
  | 'blocked_by_global_policy'
  | 'blocked_by_user_preference'
  | 'blocked_by_default'
  | 'blocked_by_quiet_hours';

export type NotificationCategory = 'transactional' | 'marketing';

export interface ChannelPreference {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
  source: 'default' | 'user_override';
}

export interface QuietHours {
  start: string;
  end: string;
  timezone: string;
}

export interface GlobalPolicy {
  notificationType: NotificationType;
  channel: Channel;
  region: string;
  action: 'deny' | 'allow';
}

export interface EvaluateInput {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: string;
  datetime: string;
}

export interface EvaluateResult {
  decision: Decision;
  reason?: DenyReason;
}

export interface PreferenceChange {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

/** Префикс в notificationType задаёт категорию для quiet hours. */
export function notificationCategory(type: NotificationType): NotificationCategory {
  return type.startsWith('transactional') ? 'transactional' : 'marketing';
}

/**
 * Тип уведомления привязан к каналу через суффикс имени: *_email → email, *_sms → sms.
 * messenger в типах пока не используется.
 */
export function notificationTypeUsesChannel(type: NotificationType, channel: Channel): boolean {
  const suffix = type.split('_').pop();
  if (suffix === 'email') return channel === 'email';
  if (suffix === 'sms') return channel === 'sms';
  if (suffix === 'push') return channel === 'push';
  return false;
}
