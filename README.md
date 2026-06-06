# Saphath Workspace

Закрытый рабочий портал группы Saphath: проекты, задачи, песни, музыкальные
материалы, концерты, боевые листы, репетиции, промо, контакты и финансы.

## Стек

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL и Row Level Security
- Vercel

## Локальный запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Откройте `http://localhost:3000`. Без Supabase-переменных приложение работает в
demo-режиме с локальными данными. Это удобно только для UI-разработки.

## Настройка Supabase

1. Создайте новый Supabase project.
2. Выполните `supabase/migrations/001_initial_schema.sql` в SQL Editor.
3. Создайте пользователей в Authentication > Users. Публичной регистрации в
   приложении нет.
4. Назначьте первого администратора:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@saphath.ru';
```

5. При необходимости выполните `supabase/seed.sql`.
6. Заполните `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

При настроенном Supabase middleware требует авторизацию для всех маршрутов,
кроме `/login`. RLS остаётся главным уровнем защиты данных.

## Роли и доступ

- `admin`: полный доступ и управление ролями/доступом.
- `member`: основные рабочие данные, песни, материалы и назначенные задачи.
- `manager`: концерты, задачи, промо, контакты и финансы.
- `pr`: промо и чтение связанных проектов/концертов.
- `session_musician`, `guest`: только явные разрешения из `entity_access`.

Точечный доступ выдаётся записью:

```sql
insert into public.entity_access (user_id, entity_type, entity_id, access_level)
values ('USER_UUID', 'song', 'SONG_UUID', 'read');
```

## Структура

```text
app/
  (workspace)/        защищённые рабочие страницы
  actions.ts          Supabase Server Actions
  login/              вход без публичной регистрации
components/           оболочка, карточки, формы и UI
lib/
  supabase/           browser/server clients
  data.ts             запросы с demo fallback
supabase/
  migrations/         схема, RLS, индексы и триггеры
  seed.sql             тестовые данные и шаблоны чеклистов
```

## Проверка

```bash
npm run typecheck
npm run build
```

## Деплой на Vercel

1. Импортируйте репозиторий в Vercel.
2. Добавьте `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.
4. В Supabase Authentication > URL Configuration добавьте production URL в
   Site URL и Redirect URLs.

Большие музыкальные файлы в MVP не загружаются: `song_materials.url` хранит
ссылки на Яндекс Диск, Google Drive, Dropbox или другое внешнее хранилище.
