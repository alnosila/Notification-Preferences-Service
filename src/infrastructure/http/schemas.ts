/**
 * @author alnosila — https://github.com/alnosila
 */

import { z } from 'zod';
import { CHANNELS, NOTIFICATION_TYPES } from '../../domain/types.js';

const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
const channelSchema = z.enum(CHANNELS);

export const preferenceChangeSchema = z.object({
  notificationType: notificationTypeSchema,
  channel: channelSchema,
  enabled: z.boolean(),
});

export const quietHoursSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
});

export const updatePreferencesBodySchema = z.object({
  changes: z.array(preferenceChangeSchema).optional().default([]),
  quietHours: quietHoursSchema.optional(),
});

export const evaluateBodySchema = z.object({
  userId: z.string().min(1),
  notificationType: notificationTypeSchema,
  channel: channelSchema,
  region: z.string().min(1),
  datetime: z.string().datetime(),
});

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});
