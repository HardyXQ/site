# WaveSign — админ-панель

Панель управления услугами студии: `https://wavesign.art/admin`.
Публичный сайт (`index.html`) и админка берут данные из одной базы Supabase —
менять код для добавления/редактирования услуг больше не нужно.

```
index.html            публичный сайт (GitHub Pages) — читает услуги из Supabase
admin/                 собранная админ-панель (SPA), отдаётся на /admin
admin-src/             исходники админки (React + TS + Tailwind + Vite)
supabase/migrations/   схема БД, RLS-политики, storage-бакет
supabase/seed.sql      перенос текущих 20 услуг в БД (генерируется из index.html)
supabase/setup.sql     всё вместе одним файлом для SQL Editor
public-config.js       адрес Supabase + anon-ключ (публичные, коммитятся)
scripts/               вспомогательные скрипты
```

---

## 1. Создать проект Supabase (один раз, бесплатный тариф)

1. Зайти на **https://supabase.com** → войти через GitHub → **New project**.
2. Заполнить:
   - **Name:** `wavesign`
   - **Database Password:** сгенерировать надёжный, **сохранить** (понадобится один раз).
   - **Region:** ближайший (например `Central EU (Frankfurt)`).
   - **Plan:** Free.
3. Подождать ~2 минуты, пока проект развернётся.

## 2. Прогнать схему БД

**Вариант A — через SQL Editor (без установки инструментов):**

1. В проекте открыть **SQL Editor** → **New query**.
2. Вставить целиком содержимое `supabase/setup.sql` и нажать **Run**.
   Появятся таблицы `services`, `categories`, `service_images` и 20 текущих услуг.

**Вариант B — через Supabase CLI:**

```bash
npx supabase link --project-ref <ref-из-URL-проекта>
npx supabase db push                       # применит миграции
# затем seed:
#   SQL Editor → вставить supabase/seed.sql → Run
```

## 3. Настроить авторизацию и хранилище

1. **Authentication → Providers → Email:** включить. Отключить **Confirm email**
   (или оставить — скрипт ниже создаёт пользователя уже подтверждённым).
2. **Authentication → Sign In / Providers → отключить «Allow new users to sign up»**
   (регистрация не нужна — аккаунты только у администраторов).
3. **Storage:** бакет `service-images` создаётся миграцией автоматически
   (публичное чтение, запись только у админов, лимит 5 МБ, jpg/png/webp).

## 4. Создать администратора

Взять из **Project Settings → API**:
- **Project URL** — вида `https://abcd.supabase.co`
- **service_role** ключ (секретный — только для этого шага, никуда не коммитить)

```bash
cp .env.example .env        # если ещё нет
# в .env заполнить:
#   VITE_SUPABASE_URL=<Project URL>
#   SUPABASE_SERVICE_ROLE_KEY=<service_role ключ>
#   ADMIN_EMAIL=you@example.com
#   ADMIN_PASSWORD=<надёжный пароль>

npm install
npm run create-admin
```

Скрипт создаёт пользователя и добавляет его в `public.admins`. Пароль хэшируется
на стороне Supabase, в коде его нет.

## 5. Подключить сайт к проекту

В `public-config.js` заменить плейсхолдеры (это **публичные** значения — anon-ключ
защищён политиками RLS, коммитить можно):

```js
var PROD = {
  supabaseUrl: 'https://abcd.supabase.co',       // Project URL
  supabaseAnonKey: 'eyJ...  (anon public key)',   // Project Settings → API → anon public
  publicSiteUrl: 'https://wavesign.art',
};
```

## 6. Собрать и задеплоить

```bash
npm run admin:build      # собирает admin-src/ → admin/
git add -A
git commit -m "admin panel"
git push                 # GitHub Pages подхватит и index.html, и /admin
```

Открыть `https://wavesign.art/admin/login`, войти под созданным аккаунтом.

---

## Локальная разработка

```bash
npm run db:start         # локальный Supabase (нужен Docker)
npm run create-admin     # создаст admin@wavesign.art по данным из .env
npm run admin:dev        # админка на http://localhost:5173/admin/
# или собранную версию + публичный сайт целиком:
npm run admin:build && npm run serve   # http://127.0.0.1:4178
npm run db:stop
```

`public-config.js` сам определяет по hostname: на `localhost`/`127.0.0.1` берёт
локальный Supabase, иначе — прод.

---

## Как это работает

| | |
|---|---|
| **Авторизация** | Supabase Auth (email+пароль), JWT-сессия в браузере. Каждый вход дополнительно сверяется с таблицей `public.admins`. |
| **Защита данных** | Row-Level Security в PostgreSQL: аноним видит только `is_published = true`; любые запись/изменение/удаление — только для админа. Проверка в БД, не в браузере. Скрытие кнопок в UI — вторично. |
| **Изображения** | Грузятся в Supabase Storage (бакет `service-images`), в браузере конвертируются в WebP и ужимаются до 2000 px, лимит 5 МБ. В БД хранится URL. |
| **Публичный сайт** | При загрузке `index.html` запрашивает опубликованные услуги и категории из Supabase и рендерит их; при недоступности БД показывает встроенный снапшот. Порядок — по `sort_order`. |
| **Мультиязычность** | Поля `title`, описания, SEO — `jsonb {ru, uk, en}`. В форме — вкладки RU/UA/EN. |
| **Цены** | `price_amount` + `price_currency` (базовая) + `price_type` (`fixed` / `from` / `on_request`). Переключатель валют на странице услуги конвертирует из базовой. |

## Обслуживание

- Сменить пароль / добавить админа: **Authentication → Users** в Supabase, затем
  добавить `user_id` в таблицу `public.admins` (или `npm run create-admin` с новым email).
- Обновить перенос данных из старого `index.html`: `npm run seed:build`.
- Пересобрать `setup.sql`: `npm run setup:sql`.
