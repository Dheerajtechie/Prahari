# Deploy Prahari on Vercel (Live in Minutes)

Get your app live at **https://prahari-xxx.vercel.app** — frontend and API both on Vercel.

---

## What You Need

1. **GitHub account** — https://github.com/signup  
2. **Vercel account** — https://vercel.com/signup (sign in with GitHub)  
3. **A PostgreSQL database** — free options:  
   - **Vercel Postgres** (in Vercel dashboard: Storage → Create Database → Postgres)  
   - or **Supabase** — https://supabase.com → New Project → get connection string  

---

## Step 1: Push Your Code to GitHub

In Command Prompt or PowerShell, go to your project folder and run (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd /d "D:\projects practical application\Prahari"
git init
git add .
git commit -m "Prahari app for Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/prahari.git
git push -u origin main
```

If Git asks for login, use your GitHub username and a **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens → Generate, scope: repo).

---

## Step 2: Create the Database and Get the URL

**Option A — Vercel Postgres**

1. Go to https://vercel.com/dashboard  
2. Open your project (or we’ll create it in Step 3).  
3. **Storage** → **Create Database** → **Postgres** → Create.  
4. After it’s created, open it → ****.env.local**` tab.  
5. Copy the line that looks like:  
   `POSTGRES_URL="postgres://default:xxx@xxx.pooler.supabase.com:5432/verceldb"`  
   That’s your **DATABASE_URL** (same value).

**Option B — Supabase**

1. Go to https://supabase.com → New Project.  
2. When it’s ready: **Project Settings** → **Database** → **Connection string** → **URI**.  
3. Copy the URI (replace the password placeholder with your DB password).  
   That’s your **DATABASE_URL**.

---

## Step 3: Run the Schema (Create Tables)

Run this **once** so the database has tables.

1. Open the project folder in terminal.  
2. Set your database URL (paste your real URL):

   **Windows Cmd:**
   ```bash
   set DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
   ```

   **PowerShell:**
   ```powershell
   $env:DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
   ```

3. Run:
   ```bash
   npm run db:init:online
   ```
   You should see: **Schema applied successfully.**

---

## Step 4: Deploy on Vercel

1. Go to **https://vercel.com/new**  
2. **Import** your GitHub repo **prahari** (connect GitHub if asked).  
3. **Configure Project:**
   - **Framework Preset:** Other  
   - **Root Directory:** (leave blank)  
   - **Build Command:** leave empty  
   - **Output Directory:** leave empty  
   - **Install Command:** `npm install` (or leave default)  

4. **Environment Variables** — click **Add** and add:

   | Name           | Value                                                                 |
   |----------------|-----------------------------------------------------------------------|
   | `DATABASE_URL` | Your Postgres URL from Step 2 (Vercel Postgres or Supabase).          |
   | `JWT_SECRET`   | A long random string, e.g. `prahari-jwt-secret-change-in-production-64chars-long-abc123` |

5. Click **Deploy**.  
6. Wait for the build to finish (1–2 minutes).

---

## Step 5: Your App Is Live

When the deployment is done you’ll see something like:

**Congratulations! Your project has been deployed.**  
**https://prahari-xxxx.vercel.app**

- Open that URL in your browser.  
- You should see the Prahari app (dark theme, orange).  
- Use **Register** (e.g. name, phone 9876543210, password) → then sign in and use the app.

The **same URL** serves:
- **/** — the app (index.html)  
- **/api/*** — login, reports, rewards, etc.  

No separate API URL to set; it’s all on one domain.

---

## Redeploy After Code Changes

If you pulled fixes or changed code:

1. Push to GitHub: `git add .` → `git commit -m "Update"` → `git push`
2. Vercel will auto-redeploy (or go to Vercel dashboard → Deployments → Redeploy).

---

## If Something Fails

- **Build error / Function size**  
  Ensure `serverless-http` is in `package.json` and run `npm install` locally once.

- **“Application error” or 500 when using the app**  
  - Check that **DATABASE_URL** and **JWT_SECRET** are set in Vercel (Project → Settings → Environment Variables).  
  - Confirm you ran **Step 3** (schema) so the database has tables.

- **“Login failed” / “Invalid”**  
  Schema was not applied. Run Step 3 again with the same **DATABASE_URL** you use in Vercel.

- **Cold start**  
  On the free tier, the first request after idle can take a few seconds. Refresh if needed.

---

## Summary

| Step | What you did              | Result                    |
|------|----------------------------|---------------------------|
| 1    | Push code to GitHub        | Repo: github.com/you/prahari |
| 2    | Create Postgres (Vercel or Supabase) | DATABASE_URL          |
| 3    | Run `npm run db:init:online` | Tables created         |
| 4    | Deploy on Vercel + add env vars | Build and deploy     |
| 5    | Open the Vercel URL       | App live on Vercel        |

Your live link is the **output** — e.g. **https://prahari-xxxx.vercel.app**.
