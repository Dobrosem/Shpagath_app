# Saphath Cloud Production Runbook

This runbook is for the RU VDS production host. Do not paste secrets into
tickets, commits, chat logs, or shell history.

## Production URLs

- Primary application URL: `https://cloud.saphwork.ru`
- Temporary technical URL: `http://45.141.102.69:3000`

The technical IP/port URL should be considered temporary and undesirable after
the Docker port bind is restricted to `127.0.0.1:3000`. External users should
only access the app through HTTPS and Nginx.

## Standard Deploy Procedure

Run these commands on the production server from the application directory:

```bash
git fetch origin
git reset --hard origin/main
cp .env.production.local .env
chmod 600 .env .env.production.local
set -a
source .env.production.local
set +a
COMPOSE_BAKE=false docker compose build --no-cache --progress=plain app
docker compose up -d --force-recreate
docker compose ps
docker compose logs --tail=150 app
```

Use `docker compose up -d --force-recreate` after changing
`docker-compose.yml`, including the loopback-only `127.0.0.1:3000:3000` port
bind. Without a recreate, the old `0.0.0.0:3000` publish rule may remain active.

## Health Checks

Run after every deploy:

```bash
docker compose ps
docker compose logs --tail=150 app
nginx -t
systemctl status nginx --no-pager
certbot certificates
curl -I https://cloud.saphwork.ru
tail -n 80 /var/log/nginx/error.log
```

Expected:

- app container is `Up` and healthy;
- Nginx config test passes;
- certificate for `cloud.saphwork.ru` is present and not near expiry;
- `curl -I https://cloud.saphwork.ru` returns an HTTP response without timeout.

## Supabase Auth URL Checklist

Configure in the Supabase dashboard:

- Site URL: `https://cloud.saphwork.ru`
- Redirect URLs:
  - `https://cloud.saphwork.ru/**`
  - localhost URLs used for local development, if needed

The old direct IP URL may remain temporarily only for diagnostics. Remove it
after HTTPS domain login is confirmed.

## Browser And Cookie Checklist

After changing production domain or Auth URLs:

1. Log out and log in again.
2. If there is a redirect loop, clear site data for `cloud.saphwork.ru`.
3. Verify in a private/incognito window.
4. Verify without VPN.
5. Verify through mobile internet.

## Closing Direct Port 3000

The application should be reachable externally only through Nginx/HTTPS.

The compose file should publish the app as:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

After deploy/recreate, verify:

```bash
ss -tulpn | grep ':3000'
```

Expected: `127.0.0.1:3000`, not `0.0.0.0:3000`.

## Firewall Checklist

Be careful not to lock yourself out of SSH. Do not enable UFW until OpenSSH is
explicitly allowed and you have a working SSH session.

Inspect listening ports:

```bash
ss -tulpn
```

Prepare UFW:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw status verbose
```

Enable only after confirming SSH access:

```bash
ufw enable
ufw status verbose
```

After the Docker loopback bind is deployed:

```bash
ss -tulpn | grep ':3000'
```

Expected: `127.0.0.1:3000`.

## SSH Hardening Plan

Do not disable root login or password auth automatically.

Recommended order:

1. Create a separate sudo user.
2. Add and verify SSH key login for that user.
3. Keep the current SSH session open.
4. Open a second SSH session with the new user.
5. Only then consider disabling password auth and root login.
6. Install fail2ban:

```bash
apt update
apt install fail2ban
systemctl enable --now fail2ban
systemctl status fail2ban --no-pager
```

## Backup Checklist

Before firewall, port, Docker, or migration changes:

1. GitHub
   - commit and push all deployable application changes;
   - confirm the production branch is correct.
2. Environment
   - never commit `.env.production.local`;
   - store it in a password manager;
   - set `chmod 600 .env .env.production.local` on the server.
3. Supabase DB
   - create a backup/snapshot in the Supabase dashboard before applying
     migrations;
   - this is especially important before
     `supabase/migrations/014_production_access_hardening.sql`.
4. Supabase Storage
   - back up song covers;
   - album covers;
   - event posters;
   - file-library;
   - materials;
   - riders;
   - backups;
   - EPK assets.
5. Server
   - create an RU VDS snapshot before major infrastructure changes;
   - create one before closing port 3000 or enabling firewall rules.

## Restore Checklist

To restore the service, confirm access to:

- GitHub repository and production branch;
- `.env.production.local`;
- Docker Compose files;
- DNS for `cloud.saphwork.ru`;
- Supabase project;
- Supabase Storage buckets;
- Nginx site config and TLS certificates.

## First Participant Launch Checklist

Start with one test participant before adding the full band.

1. Create one test participant.
2. Verify:
   - login;
   - dashboard;
   - `/my`;
   - songs;
   - albums;
   - events;
   - materials;
   - setlist builder;
   - upload under the configured size limit;
   - logout/login;
   - full page reload.
3. Verify roles:
   - `member` cannot perform admin-only actions;
   - `guest` cannot edit if guest access is expected to be read-only or blocked;
   - delete actions are protected.
4. Add the rest of the band only after the test participant passes.

## Post-Deploy Smoke

Check from a browser and server logs:

- `/login`
- `/dashboard`
- `/my`
- `/songs`
- `/albums`
- `/events`
- `/events/[id]`
- `/events/[id]/setlist`
- `/events/[id]/battle-sheet`
- `/epk`
- `/copy`
- `/content-calendar`
- public EPK where `is_public=true`
- private EPK where `is_public=false`
- file uploads under the configured size limit
- external URL flows
- PDF download
- Battle Sheet shared rider
