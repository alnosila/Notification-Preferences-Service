# Сервис настроек уведомлений

**Автор:** [@alnosila](https://github.com/alnosila)

Единый источник настроек доставки уведомлений: глобальные политики, предпочтения пользователя, тихие часы. Стек: TypeScript, Express, PostgreSQL, Docker.

## Требования

- Docker и Docker Compose
- Make
- Файл `vault` (пароль от владельца репозитория)

Node.js на машине не нужен — всё запускается в контейнерах.

## Развёртывание

```bash
git clone <url-репозитория>
cd "Notification Preverences Service"

# положите vault в корень проекта (не в git)
make decrypt

make setup    # PostgreSQL + миграции + начальные данные
make up       # запуск API (production)
```

Проверка:

```bash
curl http://localhost:3000/health
```

Разработка с автоперезагрузкой:

```bash
make dev
```

Остановка:

```bash
make down
```

## Секреты

| Файл | В git |
|------|-------|
| `env.enc` | да |
| `vault` | нет |
| `.env` | нет (создаётся командой `make decrypt`) |

Все переменные окружения — только из `.env`. Docker и приложение читают этот файл.

Новый участник: получить `vault` у владельца → `make decrypt`.

Владелец после правок `.env`: `make encrypt` → закоммитить `env.enc`.

## Swagger

После `make up` или `make dev`:

- **Документация и тесты API:** http://localhost:3000/api-docs  
- **Спецификация OpenAPI:** http://localhost:3000/openapi.json  

Если в `.env` другой `PORT`, подставьте его в адрес.

В Swagger откройте нужный метод → «Try it out» → отправьте запрос. Эндпоинты: `GET /health`, `GET/POST /users/{id}/preferences`, `POST /evaluate`.

## Тесты

Нужен файл `.env` (сначала `make decrypt`).

В Docker (рекомендуется):

```bash
make test
```

Поднимается PostgreSQL, тесты Vitest запускаются в контейнере.

Локально, если установлен Node.js 20+:

```bash
npm install
npm test
```

## Команды

| Команда | Действие |
|---------|----------|
| `make help` | Список команд |
| `make decrypt` | Расшифровать `env.enc` → `.env` |
| `make encrypt` | Зашифровать `.env` → `env.enc` |
| `make setup` | База данных и seed |
| `make up` | Запуск API |
| `make dev` | API с hot reload |
| `make down` | Остановить контейнеры |
| `make logs` | Логи приложения |
| `make test` | Тесты |
| `make lint-fix` | Линтер и форматирование |
