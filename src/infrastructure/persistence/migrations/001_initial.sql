-- @author alnosila — https://github.com/alnosila


-- Минимальная сущность пользователя (создаётся lazy при первом обращении к API).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Дефолты для всех новых пользователей; полная матрица type × channel.
CREATE TABLE IF NOT EXISTS default_preferences (
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  PRIMARY KEY (notification_type, channel)
);

-- Только изменённые пользователем пары (sparse), не дублируем defaults.
CREATE TABLE IF NOT EXISTS user_preference_overrides (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_type, channel)
);

-- Одна запись на пользователя; start/end в локальном формате HH:MM + IANA timezone.
CREATE TABLE IF NOT EXISTS user_quiet_hours (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Запреты/разрешения на уровне платформы (регион × type × channel).
CREATE TABLE IF NOT EXISTS global_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  region TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('deny', 'allow')),
  UNIQUE (notification_type, channel, region)
);

-- Журнал применённых Idempotency-Key (повтор POST не меняет состояние).
CREATE TABLE IF NOT EXISTS preference_commands (
  idempotency_key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  command_hash TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_policies_lookup
  ON global_policies (notification_type, channel, region);
