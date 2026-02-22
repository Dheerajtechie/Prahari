# Put Prahari Online — Step-by-Step (No Expert Needed)

**Goal:** Your app live on the internet at a URL like `https://prahari-xxxx.onrender.com`. Anyone can open it, register, and use it.

**Time:** About 15 minutes.  
**Cost:** Free (Render free tier).

---

## Part 1: Put Your Code on GitHub

1. **Create a GitHub account** (if you don’t have one): https://github.com/signup  
2. **Install Git** (if needed): https://git-scm.com/download/win — install with defaults.  
3. **Open Command Prompt or PowerShell** and go to your project folder:
   ```text
   cd /d "D:\projects practical application\Prahari"
   ```
4. **Create a new repo and push** (replace `YOUR_USERNAME` with your GitHub username):
   ```text
   git init
   git add .
   git commit -m "Prahari app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/prahari.git
   git push -u origin main
   ```
   When it asks for login, use your GitHub username and a **Personal Access Token** (not your password):  
   GitHub → Settings → Developer settings → Personal access tokens → Generate new token → give it “repo” → copy the token and paste it when Git asks for password.

---

## Part 2: Create the Database (Render PostgreSQL)

1. Go to **https://render.com** and **Sign up** (free, use GitHub to sign in).  
2. In the dashboard click **New +** → **PostgreSQL**.  
3. Set:
   - **Name:** `prahari-db`
   - **Region:** Oregon (or nearest)
   - **Plan:** Free
4. Click **Create Database**.  
5. Wait until the status is **Available**.  
6. Open the database; go to **Info** or **Connection**.  
   - Copy **Internal Database URL** (starts with `postgresql://`).  
   - If you will run the schema from your PC, copy **External Database URL** instead.  
   Save this somewhere (e.g. Notepad); you’ll use it as `DATABASE_URL`.

---

## Part 3: Run the Schema (Create Tables)

You only need to do this once.

1. On your PC, open the project folder in Command Prompt/PowerShell.  
2. Set the database URL (paste your **External** Database URL from Render):
   - **Windows (Cmd):**
     ```text
     set DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
     ```
   - **Windows (PowerShell):**
     ```text
     $env:DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
     ```
   Use the **exact** URL Render gave you (with your user, password, host, db name).  
3. Run the online schema:
   ```text
   npm run db:init:online
   ```
   You should see: **Schema applied successfully.**

---

## Part 4: Deploy the App (Render Web Service)

1. In Render dashboard click **New +** → **Web Service**.  
2. **Connect** your GitHub account if asked, then choose the **prahari** repo.  
3. Set:
   - **Name:** `prahari`
   - **Region:** Same as the database (e.g. Oregon)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Click **Advanced** and add **Environment Variables**:
   - **Key:** `DATABASE_URL`  
     **Value:** Paste the **Internal Database URL** from your Render PostgreSQL (from Part 2).  
   - **Key:** `JWT_SECRET`  
     **Value:** Any long random string (e.g. copy this and change a few letters):  
     `prahari-secret-key-change-this-in-production-64-chars-long-abc123`
5. Click **Create Web Service**.  
6. Wait for the first deploy to finish (a few minutes). When it’s green, you’ll see something like:
   **Your service is live at https://prahari-xxxx.onrender.com**

---

## Part 5: See Your App Online

1. Open that URL in your browser (e.g. `https://prahari-xxxx.onrender.com`).  
2. You should see the **Prahari** app (dark theme, orange).  
3. Click through the intro → **Register** → enter name, phone (e.g. 9876543210), password.  
4. After signup you can:
   - File a report (orange + button)
   - Open **Mine** to see your profile and reports
   - Use **Rewards** and **Impact**

That’s your app, **fully working online**.

---

## If Something Goes Wrong

- **“Application failed to respond” / 503**  
  Wait 1–2 minutes and refresh. On free tier the app may sleep; the first load can be slow.

- **“Login failed” / “Invalid”**  
  Make sure you ran **Part 3** (schema) with the **External** Database URL. Without the schema, login won’t work.

- **Database connection error in logs**  
  In the Web Service, check that `DATABASE_URL` is the **Internal** Database URL from the same Render account (not External, not from another provider).

- **Build failed**  
  Ensure in GitHub you have `package.json`, `prahari-server.js`, `index.html` (or `prahari-app.html`), and the rest of the project. Then trigger a new deploy on Render.

---

## Summary

| Step | What you did | Result |
|------|----------------|--------|
| 1 | Code on GitHub | Repo: github.com/YOUR_USERNAME/prahari |
| 2 | Render PostgreSQL | Database created, you have DATABASE_URL |
| 3 | Run schema | Tables created in that database |
| 4 | Render Web Service | App deployed, live URL |
| 5 | Open URL | App works online for everyone |

**Your live URL is the “output” — share it and use the app from any device.**
