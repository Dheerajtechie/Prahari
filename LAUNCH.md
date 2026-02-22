# Launch Prahari — Do Everything

Follow these steps **in order**. After this, open **http://localhost:3001** and use the app.

---

## Option A: With Docker (recommended — database included)

1. **Start the database**
   ```bash
   docker-compose up -d
   ```
   Wait ~10 seconds for PostgreSQL to be ready.

2. **Apply the schema**
   ```bash
   npm run db:init
   ```
   You should see: `✅ Schema applied successfully.`

3. **Install dependencies** (if you haven’t already)
   ```bash
   npm install
   ```

4. **Start the app**
   ```bash
   npm start
   ```
   You should see: `✅ Prahari API running on port 3001`

5. **Open in browser**
   - Go to **http://localhost:3001**
   - Complete onboarding → Register (use any 10-digit Indian mobile e.g. 9876543210 and a password) → File a report, check Rewards and Dashboard.

---

## Option B: Without Docker (you have your own PostgreSQL)

1. Create a database and get its URL (e.g. from Supabase, Railway, or local Postgres).

2. **Set environment**
   - Copy `.env.example` to `.env` (or use the existing `.env`).
   - Set `DATABASE_URL=postgresql://user:password@host:5432/prahari`.
   - Set `JWT_SECRET` to a long random string (e.g. 64+ hex characters).

3. **Apply the schema**
   ```bash
   npm run db:init
   ```

4. **Install and start**
   ```bash
   npm install
   npm start
   ```

5. Open **http://localhost:3001**.

---

## If something fails

- **"Schema error" or "relation already exists"**  
  The schema was already applied. You can ignore or drop the database and run `npm run db:init` again.

- **"Connection refused" or "database does not exist"**  
  Start Docker with `docker-compose up -d` and wait, or fix `DATABASE_URL` in `.env`.

- **"Authentication required" in the app**  
  Register first (Register tab, name + phone + password), then sign in.

- **Port 3001 in use**  
  Set `PORT=3002` (or another port) in `.env` and restart; then open `http://localhost:3002`.

---

**You’re done.** The app and API are running; use the same flow to deploy to a server (see README.md).
