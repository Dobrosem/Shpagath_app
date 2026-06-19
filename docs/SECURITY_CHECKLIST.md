# Saphath Cloud Security Checklist

Use this checklist before inviting band members into production. Do not apply
database changes directly from this document without a backup and manual review.

## Access Model

Target roles:

- `admin`: full operational and destructive access.
- `manager`: live/event operations and selected cleanup actions.
- `member`: normal workspace create/update access, no critical hard deletes.
- `guest`: blocked or read-only until an admin promotes the user.

Production should not rely on open public sign-up. If Supabase Auth sign-up is
enabled, new users must stay `guest` until manually promoted.

## Supabase Auth Settings

In Supabase dashboard:

- Site URL: `https://cloud.saphwork.ru`
- Redirect URLs:
  - `https://cloud.saphwork.ru/**`
  - local development URLs only when needed

The direct IP URL should only remain temporarily for diagnostics.

## RLS Migration 014 Review

Prepared migration:

```text
supabase/migrations/014_production_access_hardening.sql
```

Do not apply automatically.

### What It Changes

- New Auth users created by `handle_new_user()` become `guest`, not `member`.
- `ensure_profile()` also creates missing profiles as `guest`.
- Self-insert fallback only allows `guest`.
- Finance records become read-only for normal workspace roles; mutations are
  admin-only.
- Hard deletes for songs, song materials, events, copy items, content calendar
  items, and file records are restricted.
- Storage object deletes for key buckets are restricted to elevated roles.
- Members keep normal day-to-day insert/update access where intended.

### Main Risks

- If the current owner is not actually `admin`, they may lose elevated actions.
- Existing workflows where members delete records will start failing by design.
- Some UI delete buttons may remain visible, but RLS will reject the operation
  unless the user has the required role.
- New users will enter as `guest`; an admin promotion workflow must be ready.

### Safe Pre-Check SQL

Run manually in Supabase SQL editor before applying migration `014`:

```sql
select id, email, full_name, role
from public.profiles
order by role, email;
```

Confirm at least one active owner account has `role = 'admin'`.

Check current delete-sensitive policies:

```sql
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and (
    tablename in (
      'songs',
      'song_materials',
      'events',
      'setlists',
      'setlist_items',
      'tasks',
      'finance_records',
      'files',
      'copy_items',
      'content_calendar_items'
    )
    or tablename = 'objects'
  )
order by schemaname, tablename, policyname;
```

### Before Applying 014

1. Create a Supabase DB backup/snapshot.
2. Confirm the current owner is `admin`.
3. Confirm how the first band participant will be promoted from `guest` to
   `member`.
4. Confirm expected delete behavior:
   - song delete;
   - event delete;
   - material delete;
   - task delete;
   - file/archive flows;
   - finance edit/delete.
5. Keep the app open in an existing admin session during testing.

### After Applying 014

Test as `admin`:

- login;
- dashboard;
- `/my`;
- create/update song;
- create/update event;
- delete-only flows that should remain admin/elevated;
- finance mutation if used;
- upload and replace files.

Test as `member`:

- login;
- dashboard;
- `/my`;
- create/update normal workspace records;
- verify hard deletes are denied where intended.

Test as `guest`:

- login behavior;
- blocked or read-only behavior;
- no mutation access.

## Storage Buckets

Expected buckets:

- `song-covers`: public or signed previews depending on deployment decision.
- `event-posters`: public or signed previews depending on deployment decision.
- `album-covers`: private/signed URL.
- `epk-assets`: authenticated/private unless a public URL field is intentionally
  used.
- `file-library`: private/signed URL.

Private workspace files must not be exposed through public bucket policies.
Public EPK should expose only intentionally published profile/media fields.

## Direct Port 3000

The app should not be publicly exposed on `0.0.0.0:3000`.

Compose should use:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

Manual server verification:

```bash
docker compose up -d --force-recreate
ss -tulpn | grep ':3000'
curl -I https://cloud.saphwork.ru
```

Expected port bind: `127.0.0.1:3000`.

## Firewall

Before enabling UFW:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw status verbose
```

Only enable after confirming SSH access:

```bash
ufw enable
ufw status verbose
```

Do not remove SSH access rules while connected remotely.

## SSH Hardening

Recommended sequence:

1. Create a separate sudo user.
2. Configure SSH key login.
3. Verify a second SSH session with the new user.
4. Only then disable password auth and root login.
5. Install and enable fail2ban.

Do not perform these changes automatically from the app repository.

## Environment Files

Must remain untracked:

- `.env`
- `.env.local`
- `.env.production.local`
- `.env*.local`

Store production env values in a password manager and set permissions on the
server:

```bash
chmod 600 .env .env.production.local
```

## First Participant Security Test

Start with one test participant.

Verify:

- login/logout;
- `/dashboard`;
- `/my`;
- songs;
- albums;
- events;
- materials;
- setlist builder;
- upload under the configured size limit;
- page reloads;
- member cannot perform admin-only actions;
- guest cannot edit if not promoted;
- delete actions are blocked or elevated as designed.

Invite the rest of the band only after this test passes.
