/**
 * @author alnosila — https://github.com/alnosila
 */

import { DateTime } from 'luxon';
import type { NotificationCategory, QuietHours } from './types.js';

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isWithinQuietHours(
  quietHours: QuietHours | null,
  datetimeUtc: string,
  category: NotificationCategory,
): boolean {
  if (!quietHours || category === 'transactional') {
    return false;
  }

  // datetime приходит в UTC (ISO); сравниваем локальное время пользователя.
  const local = DateTime.fromISO(datetimeUtc, { zone: 'utc' }).setZone(quietHours.timezone);
  if (!local.isValid) {
    return false;
  }

  const currentMinutes = local.hour * 60 + local.minute;
  const startMinutes = parseTimeToMinutes(quietHours.start);
  const endMinutes = parseTimeToMinutes(quietHours.end);

  if (startMinutes === endMinutes) {
    return false;
  }

  // Обычный интервал в пределах суток, напр. 09:00–17:00.
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Интервал через полночь, напр. 22:00–08:00: активен вечером ИЛИ ранним утром.
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
