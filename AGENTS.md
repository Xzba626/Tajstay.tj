# AGENTS.md

## Cursor Cloud specific instructions

TajStay is a single Next.js 14 monolith (`npm` package `tajstay`) with PostgreSQL via Prisma. There is no separate API server and no `npm test` script.

### Node.js version

The app requires **Node 18–20** (see `package.json` `engines` and `.nvmrc`). Cloud VMs may ship Node 22 at `/exec-daemon/node`, which takes precedence over `nvm` on `PATH`. **Prepend Node 20 before all npm/node commands:**

```bash
export PATH="/home/ubuntu/.nvm/versions/node/v20.20.2/bin:$PATH"
```

Or run `nvm use 20` after sourcing `~/.nvm/nvm.sh`, but always verify with `node -v` (must be ≤20).

### PostgreSQL

`docker compose` is optional. On Cloud VMs without Docker, use the system PostgreSQL service:

```bash
sudo pg_ctlcluster 16 main start   # if not already running
pg_isready -h localhost -p 5432
```

Default local credentials match `.env.example`: user `postgres`, password `postgres`, database `tajstay`. First-time DB setup (once per fresh Postgres volume):

```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -tc "SELECT 'CREATE DATABASE tajstay' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tajstay')" | sudo -u postgres psql
```

### Environment file

Copy `.env.example` to `.env` and set `AUTH_SECRET` to a random string (≥32 chars). Other integrations (Pusher, Firebase, Telegram, Resend, Vercel Blob) are optional for core local dev.

### Common commands

| Task | Command |
|------|---------|
| Install deps | `npm install` (runs `prisma generate` via `postinstall`) |
| Migrate + seed | `npm run doctor` |
| Dev server | `npm run dev` → http://localhost:3000 |
| Lint | `npm run lint` |
| Health check | `curl http://localhost:3000/api/health` |

Seed users (from `src/lib/seed/runDevSeed.ts`): Admin `+992900000001`/`Admin123!`, Owner `+992900000002`/`Owner123!`, Guest `+992900000003`/`Guest123!`.

### Gotchas

- **`npm run build` may fail** on some pages in the current tree (e.g. missing `/about/page`); **dev mode (`npm run dev`) is the supported local workflow**.
- Search API (`GET /api/search`) treats empty `minPrice`/`maxPrice` query params as `0`, which filters out all rooms. Omit those params or pass realistic values (e.g. `maxPrice=9999`) when testing via curl.
- Guest login via `POST /api/auth/email/login` with JSON `{ "phone": "+992900000003", "password": "Guest123!" }` is reliable for API-level auth checks; use cookies from the response for authenticated routes.
- Optional services (Pusher, Firebase, Telegram webhook, Resend) are not required for browse/search/book flows in dev.
