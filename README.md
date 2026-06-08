# Saphath Cloud

Закрытый рабочий портал Saphath для проектов, задач, песен, материалов,
резервных копий, альбомов, концертов, сетлистов, боевых листов, EPK и
упаковочных листов.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, Storage and Row Level Security
- PDFKit + DejaVu TTF fonts for downloadable A4 setlists

## Install And Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app requires Supabase configuration for protected routes. Without valid
Supabase env vars, middleware redirects workspace pages to `/login`.

## Environment Variables

Create `.env.local` locally. Do not commit it.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Current app code authenticates users with the public Supabase URL and anon key.
`SUPABASE_SERVICE_ROLE_KEY` is treated as a server-only secret for operational
server-side checks and scripts. Never expose it to the browser.

## Supabase Migrations

Apply migrations in the Supabase SQL Editor in this exact order:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_crud_profiles_locale.sql
supabase/migrations/003_phase_2_1_workspace_redzone_packing_backups.sql
supabase/migrations/004_event_timing_and_setlist_cleanup.sql
supabase/migrations/005_song_edit_cover_and_material_crud.sql
supabase/migrations/006_event_posters_and_task_crud.sql
supabase/migrations/007_albums_releases.sql
supabase/migrations/008_epk_mvp.sql
```

After migrations, create users in Supabase Authentication. Public signup is not
implemented in the app.

Set the first admin manually:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Optional seed data and task templates live in:

```text
supabase/seed.sql
```

## Supabase Storage Buckets

Create these buckets manually in Supabase Storage before using uploads:

```text
song-covers
event-posters
album-covers
epk-assets
```

Bucket usage:

- `song-covers`: song cover images.
- `event-posters`: concert poster images.
- `album-covers`: album and release cover images.
- `epk-assets`: EPK logos, hero images and press assets.

Recommended access:

- Buckets may remain private.
- The app displays stored artwork through short-lived signed URLs when it can
  resolve the object path.
- Manual external URLs are also supported as a fallback.
- Storage RLS policies for authenticated read/upload/update/delete are defined
  in migrations `005`, `006`, `007`, and `008`.
- Public EPK pages can show public bucket URLs or external/manual URLs. Keep the
  bucket private unless you intentionally expose selected files through public
  URLs or signed URLs.

The app does not create buckets from client-side code. If a bucket or policy is
missing, upload actions return a user-facing error instead of silently
succeeding.

## Auth And Access

Middleware protects all routes except `/login` and static assets. Unauthenticated
users are redirected to `/login?next=...`. Public EPK pages at
`/public/epk/[slug]` are not behind auth, but Supabase RLS only returns profiles
where `is_public = true`.

Primary roles:

- `admin`: full internal access, destructive actions, role management.
- `member`: main workspace editing for songs, events, albums and tasks.
- `manager`: event, task, contact, finance and logistics work.
- `pr`: promo-focused access.
- `session_musician` and `guest`: limited access through explicit policies.

RLS is the main data-protection layer. Server actions call Supabase Auth before
mutating data.

## Printable And Downloadable Setlists

Printable HTML route:

```text
/events/[id]/setlist/print
```

Downloadable PDF route:

```text
/events/[id]/setlist/pdf
```

PDF requirements:

- `pdfkit`
- `dejavu-fonts-ttf`
- `public/branding/saphath-logo.png`

PDF output is A4 portrait, protected by auth, uses DejaVu TTF for Cyrillic text,
and includes the Saphath logo when the file exists.

## Public EPK

Workspace routes:

```text
/epk
/epk/[id]
```

Public route:

```text
/public/epk/[slug]
```

The public route reads real Supabase data and returns content only for EPK
profiles with `is_public = true`. Draft/private EPK profiles are hidden by RLS
and render as not found.

## Project Structure

```text
app/
  (workspace)/        protected workspace pages
  actions.ts          Supabase Server Actions
  events/[id]/...     print/PDF routes outside the sidebar shell
  public/epk/[slug]   public EPK page gated by is_public
components/           shell, cards, editors and UI controls
lib/
  supabase/           server/browser Supabase clients
  data.ts             Supabase data helpers
  print-setlist.ts    shared printable setlist data preparation
supabase/
  migrations/         schema, RLS, indexes and triggers
  seed.sql            optional seed data
public/
  branding/           static brand assets used by PDF/print
```

## Checks

Run before committing:

```bash
npm run typecheck
npm run build
```

Useful smoke routes:

```text
/login
/dashboard
/songs
/albums
/events
/events/[id]
/events/[id]/setlist
/events/[id]/setlist/print
/events/[id]/setlist/pdf
/events/[id]/battle-sheet
/packing-lists
/settings
```

## Deployment Notes

1. Apply Supabase migrations in order.
2. Create the required Storage buckets and verify policies.
3. Add env vars in the hosting provider.
4. Add the production URL to Supabase Auth URL Configuration.
5. Run `npm run build`.

Large audio/video files are not uploaded by the MVP. `song_materials.url` stores
links to external storage such as Google Drive, Dropbox, Yandex Disk or another
controlled file store.
