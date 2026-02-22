# Exactly What to Do in Supabase (Nothing Else)

You do **not** create tables or run SQL inside Supabase. You only get one thing: the **database connection URL**. The project scripts create all tables when you run them from your PC.

---

## In Supabase (browser)

1. Open: **https://vqrmqgbmqlhqnjlalokd.supabase.co**
2. Log in if needed.
3. Click **Project Settings** (gear icon, bottom of the left sidebar).
4. Click **Database** in the left menu.
5. Scroll to **Connection string**.
6. Click the **URI** tab. You may see **Session** (port 5432) or **Transaction** (pooler). Either works.
7. For your project the URI looks like:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.vqrmqgbmqlhqnjlalokd.supabase.co:5432/postgres
   ```
8. Click **Copy**, paste into Notepad.
9. Replace **`[YOUR-PASSWORD]`** with your **database password** (the one you set in Project Settings → Database when you created the project).  
   **Important:** Use the **database password**, not the anon key or API key. If you forgot it: same page → **Reset database password** → set a new one → use that in the URL.
10. At the **end** of the URL add: **`?sslmode=require`**  
    Final URL example:
    ```text
    postgresql://postgres:YourDbPassword123@db.vqrmqgbmqlhqnjlalokd.supabase.co:5432/postgres?sslmode=require
    ```
11. Save this full URL. Use it in the next step and in Vercel.

**That is all you do in Supabase.** No SQL, no tables, no “add” — only copy URI, set password in it, add `?sslmode=require`.

---

## On your PC (PowerShell) — run everything

1. Open **PowerShell**.
2. Go to the project:
   ```powershell
   cd "d:\projects practical application\Prahari"
   ```
3. Install dependencies (once):
   ```powershell
   npm install
   ```
4. Set the URL (paste **your** full URL from above between the quotes; use your real **database password**):
   ```powershell
   $env:DATABASE_URL="postgresql://postgres:YOUR_DATABASE_PASSWORD@db.vqrmqgbmqlhqnjlalokd.supabase.co:5432/postgres?sslmode=require"
   ```
5. Run the full database setup:
   ```powershell
   npm run db:setup
   ```

---

## Output you should see (success)

When the URL and password are correct, you will see something like:

```text
✅ Schema applied successfully.
✅ Demo user created: phone 9876543210, password demo1234
✅ Sample reports added.
✅ Database seed complete.
```

If you run it again later you might see:

```text
✅ Schema applied successfully.
ℹ️ Demo user already exists (phone 9876543210).
ℹ️ Reports already exist, skipping seed.
✅ Database seed complete.
```

That’s normal.

---

## If you see an error

- **"Missing DATABASE_URL"** → You didn’t set `$env:DATABASE_URL` in this PowerShell window, or the line was wrong. Do step 4 again, then step 5.
- **"password authentication failed"** → Wrong password in the URL. Reset DB password in Supabase (Project Settings → Database) and use the new one in the URL.
- **"connect ECONNREFUSED" / "SSL"** → Make sure the URL ends with `?sslmode=require` and you’re using the **URI** from Supabase (port 6543 pooler or 5432 direct).

---

## After it works

- **Vercel:** In your Vercel project → Settings → Environment Variables → add **DATABASE_URL** (same URL) and **JWT_SECRET** (any long random string) → Save → Redeploy.
- **Login:** Phone **9876543210**, password **demo1234**.
