# Set Up the Database Fully

One-time setup: create a free PostgreSQL database, run the schema, and (optional) seed a demo user and sample data.

---

## Your Supabase project

**Dashboard:** [https://vqrmqgbmqlhqnjlalokd.supabase.co](https://vqrmqgbmqlhqnjlalokd.supabase.co)

1. Open the link above → **Project Settings** (gear) → **Database**.
2. Under **Connection string** choose **URI**, copy it, and replace `[YOUR-PASSWORD]` with your database password.
3. In your project folder (PowerShell):
   ```powershell
   $env:DATABASE_URL="<paste the URI here>"
   npm run db:setup
   ```
4. Add the same `DATABASE_URL` in Vercel (or your host) **Environment Variables** and redeploy.

---

## Option A: Supabase (Free, ~2 minutes)

1. **Create project**
   - Go to **https://supabase.com** → Sign in → **New project**.
   - Name: `prahari`, set a database password (save it), region: pick nearest → **Create project**.

2. **Get connection string**
   - Wait for the project to be ready.
   - **Project Settings** (gear) → **Database**.
   - Under **Connection string** choose **URI**.
   - Copy the URI. It looks like:
     ```
     postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with the database password you set.
   - For **local runs** (schema/seed from your PC), use the **Session mode** or **Transaction** URI on port **5432** if you see it, or the **Pooler** URI on port **6543** — both work. Add `?sslmode=require` if it’s not already there.

3. **Run schema + seed from your machine**
   - In your project folder, set the URL and run (replace the placeholder with your real URI):

   **Windows Cmd:**
   ```cmd
   set DATABASE_URL=postgresql://postgres.[ref]:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres?sslmode=require
   npm run db:setup
   ```

   **PowerShell:**
   ```powershell
   $env:DATABASE_URL="postgresql://postgres.[ref]:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres?sslmode=require"
   npm run db:setup
   ```

   You should see:
   - `✅ Schema applied successfully.` (or "already applied")
   - `✅ Demo user created...` and `✅ Sample reports added.` (or "already exists")

4. **Use the same URL in your app**
   - In **Vercel** (or Render, etc.): **Settings** → **Environment Variables** → add **DATABASE_URL** with this same URI.
   - Redeploy so the app uses this database.

---

## Option B: Vercel Postgres (if you deploy on Vercel)

1. In **Vercel** → your project → **Storage** → **Create Database** → **Postgres** → Create.
2. Open the new DB → **.env.local** tab → copy the `POSTGRES_URL` line.
3. **From your PC** (to run schema + seed), set that as **DATABASE_URL** and run:
   ```bash
   set DATABASE_URL=<paste POSTGRES_URL here>
   npm run db:setup
   ```
4. The same `POSTGRES_URL` is usually auto-injected as **DATABASE_URL** for your Vercel app; if not, add **DATABASE_URL** with that value in Environment Variables.

---

## Option C: Neon (Free)

1. Go to **https://neon.tech** → Sign up → **New project**.
2. Copy the connection string (Connection string → copy).
3. Set it and run:
   ```bash
   set DATABASE_URL=<paste connection string>
   npm run db:setup
   ```
4. Add the same **DATABASE_URL** in your host (Vercel/Render) env.

---

## What the commands do

| Command | What it does |
|--------|----------------|
| `npm run db:init:online` | Creates all tables (users, reports, rewards, etc.) from `schema-online.sql`. Safe to run again (existing tables are skipped). |
| `npm run db:seed` | Adds a demo user (phone **9876543210**, password **demo1234**) and 2 sample reports if the DB is empty. Safe to run again. |
| `npm run db:setup` | Runs both: schema then seed. Use this for a full one-time setup. |

---

## After setup

- **Login:** Use phone **9876543210** and password **demo1234** (if you ran the seed).
- **New users:** Anyone can register with their own phone and password.
- **Database is ready** for your live app (Vercel, Render, etc.) as long as **DATABASE_URL** is set there to this same database.

If you see connection or SSL errors, ensure the URL includes `?sslmode=require` (Supabase/Neon often need it).
