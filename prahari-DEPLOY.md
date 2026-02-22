# 🇮🇳 PRAHARI — Complete Deployment & Launch Guide

## Files in this package:
- `index.html`   → Complete frontend (deployable immediately to any host)
- `server.js`    → Node.js Express backend API (production-ready)
- `schema.sql`   → Full PostgreSQL database schema
- `package.json` → Backend dependencies
- `.env.example` → All environment variables you need to set

---

## ⚡ FASTEST WAY TO LAUNCH (30 minutes)

### STEP 1 — Deploy Frontend (5 minutes, FREE)

**Option A: Netlify (Recommended)**
1. Go to netlify.com → Sign up free
2. Drag and drop your `index.html` file into the Netlify dashboard
3. Your app is live at `something.netlify.app`
4. Add custom domain: `prahari.in` from domain settings

**Option B: Vercel**
1. Go to vercel.com → Sign up with GitHub
2. Click "Add New Project" → Upload `index.html`
3. Live in 30 seconds

**Option C: GitHub Pages (100% Free)**
1. Create a GitHub repo named `prahari`
2. Upload `index.html`
3. Go to Settings → Pages → Source: main branch → Save
4. Live at `yourusername.github.io/prahari`

---

### STEP 2 — Set Up Database (10 minutes, FREE)

**Use Supabase (FREE tier = 500MB, perfect to start)**

1. Go to supabase.com → Create new project → Name: "prahari"
2. Go to SQL Editor → Paste entire contents of `schema.sql` → Run
3. Copy your connection string from Settings → Database → Connection String
4. It looks like: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`

---

### STEP 3 — Deploy Backend (10 minutes, FREE)

**Use Railway (FREE $5/month credit)**

1. Go to railway.app → Sign up with GitHub
2. Click "New Project" → Deploy from GitHub repo
3. Upload `server.js`, `package.json`, `.env.example`
4. Add environment variables (copy from `.env.example`, fill in your values)
5. Railway auto-deploys. Copy your API URL (e.g., `https://prahari-api.up.railway.app`)

**Alternative: Render.com (also free)**
1. render.com → New → Web Service
2. Connect GitHub repo
3. Build: `npm install`, Start: `node server.js`
4. Add environment variables

---

### STEP 4 — Connect Frontend to Backend

In your `index.html`, find this line near the top of the script:
```js
const API_URL = window.PRAHARI_API_URL || "https://api.prahari.in/v1";
```
Change it to your Railway/Render URL:
```js
const API_URL = "https://your-prahari-api.up.railway.app/api";
```
Redeploy frontend.

---

### STEP 5 — Get Your Domain (₹800–₹1,200/year)

1. Buy `prahari.in` from GoDaddy, Namecheap, or BigRock
2. Point it to Netlify (add CNAME record)
3. Netlify auto-generates free HTTPS/SSL certificate

---

## 🔑 ESSENTIAL ACCOUNTS TO CREATE (all free tiers available)

| Service | Purpose | Cost | Link |
|---------|---------|------|------|
| **Netlify** | Frontend hosting | Free | netlify.com |
| **Railway** | Backend hosting | Free $5/mo credit | railway.app |
| **Supabase** | PostgreSQL database | Free 500MB | supabase.com |
| **Cloudinary** | Photo/video storage | Free 25GB | cloudinary.com |
| **Fast2SMS** | Indian OTP/SMS | ₹1/SMS | fast2sms.com |
| **Anthropic** | AI verification | Pay per use | console.anthropic.com |
| **SendGrid** | Email notifications | Free 100/day | sendgrid.com |
| **Razorpay** | UPI reward payouts | 2% per txn | razorpay.com |

---

## 🔒 SECURITY CHECKLIST (Do Before Launch)

### Must Do:
- [ ] Set a strong, random JWT_SECRET (min 64 chars)
- [ ] Enable HTTPS (Netlify does this automatically)  
- [ ] Set CORS to only allow your domain (not `*`)
- [ ] Add rate limiting (already in server.js)
- [ ] Enable Supabase Row Level Security (already in schema.sql)
- [ ] Never commit `.env` to GitHub (add to `.gitignore`)
- [ ] Set up database backups in Supabase (Settings → Database → Backups)

### Strongly Recommended:
- [ ] Enable 2FA on all service accounts (Netlify, Railway, Supabase)
- [ ] Set up error monitoring (Sentry.io — free tier)
- [ ] Enable Cloudflare for DDoS protection (free)
- [ ] Regular dependency updates: `npm audit` weekly

