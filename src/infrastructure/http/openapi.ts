/**
 * @author alnosila — https://github.com/alnosila
 */

import { CHANNELS, NOTIFICATION_TYPES } from '../../domain/types.js';

const notificationTypeEnum = [...NOTIFICATION_TYPES];
const channelEnum = [...CHANNELS];

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Notification Preferences Service',
    description:
      'Единый источник правды для настроек уведомлений: defaults, user overrides, global policies, quiet hours, evaluate.',
    version: '1.0.0',
    contact: {
      name: 'alnosila',
      url: 'https://github.com/alnosila',
    },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  tags: [
    { name: 'health', description: 'Проверка доступности' },
    { name: 'preferences', description: 'Настройки пользователя' },
    { name: 'evaluate', description: 'Проверка возможности отправки' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Сервис доступен',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                  required: ['status'],
                },
              },
            },
          },
        },
      },
    },
    '/users/{id}/preferences': {
      get: {
        tags: ['preferences'],
        summary: 'Получить эффективные настройки пользователя',
        description:
          'Создаёт пользователя при первом обращении (lazy). Возвращает merge(defaults, overrides) и quiet hours.',
        parameters: [{ $ref: '#/components/parameters/userId' }],
        responses: {
          '200': {
            description: 'Снимок настроек',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserPreferencesResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
      post: {
        tags: ['preferences'],
        summary: 'Изменить настройки пользователя',
        parameters: [
          { $ref: '#/components/parameters/userId' },
          { $ref: '#/components/parameters/idempotencyKey' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdatePreferencesRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Обновлённый снимок настроек',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserPreferencesResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/evaluate': {
      post: {
        tags: ['evaluate'],
        summary: 'Проверить, можно ли отправить уведомление',
        description:
          'Порядок: global policy → effective preference → quiet hours (marketing only).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EvaluateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Решение allow/deny',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EvaluateResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
  },
  components: {
    parameters: {
      userId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', example: 'user-1' },
        description: 'Идентификатор пользователя',
      },
      idempotencyKey: {
        name: 'Idempotency-Key',
        in: 'header',
        required: false,
        schema: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        description: 'Повтор с тем же ключом не меняет состояние повторно',
      },
    },
    schemas: {
      NotificationType: {
        type: 'string',
        enum: notificationTypeEnum,
      },
      Channel: {
        type: 'string',
        enum: channelEnum,
      },
      PreferenceChange: {
        type: 'object',
        properties: {
          notificationType: { $ref: '#/components/schemas/NotificationType' },
          channel: { $ref: '#/components/schemas/Channel' },
          enabled: { type: 'boolean' },
        },
        required: ['notificationType', 'channel', 'enabled'],
      },
      QuietHours: {
        type: 'object',
        properties: {
          start: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '22:00' },
          end: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '08:00' },
          timezone: { type: 'string', example: 'Europe/Berlin' },
        },
        required: ['start', 'end', 'timezone'],
      },
      ChannelPreference: {
        type: 'object',
        properties: {
          notificationType: { $ref: '#/components/schemas/NotificationType' },
          channel: { $ref: '#/components/schemas/Channel' },
          enabled: { type: 'boolean' },
          source: { type: 'string', enum: ['default', 'user_override'] },
        },
        required: ['notificationType', 'channel', 'enabled', 'source'],
      },
      UpdatePreferencesRequest: {
        type: 'object',
        properties: {
          changes: {
            type: 'array',
            items: { $ref: '#/components/schemas/PreferenceChange' },
          },
          quietHours: { $ref: '#/components/schemas/QuietHours' },
        },
        example: {
          changes: [
            { notificationType: 'marketing_email', channel: 'email', enabled: false },
          ],
          quietHours: { start: '22:00', end: '08:00', timezone: 'Europe/Berlin' },
        },
      },
      UserPreferencesResponse: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          preferences: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChannelPreference' },
          },
          quietHours: {
            oneOf: [{ $ref: '#/components/schemas/QuietHours' }, { type: 'null' }],
          },
        },
        required: ['userId', 'preferences', 'quietHours'],
      },
      EvaluateRequest: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: 'user-1' },
          notificationType: { $ref: '#/components/schemas/NotificationType' },
          channel: { $ref: '#/components/schemas/Channel' },
          region: { type: 'string', example: 'EU' },
          datetime: {
            type: 'string',
            format: 'date-time',
            example: '2026-05-21T12:00:00Z',
          },
        },
        required: ['userId', 'notificationType', 'channel', 'region', 'datetime'],
      },
      EvaluateResponse: {
        type: 'object',
        properties: {
          decision: { type: 'string', enum: ['allow', 'deny'] },
          reason: {
            type: 'string',
            enum: [
              'blocked_by_global_policy',
              'blocked_by_user_preference',
              'blocked_by_default',
              'blocked_by_quiet_hours',
            ],
          },
        },
        required: ['decision'],
        example: { decision: 'deny', reason: 'blocked_by_global_policy' },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'object' },
        },
        required: ['error'],
      },
    },
    responses: {
      BadRequest: {
        description: 'Невалидный запрос',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
} as const;
