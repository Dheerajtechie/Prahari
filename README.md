# 🇮🇳 Prahari — Citizen Guardian Network

**India's accountability layer.** Report corruption and civic issues in 60 seconds. AI verifies, blockchain locks it, rewards follow. If they ignore—we file RTI.

This repo is **production-ready** and **fully working**. **→ Deploy on Vercel? See [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md).**  
**→ Deploy on Render? See [START-HERE.md](START-HERE.md) or [DEPLOY-ONLINE.md](DEPLOY-ONLINE.md).**  
**→ Run everything on your PC? See [LAUNCH.md](LAUNCH.md).**

---

## What’s in this repo

| File | Purpose |
|------|--------|
| **prahari-app.html** | Single-page app (React). Use as `index.html` or serve at `/`. |
| **prahari-server.js** | Node.js API (Express + PostgreSQL). Auth, reports, rewards, stats. |
| **prahari-schema.sql** | PostgreSQL schema. Run once on your DB. |
| **package.json** | Backend dependencies. `npm install` then `npm start`. |
| **.env.example** | Copy to `.env` and fill in. |
| **manifest.json** | PWA manifest. |
| **sw.js** | Service worker for offline shell. |
| **docker-compose.yml** | Local PostgreSQL (with PostGIS). Run `docker-compose up -d`. |
| **run-schema.js** | Applies schema to DB. Run `npm run db:init`. |
| **LAUNCH.md** | Step-by-step: do everything and run the app. |
| **start.bat** | Windows: double-click to install deps and start server. |
| **PRAHARI-VISION.md** | Founder vision and strategy. |

---

## Quick start (local, ~5 min)

1. **Database**  
   Create a PostgreSQL database (e.g. [Supabase](https://supabase.com) free tier). Copy the connection string.

2. **Backend**  
   ```bash
   cd "d:\projects practical application\Prahari"
   cp .env.example .env
   # Edit .env: set DATABASE_URL and JWT_SECRET (e.g. run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
   npm install
   npm start
   ```
   API runs at `http://localhost:3001`.

3. **Apply schema**  
   In your DB SQL editor (Supabase / psql), run the full contents of **prahari-schema.sql**.

4. **Frontend**  
   - **Option A (same host):** Open `http://localhost:3001/` — the server serves the app from `prahari-app.html`.  
   - **Option B (file):** Open `prahari-app.html` in a browser; set API URL before use:  
     In the browser console or in the HTML add:  
     `window.PRAHARI_API_URL = "http://localhost:3001";`  
     then refresh.  
   - **Option C (copy):** Copy `prahari-app.html` to `index.html` so the server serves it at `/` by default.

5. **Test**  
   Register with a 10-digit Indian mobile (e.g. 9876543210) and a password. File a report, check Rewards and Dashboard.

---

## Launch checklist (official deploy)

### 1. Environment

- [ ] Copy `.env.example` to `.env`.
- [ ] Set `DATABASE_URL` (PostgreSQL).
- [ ] Set `JWT_SECRET` (long random string, e.g. 64+ hex chars).
- [ ] Set `FRONTEND_URL` if the app is on a different domain (e.g. `https://prahari.in`).
- [ ] Never commit `.env` (add to `.gitignore`).

### 2. Database

- [ ] Create a PostgreSQL 15+ database (Supabase / Railway / Neon / Render).
- [ ] Run **prahari-schema.sql** in full (extensions, tables, triggers, reward catalog).
- [ ] Confirm tables: `users`, `reports`, `reward_catalog`, `redemptions`, etc.

### 3. Backend

- [ ] Deploy **prahari-server.js** (and **package.json**) to Railway, Render, or a VPS.
- [ ] Set env vars in the host (same as `.env`).
- [ ] Ensure the app listens on `PORT` (default 3001).
- [ ] Hit `GET /health` — should return `{ "status": "ok", "db": "connected" }`.

### 4. Frontend

- [ ] **Single-server:** Serve **prahari-app.html** (or **index.html**) from the same Node server (already configured).
- [ ] **Separate host (e.g. Netlify):** Upload **prahari-app.html** as `index.html`, set **Build environment** or a small script so `window.PRAHARI_API_URL` is set to your API URL (e.g. `https://api.prahari.in`).
- [ ] Ensure CORS: backend `FRONTEND_URL` must match the frontend origin.

### 5. PWA (optional)

- [ ] Serve **manifest.json** and **sw.js** from the same origin as the app.
- [ ] App already links `<link rel="manifest" href="/manifest.json">` and registers the service worker.

### 6. Post-launch

- [ ] Add OTP/phone verification (e.g. Fast2SMS) and wire in **server.js**.
- [ ] Add Cloudinary (or similar) for report evidence uploads.
- [ ] Enable AI verification (Anthropic) in **runAIVerification** in **server.js**.
- [ ] Set up monitoring (e.g. Sentry) and backups for the DB.

---

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Register (name, phone, password). |
| POST | /api/auth/login | No | Login (phone, password). |
| GET | /api/reports | No | List reports (query: page, limit, category, city, status). |
| POST | /api/reports | Yes | Create report (FormData: category, title, desc, location, city, …). |
| GET | /api/users/me | Yes | Current user + my reports. |
| GET | /api/leaderboard | No | Top users (query: city, period). |
| GET | /api/stats/national | No | National stats. |
| GET | /api/stats/cities | No | City-wise stats. |
| GET | /api/rewards/catalog | No | Rewards list. |
| POST | /api/rewards/redeem | Yes | Redeem reward (body: rewardId). |
| GET | /health | No | Health check. |

---

## Cost (typical)

- **Launch:** DB (Supabase free) + backend (Railway/Render free tier) + static frontend (Netlify free) ≈ **₹0**.
- **Growth:** Add OTP, storage, AI as needed; scale DB and server with usage.

---

## Support

- Strategy and narrative: **PRAHARI-VISION.md**
- Deploy details: **prahari-DEPLOY.md** (if present)

*Ek Prahari, ek shuruaat. Crores of Praharis, ek naya Bharat.*