### For Scale (when you have 10K+ users):
- [ ] Add Redis for session management
- [ ] Enable database connection pooling (PgBouncer)
- [ ] Set up CDN for media files
- [ ] Implement proper logging (Papertrail/Logtail)
- [ ] Database read replicas for heavy read traffic

---

## 🤖 ENABLE AI VERIFICATION (Anthropic Claude)

In `server.js`, find `runAIVerification()` function and uncomment the Anthropic code:

```js
const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const msg = await client.messages.create({
  model: "claude-haiku-4-5-20251001",  // fast + cheap
  max_tokens: 200,
  messages: [{
    role: "user",
    content: `Analyze this civic report for India. Return JSON only:
    {"credibility": 0-100, "priority": "CRITICAL|HIGH|MEDIUM|LOW", "isGenuine": bool, "concerns": []}
    
    Category: ${category}
    Title: "${title}"
    Location: "${location}"
    Description: "${desc || 'N/A'}"`
  }]
});
return JSON.parse(msg.content[0].text);
```

Cost: ~$0.0001 per report analysis with Haiku model. For 10,000 reports = ~$1.

---

## 🏗️ FULL TECH STACK (Production Architecture)

```
User's Phone/Browser
        ↓
   Cloudflare CDN      ← DDoS protection, SSL, caching
        ↓
   Netlify (Frontend)  ← index.html, static assets
        ↓
   Railway (API)       ← server.js (Node.js + Express)
        ↓
   Supabase (DB)       ← PostgreSQL + auth + realtime
        ↓
Third-party Services:
  ├── Cloudinary       ← Photo/video storage
  ├── Anthropic API    ← AI verification
  ├── Fast2SMS         ← OTP authentication  
  ├── Razorpay         ← UPI reward payouts
  ├── SendGrid         ← Email notifications
  └── Polygon RPC      ← Blockchain record
```

---

## 📱 CONVERT TO MOBILE APP

To turn this into a proper Android/iOS app:

**Option 1: PWA (Easiest — 1 day)**
Add to your `index.html` `<head>`:
```html
<link rel="manifest" href="manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```
Users can "Add to Home Screen" — feels like a native app.

**Option 2: Capacitor (Best — 1 week)**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init Prahari in.prahari.app
npx cap add android
npx cap copy
npx cap open android  # Opens in Android Studio
```
Upload to Google Play Store (₹1,750 one-time fee).

---

## 💰 COST TO RUN (Monthly)

| Stage | Users | Monthly Cost |
|-------|-------|-------------|
| Launch | 0–5,000 | ₹0–₹500 (all free tiers) |
| Growth | 5K–50K | ₹2,000–₹8,000 |
| Scale | 50K–500K | ₹15,000–₹50,000 |
| Enterprise | 500K+ | ₹1,00,000+ (but revenue > cost) |

---

## 🚀 REVENUE MODEL (How You Make Money)

**Month 1–3: Focus only on growth, zero monetization**

**Month 4 onwards:**

1. **Government Dashboard Subscriptions** (₹2–10 Cr/year per municipal corp)
   - Real-time civic intelligence dashboard
   - Pitch to Pune, Bengaluru, Hyderabad smart city projects

2. **Corporate CSR Sponsorships** (₹10–50 Lakh/quarter)
   - "Sponsor a City" reward pool model
   - Approach Tata, Infosys, HUL CSR departments

3. **Prahari Premium** (₹499/month for journalists, NGOs, lawyers)
   - Bulk RTI filing, advanced analytics, legal templates

4. **Data Intelligence** (sanitized civic data reports sold to urban planners)

**Month 12 target: ₹10–20 Lakh/month revenue**

---

## 📞 SUPPORT & NEXT STEPS

When you're ready, I can build for you:
- [ ] Complete mobile app (React Native)
- [ ] Admin moderation dashboard
- [ ] Government API integration
- [ ] Real blockchain smart contract (Polygon)
- [ ] Investor pitch deck
- [ ] Government proposal letter
- [ ] Press kit for media outreach

Just say the word.

**Created by:** PRAHARI Development Team  
**Version:** 1.0.0  
**License:** Proprietary

---
*"Ek Prahari, ek shuruaat. Crores of Praharis, ek naya Bharat."*  
*One guardian, one beginning. Crores of guardians, a new India.*
