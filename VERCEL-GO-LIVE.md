# Make Prahari Live on Vercel

Follow these steps to deploy and go live. Do them in order.

---

## 1. Push code to GitHub

If the project is not in a Git repo yet:

```powershell
cd "d:\projects practical application\Prahari"
git init
git add .
git commit -m "Prahari production ready"
```

Create a new repository on **GitHub** (e.g. `prahari`), then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/prahari.git
git branch -M main
git push -u origin main
```

If you already have a repo, just push:

```powershell
git add .
git commit -m "Production ready for Vercel"
git push
```

---

## 2. Add environment variables on Vercel

1. Go to **https://vercel.com** and sign in.
2. **Add New** → **Project** (or open the existing Prahari project if you already imported it).
3. **Import** your GitHub repo (e.g. `YOUR_USERNAME/prahari`).
4. Before deploying, go to **Settings** → **Environment Variables**.
5. Add these (use **Production** and **Preview**):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Your full Supabase Postgres URL (same as in `.env`). If the password has `@`, use `%40` in the URL. Example: `postgresql://postgres:xxx%40yyy@db.vqrmqgbmqlhqnjlalokd.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | Same as in your `.env`, or any long random string (e.g. 32+ characters). |

6. Click **Save**.

---

## 3. Deploy

1. In the project, go to **Deployments**.
2. Click **Redeploy** on the latest deployment (or trigger a new deploy from the **Deploy** tab).
3. Wait for the build to finish. You’ll get a URL like `https://prahari-xxx.vercel.app`.

---

## 4. Check that it’s live

1. **Homepage:** Open `https://YOUR-PROJECT.vercel.app` — you should see the Prahari app.
2. **API health:** Open `https://YOUR-PROJECT.vercel.app/api/health` — you should see:
   ```json
   {"status":"ok","db":"connected","ts":"..."}
   ```
3. **Login:** Use phone **9876543210**, password **demo1234** (if you ran the seed).

If `/api/health` shows `"db":"disconnected"`, check that `DATABASE_URL` on Vercel is correct and has `?sslmode=require` at the end.

---

## Summary

- **Repo:** Code on GitHub (main branch).
- **Vercel:** Project linked to that repo; `DATABASE_URL` and `JWT_SECRET` set in Environment Variables.
- **Deploy:** Redeploy so the new env vars are used.
- **Live URL:** Use the Vercel project URL (e.g. `https://prahari-theta.vercel.app`).

Your app is production-ready: Helmet, CORS, rate limiting, JWT auth, and Supabase SSL are configured. Once the env vars are set and you redeploy, the app is live.
