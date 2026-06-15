# Saphath Cloud

Закрытый рабочий портал Saphath для проектов, задач, песен, материалов,
резервных копий, альбомов, концертов, сетлистов, боевых листов, EPK,
библиотеки текстов, контент-календаря, файлов и упаковочных листов.

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
supabase/migrations/009_copy_library.sql
supabase/migrations/010_copy_delete_policy_fix.sql
supabase/migrations/011_content_calendar.sql
supabase/migrations/012_file_library.sql
supabase/migrations/013_event_shared_tech_rider.sql
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
file-library
```

Bucket usage:

- `song-covers`: song cover images.
- `event-posters`: concert poster images.
- `album-covers`: album and release cover images.
- `epk-assets`: EPK logos, hero images and press assets.
- `file-library`: internal workspace documents, media assets, riders, tabs,
  contracts and other working files.

Recommended access:

- Buckets may remain private.
- The app displays stored artwork through short-lived signed URLs when it can
  resolve the object path.
- Manual external URLs are also supported as a fallback.
- Storage RLS policies for authenticated read/upload/update/delete are defined
  in migrations `005`, `006`, `007`, `008`, and `012`.
- `file-library` can remain private. Workspace pages resolve stored objects
  with short-lived signed URLs. If a file is hosted in Yandex Disk, Google
  Drive, Dropbox or another controlled store, use the `external_url` fallback.
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

## Copy Library

Workspace routes:

```text
/copy
/copy/[id]
```

Copy Library is an internal module for reusable event, release, EPK, press,
social, email and ad texts. It stores `copy_items` and explicit
`copy_item_versions`, supports relations to events, albums, songs and EPK
profiles, and is protected by Supabase Auth/RLS. It has no public route and does
not expose texts to anonymous users.

## Content Calendar

Workspace routes:

```text
/content-calendar
/content-calendar/[id]
```

Content Calendar is an internal planning calendar for Saphath publications. It
links planned posts to Copy Library texts, events, albums, songs and EPK
profiles. The module stores scheduling metadata, channels, content types,
statuses, assets and result links. It does not publish automatically to VK,
Telegram or any other platform.

## Module File Attachments

`public.files` and the `file-library` bucket are a hidden backend for module
attachments, not a primary workspace section. Users upload files from the
relevant module page: shared EPK documents, song documents and release files.

Uploaded files are stored in the `file-library` bucket under relation-aware
paths such as `event-{id}/{timestamp}-{filename}` or `general/...`. The app
stores metadata in `public.files` and displays private objects through signed
URLs inside the authenticated workspace.

Browser uploads are limited to lightweight documents and images with a maximum
size of 8 MB. Large audio, video, stems, multitracks and project archives
should stay in external storage such as Yandex Disk, Google Drive or Dropbox and
be linked through `external_url`.

Technical riders are reusable shared documents: upload the rider once in EPK
shared documents, then select it on each event through `events.tech_rider_file_id`.
The old `events.tech_rider_url` field remains as an external fallback for older
events. Stage plot, light timing and video timing stay as URL fields in the MVP
because they usually depend on a specific venue and event.

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
/copy
/content-calendar
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

## Production Deployment Checklist

### Vercel Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: public Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only secret only for server-side
  operational checks or scripts if needed. Do not expose it as `NEXT_PUBLIC_*`.

### Supabase Migrations

Apply migrations `001` through `013` strictly in order before opening the app to
users.

### Supabase Buckets

- `song-covers`: public bucket for song cover images.
- `event-posters`: public bucket for event poster images.
- `album-covers`: private bucket; workspace pages display objects through
  signed URLs.
- `epk-assets`: authenticated/private unless selected assets are intentionally
  exposed through public URL fields.
- `file-library`: private bucket for internal attachments and shared technical
  riders; workspace pages display objects through signed URLs.

### Supabase Auth URLs

Configure Supabase Auth URL settings before deploy preview testing:

- Site URL: production domain.
- Redirect URLs: production domain, Vercel preview domains if used, and
  localhost for local development.

### Post-Deploy Smoke

- Login and logout.
- `/dashboard`
- `/songs`
- `/events`
- `/epk`
- `/copy`
- `/content-calendar`
- Public EPK with `is_public = true` and private EPK with `is_public = false`.
- File uploads under 8 MB.
- External URL fallbacks.
- PDF setlist download.
- Battle Sheet shared technical rider.

## Selectel Deployment

This first production stage runs only the Next.js app on a Selectel Cloud
Server/VPS. Supabase remains the hosted DB/Auth/Storage backend.

### 1. Create Server

Create a Selectel Cloud Server or VPS with:

- Ubuntu 24.04 or a Containers Ready/Docker image.
- Public IP address.
- SSH key access.
- Firewall/security group allowing ports `22`, `80`, and `443`.

Nginx reverse proxy and HTTPS can be configured manually after the app is
running.

### 2. Prepare Server

Install Docker and Docker Compose if the image does not include them, then clone
the repository:

```bash
git clone <repository-url>
cd <repository-directory>/Saphath\ Cloud
cp .env.production.example .env.production.local
```

Edit `.env.production.local` on the server and add the Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only optional/reserved. Do not expose it as
`NEXT_PUBLIC_*`.

Docker Compose uses `.env.production.local` at runtime, but build args for
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must also be
available while `docker compose build` runs. On the server, either export them
before building:

```bash
set -a
source .env.production.local
set +a
docker compose build --no-cache
```

Or create a local Compose `.env` file from the production env file:

```bash
cp .env.production.local .env
```

`.env` and `.env.production.local` are ignored by Git and must not be committed.

Build and run the container:

```bash
docker compose build
docker compose up -d
docker compose ps
```

If Docker is not available locally, run this build check directly on the
Selectel server after installing Docker.

Check the app before adding a reverse proxy:

```text
http://SERVER_IP:3000
```

### 3. Reverse Proxy

Use Nginx or Caddy in front of the container. The included example lives at:

```text
deploy/nginx/saphath-cloud.conf.example
```

For Nginx:

- Proxy to `127.0.0.1:3000`.
- Set `client_max_body_size 8M`.
- Configure HTTPS with Let's Encrypt/Certbot after the domain points to the
  server.

### 4. Supabase Auth

In Supabase Auth URL configuration, set:

- Site URL: production domain.
- Redirect URLs: production domain, localhost for local development, and any
  temporary test domain if used.

### 5. Supabase Storage

Create and verify these buckets:

- `song-covers`: public.
- `event-posters`: public.
- `album-covers`: private/signed URL.
- `epk-assets`: authenticated/private unless intentionally exposed through
  public URL fields.
- `file-library`: private/signed URL.

Apply migrations `001` through `013` strictly in order before production use.

### 6. Post-Deploy Smoke

Check:

- Login and logout.
- `/dashboard`
- `/songs`
- `/events`
- `/epk`
- `/copy`
- `/content-calendar`
- Public EPK with `is_public = true` and private EPK with `is_public = false`.
- PDF setlist download.
- Uploads under 8 MB.
- External URL fallback.
- Shared technical rider in Battle Sheet.

### 7. Update Application

For routine updates:

```bash
git pull
docker compose build
docker compose up -d
docker compose ps
```

Clean unused images only after confirming the new container is healthy:

```bash
docker image prune
```

Stop the application when needed:

```bash
docker compose down
```
