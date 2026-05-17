# The 5-Ton Challenge

> Move **5,000 kg** of total bodyweight volume across pull-ups and dips.
> One session. One target. No excuses.

A single-page, high-intensity strength-endurance tracker built with Next.js 14,
Tailwind, Framer Motion and Lucide. The aesthetic is "Industrial Athlete" —
dark grit, amber timer, emerald progress.

## Core Logic

- **Target reps per lift** = `ceil(5000 / userWeight)`
- Two independent counters (pull-ups & dips) both target that same number.
- A single global timer auto-starts on the first rep of either lift and
  freezes only when **both** counters hit their target.
- Bodyweight, best-ever time, and session history are persisted in
  **localStorage** (`fiveTon.weight`, `fiveTon.bestMs`, `fiveTon.results`) for
  instant offline use.
- When you **log in**, each logged session row is also sent to the server so
  your history and leaderboard eligibility stay in sync with the database.

## Stack

- **Next.js 14** (App Router; main UI in `app/page.tsx`)
- **Tailwind CSS** for the dark/grit visual system
- **Framer Motion** for screen transitions, progress fills and the finish overlay
- **Lucide React** icons
- **Drizzle ORM** + **@libsql/client** against **[Turso](https://turso.tech/)**
  (SQLite-compatible, suitable for Vercel serverless; no durable disk SQLite on
  the function filesystem)

## Database and environment

1. Create a Turso database and issue an auth token (Turso CLI or dashboard).
2. **Local `npm run dev`:** if you skip `.env.local`, the app uses **`file:./local.db`** automatically (development only). For Turso in the cloud, copy [`.env.example`](.env.example) to `.env.local` and set:

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `TURSO_DATABASE_URL` | **Production**; optional in dev | `libsql://...` or `file:./local.db`. In **development**, omitted means `file:./local.db`. |
| `TURSO_AUTH_TOKEN` | For remote Turso | Database token from Turso |
| `ADMIN_BOOTSTRAP_EMAIL` | No | If set, registering with this email (after lowercasing) grants `is_admin`. The **first user in an empty database** is always an admin. |

3. Apply the schema to your database:

```bash
npm run db:push
```

4. **Optional — built-in admin for testing** (display name **Admin**, password **`Unix11!`**):

```bash
npm run db:seed
```

This creates `admin@five-ton.local` with `is_admin` if that row does not exist.
The script loads `.env.local` when present and otherwise uses **`file:./local.db`** if `TURSO_DATABASE_URL` is unset. **Change this password** before any real deployment.

**Log in:** use **`admin`** (shortcut) or **`admin@five-ton.local`** in the email field, password **`Unix11!`**. Registration is blocked for the reserved admin email.

Migrations live under [`drizzle/`](drizzle/); `db:generate` creates new SQL from
schema changes, `db:push` applies the schema (handy for Turso). Optional:
`npm run db:studio` opens Drizzle Studio.

## Features

- **Accounts** — Register / log in from the header. Passwords are hashed with
  bcrypt; sessions use an opaque id in an **httpOnly** cookie.
- **Leaderboard** — Public top **5** athletes by fastest **completed** challenge
  time (`GET /api/leaderboard`), shown on the home screen when data exists.
- **Admin** — Users with `is_admin` see an **Admin** link to `/admin`
  listing all users with attempt counts, personal best (completed runs), and
  last activity. From there you can **edit** a user (email, display name, admin flag,
  optional password reset) or **delete** a user (`PATCH` / `DELETE` on `/api/admin/users/[id]`).

## Getting Started

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command            | Action                         |
| ------------------ | ------------------------------ |
| `npm run dev`      | Start the dev server           |
| `npm run build`    | Production build               |
| `npm start`        | Run the production build       |
| `npm run lint`     | Lint with `eslint-config-next` |
| `npm run db:push`  | Push Drizzle schema to Turso   |
| `npm run db:generate` | Generate SQL migrations from schema |
| `npm run db:studio`   | Drizzle Studio                 |
| `npm run db:seed`  | Insert default admin (`admin` / `admin@five-ton.local`, password `Unix11!`) if missing |

## Flow

1. **Weight Input** — large, centered numeric field: *"Current Weight (kg)?"*.
   Live-previews the rep target as you type.
2. **Dashboard** — Mission Briefing card, amber global timer (with scan-line
   FX), and two glowing vertical progress bars for pull-ups and dips. Each
   track shows reps, kg lifted so far, and reps remaining.
3. **Finish Line** — When both bars hit 100%, a "Challenge Complete" overlay
   slides in with the total time. If it beats the saved PB, a "New PB"
   badge animates in and the value is written back to `localStorage` (and to
   the server when logged in).

## File Map

```
app/
  page.tsx              // Main challenge UI
  layout.tsx            // Root layout + metadata
  globals.css
  admin/page.tsx        // Admin dashboard (client)
  components/
    AuthPanel.tsx       // Register / login / logout + optional local history upload
    LeaderboardStrip.tsx
  api/
    auth/*              // register, login, logout, me
    results/route.ts    // list + append session rows (authenticated)
    results/bulk/route.ts // bulk upload local history (authenticated)
    leaderboard/route.ts
    admin/users/route.ts
    admin/users/[id]/route.ts
db/
  schema.ts             // Drizzle tables: users, auth_sessions, session_results
  index.ts              // getDb() singleton
lib/
  defaultAdmin.ts       // Reserved admin email + login shortcut "admin"
  session.ts            // Cookie session helpers
  password.ts
  parseSessionResult.ts
  formatTime.ts
  storageKeys.ts        // localStorage key names shared with AuthPanel
drizzle/                // Generated migrations
scripts/
  seed-default-admin.mjs
drizzle.config.ts
tailwind.config.ts
next.config.mjs
```

## Notes

- The timer ticks at ~19 fps (53 ms interval) which is plenty for a session
  display and easy on the battery.
- All state resets cleanly via the **Reset Session** and **Recalibrate
  weight** controls, and the PB is preserved across resets.
- After **log in** or **register**, if you have local history in this browser,
  you may confirm an optional upload to merge those rows into your account.
- Deploying to **Vercel**: set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in
  the project environment; run `db:push` (or apply migrations) against that
  database before sending traffic.
