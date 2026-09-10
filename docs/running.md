# Running it for real

The app runs as three containers, so a reboot brings it back on its own.
No dev servers, no commands to remember.

```bash
docker compose up -d --build    # first run, and after any code change
docker compose up -d            # any other time
```

Then open <http://localhost:3000>.

`restart: unless-stopped` means Docker restarts all three on boot. The one
manual step left is Docker Desktop itself — turn on **Settings → General →
Start Docker Desktop when you sign in** and there is nothing to do at all.

## What runs where

| Service | Port | Notes |
|---|---|---|
| `web` | 3000 | Next.js production server. The only port you need open. |
| `api` | 4000 | Express. Exposed for the importer and `curl`; the browser never calls it directly. |
| `postgres` | 5433 | Data lives in the `task-manager-pgdata` volume. |

The browser only ever talks to port 3000: `next.config.ts` rewrites `/api/*`
through to the API container over Docker's private network. That means no CORS
to configure, and only one port to expose over Tailscale.

## Everyday commands

```bash
docker compose logs -f web api    # tail logs
docker compose restart api        # restart one service
docker compose down               # stop everything (data survives)
docker compose up -d --build      # rebuild after a code change
```

Migrations run automatically each time the API container starts
(`prisma migrate deploy` is idempotent), so pulling new code and rebuilding is
all it takes to move the schema forward.

## Reaching it from your phone — Tailscale

Optional. Gives you the app on any of your devices without putting it on the
public internet.

1. Install Tailscale on this PC and on the phone, signing into both with the
   same account. The free plan covers 100 devices.
2. On this PC, publish the web port with HTTPS:

   ```bash
   tailscale serve --bg 3000
   ```

   It prints a URL like `https://<pc-name>.<tailnet>.ts.net`. The certificate
   is real, so no browser warnings.
3. Open that URL on the phone, while connected to Tailscale.

Only your own devices can reach it — the app is never exposed publicly. Note
that this PC has to be **awake**: Tailscale cannot reach a sleeping machine.

Do **not** run `tailscale funnel` unless you have added authentication first.
Funnel exposes the app to the whole internet, and there is currently no login.

## Backups

Your tasks live in a Docker volume. That survives reboots and rebuilds, but not
a disk failure or an accidental `docker compose down -v`. Two options:

**JSON export** — human-readable, re-importable, good for keeping in a cloud
folder:

```bash
pnpm --filter @task-manager/api export tasks-backup.json
```

Restore it with:

```bash
pnpm --filter @task-manager/api import tasks-backup.json --replace
```

**Full database dump** — exact, includes ids and timestamps:

```bash
docker exec task-manager-db pg_dump -U taskmanager taskmanager > backup.sql
# restore
docker exec -i task-manager-db psql -U taskmanager taskmanager < backup.sql
```

The JSON export is the one to automate; it round-trips through the same
validation as anything typed into the UI.

## Still missing before this could go on the public internet

- **There is no authentication.** Anyone who can reach the app has full read
  and write access. That is fine on localhost and fine over Tailscale, where
  the network is the boundary. It is not fine on a public URL.
- No rate limiting, and no HTTPS of its own (Tailscale provides it).
