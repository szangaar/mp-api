# MP Stocks — учёт остатков на маркетплейсах

Полностековое SaaS-приложение для учёта остатков и заказов на **Wildberries**,
**Ozon**, **Kaspi.kz** и **Flip.kz** в одном кабинете. Команда до 10 человек,
автоматическая синхронизация каждые 30 минут, безопасное хранение API-ключей,
готово к деплою на Vercel + Neon.

## Стек

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS, lucide-react
- PostgreSQL + Prisma 5
- NextAuth.js (Email + пароль, JWT-сессии)
- Vercel Cron каждые 30 минут (`*/30 * * * *`)
- AES-256-GCM шифрование API-ключей

## Структура

```
src/
├── app/
│   ├── (auth)/login, (auth)/register     — экран входа и регистрации
│   ├── (dashboard)/dashboard             — KPI и сводка
│   ├── (dashboard)/stocks                — таблица сравнения остатков
│   ├── (dashboard)/orders                — лента заказов
│   ├── (dashboard)/credentials           — управление API-ключами
│   ├── (dashboard)/sync                  — журнал синхронизаций
│   ├── (dashboard)/team                  — участники команды
│   └── api/
│       ├── auth/[...nextauth], auth/register
│       ├── credentials/, credentials/[id]/(sync|ping|flip-import)
│       ├── sync/run                      — ручной запуск
│       ├── cron/sync                     — Vercel Cron каждые 30 мин
│       └── team/members
├── lib/
│   ├── prisma.ts, auth.ts, crypto.ts, sync.ts, utils.ts
│   └── connectors/{wb,ozon,kaspi,flip,types,index}.ts
└── components/{sidebar,page-header,platform-badge,providers}.tsx
prisma/schema.prisma                      — модели User/Team/Membership/
                                            MarketplaceCredential/StockSnapshot/
                                            OrderSnapshot/SyncLog
vercel.json                               — расписание cron */30
```

## Локальный запуск

```bash
# 1. Установка
npm install

# 2. Скопировать env и заполнить
cp .env.example .env.local
#   DATABASE_URL    = строка подключения PostgreSQL
#   NEXTAUTH_SECRET = openssl rand -base64 32
#   ENCRYPTION_KEY  = openssl rand -hex 32   (ровно 64 hex)
#   CRON_SECRET     = openssl rand -hex 24

# 3. Создать схему БД
npx prisma db push

# 4. Запустить
npm run dev
# → http://localhost:3000
```

## Деплой на Vercel + Neon

### 1. Создать БД на Neon

1. Зайти на https://console.neon.tech, нажать **New Project**.
2. Регион — `eu-central-1` (Frankfurt) или ближайший.
3. Скопировать **connection string** вида
   `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.

### 2. Залить код в GitHub

```bash
git init && git add . && git commit -m "init"
git remote add origin <ваш-репозиторий>
git push -u origin main
```

### 3. Импорт в Vercel

1. https://vercel.com/new → выбрать репозиторий.
2. Framework Preset: **Next.js** (определится автоматически).
3. Указать переменные окружения (Settings → Environment Variables):
   | Переменная | Значение |
   |---|---|
   | `DATABASE_URL` | строка из Neon |
   | `NEXTAUTH_SECRET` | результат `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://<ваш-проект>.vercel.app` |
   | `ENCRYPTION_KEY` | результат `openssl rand -hex 32` (64 hex) |
   | `CRON_SECRET` | результат `openssl rand -hex 24` |
4. **Deploy**.

### 4. Применить схему к БД

После первого деплоя выполните локально (с production `DATABASE_URL`):

```bash
DATABASE_URL='<строка из Neon>' npx prisma db push
```

Либо сделайте это один раз через Vercel CLI:

```bash
vercel env pull .env.production.local
npx prisma db push
```

### 5. Cron уже настроен

Файл `vercel.json` подключает расписание `*/30 * * * *` для эндпоинта
`/api/cron/sync`. Vercel автоматически шлёт служебный заголовок
`x-vercel-cron`, поэтому никаких дополнительных действий не нужно.
Внешний вызов cron-эндпоинта возможен с Bearer-токеном:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://<ваш-проект>.vercel.app/api/cron/sync
```

## Где взять API-ключи

### Wildberries

1. Кабинет продавца → **Настройки → Доступ к API**.
2. Создать токен с категориями **Statistics** и **Marketplace**.
3. Вставить токен в поле «API-ключ» (Client-Id для WB не нужен).

> С 23 июня 2026 старый метод `GET /api/v1/supplier/stocks` будет отключён.
> Коннектор написан с возможностью миграции на `POST
> /api/analytics/v1/stocks-report/wb-warehouses` — нужно будет лишь обновить
> `src/lib/connectors/wb.ts` (см. комментарий в файле).

### Ozon

1. https://seller.ozon.ru → **Настройки → API ключи**.
2. Скопировать **Client-Id** и сгенерированный **Api-Key** (роль Admin).
3. Оба значения вставить в форму.

### Kaspi.kz

1. Кабинет Kaspi Магазин → **Настройки → API**.
2. **Client-Id** = UID мерчанта (виден в URL кабинета и в выгрузках).
3. **Api-Key** = токен для заголовка `X-Auth-Token`.

### Flip.kz

У Flip.kz нет публичного Merchant API. Поддерживается ручной импорт CSV:

```
sku;name;quantity;price;warehouse
A001;Кроссовки;12;25990;Алматы
A002;Мяч;3;9990;Астана
```

Кнопка **«Загрузить»** доступна на карточке Flip-магазина после его создания.

## Безопасность

- Пароли — bcrypt (10 раундов).
- API-ключи маркетплейсов — AES-256-GCM, ключ в `ENCRYPTION_KEY`.
- Все запросы изолированы по `teamId`.
- Сессии через JWT в HTTPOnly cookie.
- Cron защищён `x-vercel-cron` или Bearer `CRON_SECRET`.

## Команда (до 10 человек)

- При регистрации создаётся команда + первый пользователь с ролью `OWNER`.
- На вкладке **Команда** владелец/админ создаёт сотрудников и передаёт
  им временный пароль. Все участники видят одни и те же ключи и остатки.

## Что синхронизируется

| Площадка | Остатки | Заказы | Метод |
|---|---|---|---|
| WB | да | за 24 ч (FBS) | Statistics + Marketplace API |
| Ozon | да | за 24 ч (FBS) | Seller API v3/v4 |
| Kaspi | да (если задан UID мерчанта) | за 24 ч | Shop API v2 |
| Flip | вручную | — | импорт CSV |

## Поддержка

Если столбец «WB chrtId» / «Ozon sku» / «Kaspi id» в таблице остатков пуст —
значит, площадка не вернула этот идентификатор для конкретной позиции.
Сравнение всё равно работает по основному `SKU` (`vendorCode`/`offer_id`/`code`).
