# Running it for real

Open **<http://task-manager>** (or <http://localhost>). It always answers.

Docker is deliberately **not** started at login — it costs 2GB+ of RAM sitting
idle. Instead a ~55MB Node process (the "gateway") holds port 80 permanently:

- Docker running → it proxies straight through to the app.
- Docker off → it serves a small page with a **Start it** button, which
  launches Docker Desktop and reloads into the app once it answers. Measured
  cold start: about 20 seconds.

So the URL is always live, and the heavy part only runs when you ask for it.

## The gateway

Registered as the `TaskManagerGateway` logon task, launched hidden via
`tools/gateway/start-gateway.vbs`. Zero dependencies — plain Node.

```bash
node tools/gateway/server.mjs          # run by hand (port 80)
GATEWAY_PORT=8080 node tools/gateway/server.mjs
```

| Endpoint | Purpose |
|---|---|
| `/__gateway/status` | `{"up":true\|false}` — whether the app answers on :3000 |
| `/__gateway/start` | POST; launches Docker Desktop |

Manage the task with `Get-ScheduledTask TaskManagerGateway`,
`Start-ScheduledTask`, `Unregister-ScheduledTask`.

### The hostname

`http://task-manager` needs one line in the hosts file, which requires
administrator rights. In an **elevated** PowerShell:

```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "`n127.0.0.1`ttask-manager"
```

Until then, <http://localhost> works identically.

## Containers

```bash
docker compose up -d --build    # after a code change
docker compose up -d            # start by hand
```

`restart: unless-stopped` means the containers come back by themselves whenever
Docker Desktop starts — which is why the Start button is all it takes.

## What runs where

| Service | Port | Notes |
|---|---|---|
| gateway | 80 | Always on (~55MB). Proxies to `web`, or serves the start page. |
| `web` | 3000 | Next.js production server, behind the gateway. |
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
