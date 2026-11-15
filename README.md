# MyBoakenoApp

Community super-app for Boac, Marinduque: heritage places, a local market with
delivery/pickup orders, news, park status, tourism and MDRRMO panels.

Next.js 15 (App Router) · TypeScript · Tailwind CSS · SQLite (local) / libSQL–Turso (production).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3001. The database is created automatically at `data/myboakeno.db`
and seeded with verified reference content (14 places, 8 briefs). No demo users, shops or
orders are created. Only one address can hold the administrator role (see
[Administrator account](#administrator-account)); everyone else joins as a resident or seller.

Other scripts: `npm run typecheck`, `npm run build`, `npm start`.

## Deploy to Vercel

Vercel functions have a read-only, per-instance filesystem, so the local SQLite file
cannot be used there. The app talks to a hosted libSQL database (Turso) instead, using the
same SQL and schema — it creates and seeds its own tables on the first request.

1. Create a free database at [turso.tech](https://turso.tech) (or with the CLI:
   `turso db create myboakeno`).
2. Copy the database URL and an auth token:
   - URL: `turso db show myboakeno --url` — it looks like `libsql://myboakeno-<org>.turso.io`
   - Token: `turso db tokens create myboakeno`
3. In Vercel → your project → **Settings → Environment Variables**, add for Production,
   Preview and Development:
   - `TURSO_DATABASE_URL` = the `libsql://…` URL
   - `TURSO_AUTH_TOKEN` = the token
4. Push the repo and import it in Vercel (framework preset: Next.js — no extra build
   settings needed). Or run `vercel` / `vercel --prod`.
5. Open the deployment URL. The first request creates the schema and seeds the reference
   content; then sign up with the administrator email — that account becomes the admin.

Notes:

- Uploaded images are stored as BLOBs in the database and served from `/media/[id]`, so no
  separate file storage or CDN bucket is required.
- Sessions are stored in the database and identified by an httpOnly cookie.
- Node.js runtime is used for every route (SQLite/libSQL are not edge-compatible).
- Without the two environment variables a local `npm run dev` keeps using the SQLite file;
  on Vercel the app reports a clear error in that case instead of silently losing data.

## Administrator account

Exactly one email can be an administrator: `lemuelbenjamin.malate@gmail.com`, or whatever
you set as `ADMIN_EMAIL` in the environment. Signing up or signing in with that address
gives the account the administrator role and opens the tourism and MDRRMO panels.

Everyone else registers as a resident (or a seller, if they tick the shop box). The staff
panels reject them, and the "staff" links on public pages are not rendered for them. There
is no public "create administrator" screen, so a new deployment cannot be claimed by
whoever registers first.

## Project layout

```
app/            routes, server actions (app/actions) and panels
components/     UI components (map, image picker, cart/checkout)
lib/            database layer (db.ts), auth, media, Boac reference data
data/           local SQLite file (git-ignored, created on first run)
```
