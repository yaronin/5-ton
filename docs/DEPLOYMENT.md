# Deployment guide (Vercel + Turso)

This app runs on **Vercel** (serverless) and stores data in **Turso** (SQLite-compatible libSQL). Tables are **not** created automatically when you deploy — you apply the schema from your computer with `npm run db:push`.

---

## Overview

| Step | Where | What |
|------|--------|------|
| 1 | [Turso](https://turso.tech) | Create an empty database + auth token |
| 2 | Your PC | Create **`.env.local`** with Turso URL + token |
| 3 | Your PC | `npm run db:push` → creates `users`, `auth_sessions`, `session_results` on Turso |
| 4 | Your PC | `npm run db:seed` → optional default admin user |
| 5 | [GitHub](https://github.com) | Push code (see [README](../README.md)) |
| 6 | [Vercel](https://vercel.com) | Import repo, set **same** env vars as `.env.local` |
| 7 | Vercel | Deploy; open production URL |
| 8 | Browser | Open production URL → `/login` → sign in → use `/` |

**Important:** `db:push` does **not** run on Vercel during build. If you skip step 3 against Turso, production will error with `no such table: users`.

### Login-required behavior (production)

- **`/`** — Challenge app; requires `ftc_session` cookie (middleware). Without it, users go to **`/login?from=/`**.
- **`/login`** — Public. Shows top-5 leaderboard + login/register. Already logged in → redirect to `/`.
- **`/admin`** — Requires login; admin role checked in the app and API.

Bookmark **`https://your-app.vercel.app/login`** for new users.

---

## 1. Create a Turso database

1. Sign in at [https://turso.tech](https://turso.tech).
2. Create a database (e.g. `five-ton-prod`).
3. Copy the **Database URL** — it looks like:
   ```text
   libsql://your-db-name-your-org.turso.io
   ```
4. Create an **auth token** for that database (read/write). Save it somewhere safe; you cannot view the full token again later.

### Turso CLI (optional)

```bash
turso db create five-ton-prod
turso db show five-ton-prod --url
turso db tokens create five-ton-prod
```

---

## 2. Configure `.env.local` on your PC

All commands below run from the **project root** (folder that contains `package.json`):

```text
five-ton-challenge/
  package.json
  drizzle.config.ts
  app/
  ...
```

### File name must be `.env.local`

- Correct: **`.env.local`** (leading dot)
- Wrong: `env.local` — Next.js and `db:push` will **not** read it

On Windows, enable **View → Hidden items** in File Explorer if you do not see dotfiles.

Copy [`.env.example`](../.env.example) to `.env.local`:

```env
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-turso-token-here
ADMIN_BOOTSTRAP_EMAIL=you@example.com
```

| Variable | Production (Vercel) | Local dev |
|----------|---------------------|-----------|
| `TURSO_DATABASE_URL` | **Required** — `libsql://...` | Optional — omit to use `file:./local.db` |
| `TURSO_AUTH_TOKEN` | **Required** for Turso | Omit for `file:` URLs |
| `ADMIN_BOOTSTRAP_EMAIL` | Optional | Optional |

**Never commit** `.env.local` — it is listed in `.gitignore` (` .env*`).

### PowerShell note

`echo $env:TURSO_DATABASE_URL` in PowerShell only shows variables you set **in that terminal**. A `.env.local` file is **not** loaded into PowerShell automatically. That is normal. `npm run db:push` reads `.env.local` via `drizzle.config.ts`.

---

## 3. Apply schema and seed (from your PC)

```bash
cd path/to/five-ton-challenge
npm install
npm run db:push
npm run db:seed
```

### Success indicators

- **`db:push`:** `[✓] Changes applied`
- **`db:seed`:** `Seeded default admin user.` (or `Default admin already exists`)

### Confirm you hit Turso, not local `local.db`

Before `db:push`, your `.env.local` must have `TURSO_DATABASE_URL=libsql://...` (not `file:./local.db`).

If you run `db:push` without Turso env vars, only **`local.db`** on your laptop is updated; Vercel will still have no tables.

---

## 4. Push code to GitHub

From the project root:

```bash
git add .
git commit -m "Your message"
git push origin main
```

Repository example: `https://github.com/yaronin/5-ton.git` (adjust to your remote).

---

## 5. Deploy on Vercel

1. Go to [https://vercel.com](https://vercel.com) → **Add New Project**.
2. Import your GitHub repository.
3. Framework preset: **Next.js** (defaults are usually fine).
4. **Environment Variables** — add for **Production** (and Preview if you want):

   | Name | Value |
   |------|--------|
   | `TURSO_DATABASE_URL` | Same `libsql://...` as `.env.local` |
   | `TURSO_AUTH_TOKEN` | Same token as `.env.local` |
   | `ADMIN_BOOTSTRAP_EMAIL` | Optional |

5. Deploy.

### After deploy

- Open the production URL — you should land on **`/login`** (or be redirected there from `/`).
- **Register** or **log in**, then use the challenge at **`/`**.
- Open **`/admin`** as an admin user to manage athletes.

You do **not** need to redeploy after `db:push` unless you changed application code. Schema changes only require `db:push` against Turso.

---

## 6. Default admin (testing)

After `npm run db:seed` against the **same** database Vercel uses:

| Field | Value |
|-------|--------|
| Email | `admin` (shortcut) or `admin@five-ton.local` |
| Password | `Unix11!` |

**Change this password** before sharing the app publicly (edit user in `/admin` or update the row in Turso).

---

## 7. Updating the database after code changes

When `db/schema.ts` changes:

```bash
# With .env.local pointing at Turso
npm run db:generate   # optional: new SQL under drizzle/
npm run db:push       # apply schema to Turso
```

Then redeploy Vercel if you also changed application code.

---

## 8. Security checklist

- Do not commit `.env.local`, `*.db`, or Turso tokens to GitHub.
- If a token was ever committed or leaked, **revoke it** in Turso and create a new one; update Vercel + `.env.local`.
- Use different Turso databases for **production** vs **local** experiments if you prefer isolation.
- Rotate the seeded admin password before real users join.

---

## 9. Quick reference

```bash
# Project root only
npm run dev          # local app (reads .env.local via Next.js)
npm run build        # production build test
npm run db:push      # apply tables (reads .env.local via drizzle.config.ts)
npm run db:seed      # seed admin (reads .env.local in script)
npm run db:studio    # optional DB browser
```

For common errors, see [Troubleshooting](../README.md#troubleshooting) in the README.

### Redirect loop on `/login` (rare)

Usually means the session cookie is not stored (HTTP site with `secure` cookie, blocked third-party cookies, or wrong domain). Use **HTTPS** on Vercel and test in a normal browser window. Log out clears the cookie and returns you to `/login`.
