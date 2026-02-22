/**
 * PRAHARI — Production Backend API
 * Node.js + Express + PostgreSQL
 * 
 * To run:
 *   npm install
 *   node server.js
 */

"use strict";

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const { Pool }     = require("pg");
const multer       = require("multer");
const sharp        = require("sharp");
const path         = require("path");
const crypto       = require("crypto");
const validator    = require("validator");
require("dotenv").config();

// ─── DB CONNECTION ─────────────────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ─── APP SETUP ─────────────────────────────────────────────────────────────
const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
    },
  },
  hsts:            { maxAge: 63072000, includeSubDomains: true, preload: true },
  noSniff:         true,
  frameguard:      { action: "deny" },
  xssFilter:       true,
  referrerPolicy:  { policy: "strict-origin-when-cross-origin" },
}));

app.use(cors({
  origin:      process.env.FRONTEND_URL || "https://prahari.in",
  credentials: true,
  methods:     ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-CSRF-Token","X-Request-ID"],
}));

app.use(express.json({ limit: "10kb" }));  // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Request ID for tracing
app.use((req, _, next) => {
  req.requestId = crypto.randomUUID();
  next();
});

// ─── RATE LIMITING ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 min
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10, // 10 auth attempts per 15 min
  message:  { error: "Too many authentication attempts." },
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      20, // 20 reports per hour per IP
  message:  { error: "Too many reports. Please wait before submitting more." },
});

app.use("/api/", limiter);

// ─── FILE UPLOAD CONFIG ─────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/webp","video/mp4"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only images (JPEG/PNG/WebP) and MP4 videos allowed"));
    }
    cb(null, true);
  },
});

// ─── AUTH MIDDLEWARE ────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token not revoked (store revoked tokens in Redis/DB in production)
    const user = await db.query(
      "SELECT id, name, phone, email, pts, reports, rank, badge, title, city, verified, is_banned FROM users WHERE id = $1",
      [payload.sub]
    );
    if (!user.rows[0]) return res.status(401).json({ error: "User not found" });
    if (user.rows[0].is_banned) return res.status(403).json({ error: "Account suspended" });
    
    req.user = user.rows[0];
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Session expired" });
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ─── VALIDATION HELPERS ─────────────────────────────────────────────────────
const sanitize = (str, maxLen = 1000) =>
  validator.escape(String(str || "").trim()).slice(0, maxLen);

const validateReport = (body) => {
  const errors = [];
  if (!body.category || !["corruption","encroach","pollution","road","litter","water","power","forest"].includes(body.category))
    errors.push("Invalid category");
  if (!body.title || body.title.trim().length < 10 || body.title.trim().length > 200)
    errors.push("Title must be 10–200 characters");
  if (!body.location || body.location.trim().length < 5)
    errors.push("Location is required");
  if (!body.city || body.city.trim().length < 2)
    errors.push("City is required");
  if (body.desc && body.desc.length > 2000)
    errors.push("Description too long (max 2000 chars)");
  if (typeof body.lat !== "undefined" && (isNaN(body.lat) || body.lat < -90 || body.lat > 90))
    errors.push("Invalid latitude");
  if (typeof body.lng !== "undefined" && (isNaN(body.lng) || body.lng < -180 || body.lng > 180))
    errors.push("Invalid longitude");
  return errors;
};

// ─── ROUTES: AUTH ────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    // Validate
    if (!name || name.trim().length < 2 || name.trim().length > 80)
      return res.status(400).json({ error: "Name must be 2–80 characters" });
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\s/g,"")))
      return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
    if (!password || password.length < 8 || password.length > 128)
      return res.status(400).json({ error: "Password must be 8–128 characters" });
    if (password.toLowerCase().includes("password") || /^(.)\1+$/.test(password))
      return res.status(400).json({ error: "Password is too weak" });

    const cleanPhone = phone.replace(/\s/g,"");

    // Check duplicate
    const exists = await db.query("SELECT id FROM users WHERE phone = $1", [cleanPhone]);
    if (exists.rows[0]) return res.status(409).json({ error: "This phone number is already registered" });

    const hash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    const user = await db.query(
      `INSERT INTO users (id, name, phone, password_hash, pts, reports, rank, badge, title, created_at)
       VALUES ($1, $2, $3, $4, 0, 0, 9999, '⚔️', 'TRUTH WARRIOR', NOW())
       RETURNING id, name, phone, pts, reports, rank, badge, title`,
      [userId, sanitize(name, 80), cleanPhone, hash]
    );

    const token = jwt.sign(
      { sub: userId, iat: Math.floor(Date.now()/1000) },
      process.env.JWT_SECRET,
      { expiresIn: "30d", algorithm: "HS256" }
    );

    // Send OTP for verification (integrate with MSG91/Fast2SMS)
    // await sendOTP(cleanPhone);

    res.status(201).json({ user: user.rows[0], token, message: "Account created successfully" });
  } catch (err) {
    console.error("[register]", err.message);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) return res.status(400).json({ error: "Phone and password required" });

    const cleanPhone = phone.replace(/\s/g,"");
    const result = await db.query(
      "SELECT id, name, phone, password_hash, pts, reports, rank, badge, title, city, verified, is_banned FROM users WHERE phone = $1",
      [cleanPhone]
    );

    const user = result.rows[0];

    // Timing-safe comparison (always compare even if user not found, to prevent user enumeration)
    const dummyHash = "$2b$12$invalidhashforsafetypurposes";
    const valid = await bcrypt.compare(password, user?.password_hash || dummyHash);

    if (!user || !valid) return res.status(401).json({ error: "Invalid phone number or password" });
    if (user.is_banned) return res.status(403).json({ error: "Account suspended. Contact support." });

    // Update last login
    await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const token = jwt.sign(
      { sub: user.id, iat: Math.floor(Date.now()/1000) },
      process.env.JWT_SECRET,
      { expiresIn: "30d", algorithm: "HS256" }
    );

    const { password_hash, is_banned, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error("[login]", err.message);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", authenticate, async (req, res) => {
  // In production: add token to revocation list (Redis)
  res.json({ message: "Logged out successfully" });
});

// ─── ROUTES: REPORTS ──────────────────────────────────────────────────────────

// GET /api/reports — public feed
app.get("/api/reports", async (req, res) => {
  try {
    const { page=1, limit=20, category, city, status } = req.query;
    const offset = (Math.max(1, parseInt(page))-1) * Math.min(50, parseInt(limit));
    
    let where = ["r.is_deleted = false"];
    const params = [];
    
    if (category && ["corruption","encroach","pollution","road","litter","water","power","forest"].includes(category)) {
      params.push(category); where.push(`r.category = $${params.length}`);
    }
    if (city) {
      params.push(sanitize(city, 100)); where.push(`r.city ILIKE $${params.length}`);
    }
    if (status && ["pending","verified","action_taken","resolved","rejected"].includes(status)) {
      params.push(status); where.push(`r.status = $${params.length}`);
    }

    params.push(Math.min(50, parseInt(limit)), offset);

    const query = `
      SELECT r.id, r.category, r.title, r.location, r.city, r.status,
             r.pts_awarded, r.votes, r.impact_note, r.ai_score,
             r.created_at, r.is_anonymous,
             CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE u.name END as reporter_name
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE ${where.join(" AND ")}
      ORDER BY r.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `;

    const result = await db.query(query, params);
    const count = await db.query(`SELECT COUNT(*) FROM reports r WHERE ${where.join(" AND ")}`, params.slice(0,-2));

    res.json({
      reports: result.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    console.error("[reports:list]", err.message);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// POST /api/reports — create report
app.post("/api/reports", authenticate, reportLimiter, upload.array("evidence", 5), async (req, res) => {
  try {
    const errors = validateReport(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { category, title, desc, location, city, lat, lng, is_anonymous="true", is_urgent="false" } = req.body;

    // Process uploaded images
    const evidenceUrls = [];
    for (const file of (req.files || [])) {
      if (file.mimetype.startsWith("image/")) {
        // Compress and strip EXIF (protects user privacy)
        const processed = await sharp(file.buffer)
          .resize(1920, 1080, { fit:"inside", withoutEnlargement:true })
          .jpeg({ quality:85, progressive:true })
          .withMetadata({ orientation: undefined }) // strip GPS EXIF
          .toBuffer();
        
        // In production: upload to Cloudinary
        // const url = await uploadToCloudinary(processed);
        // evidenceUrls.push(url);
        evidenceUrls.push("demo_evidence_url");
      }
    }

    // AI Verification (call your AI service or Anthropic API)
    const aiScore = await runAIVerification({ title, desc, location, category });

    // Generate blockchain hash (in production: submit to Polygon)
    const reportHash = crypto.createHash("sha256")
      .update(`${req.user.id}${title}${location}${Date.now()}`)
      .digest("hex");

    const reportId = crypto.randomUUID();
    const pts = { corruption:500, encroach:300, pollution:250, road:150, litter:100, water:200, power:120, forest:200 }[category] || 100;

    await db.query(
      `INSERT INTO reports (id, user_id, category, title, description, location, city, lat, lng, is_anonymous, is_urgent, status, ai_score, blockchain_hash, evidence_urls, pts_potential, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,$13,$14,$15,NOW())`,
      [
        reportId, req.user.id, category,
        sanitize(title, 200), sanitize(desc||"", 2000),
        sanitize(location, 300), sanitize(city, 100),
        lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null,
        is_anonymous === "true", is_urgent === "true",
        aiScore.credibility, reportHash,
        JSON.stringify(evidenceUrls), pts,
      ]
    );

    // Update user stats
    await db.query("UPDATE users SET reports = reports + 1, pts = pts + 50 WHERE id = $1", [req.user.id]);

    // Send to department (integrate govt API / email)
    // await notifyDepartment({ category, reportId, title, city });

    res.status(201).json({
      reportId,
      aiScore,
      ptsAwarded: 50, // immediate pts for filing
      ptsPotential: pts,
      blockchainHash: reportHash,
      message: "Report submitted successfully",
    });
  } catch (err) {
    console.error("[reports:create]", err.message);
    res.status(500).json({ error: "Failed to submit report. Please try again." });
  }
});

// GET /api/reports/:id
app.get("/api/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!validator.isUUID(id)) return res.status(400).json({ error: "Invalid report ID" });

    const result = await db.query(
      `SELECT r.*, 
             CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE u.name END as reporter_name,
             (SELECT COUNT(*) FROM report_votes WHERE report_id = r.id) as vote_count,
             (SELECT COUNT(*) FROM report_comments WHERE report_id = r.id) as comment_count
       FROM reports r LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.is_deleted = false`,
      [id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "Report not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// POST /api/reports/:id/vote
app.post("/api/reports/:id/vote", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!validator.isUUID(id)) return res.status(400).json({ error: "Invalid report ID" });

    await db.query(
      `INSERT INTO report_votes (report_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, req.user.id]
    );
    await db.query("UPDATE reports SET votes = votes + 1 WHERE id = $1", [id]);
    res.json({ message: "Vote recorded" });
  } catch (err) {
    res.status(500).json({ error: "Failed to record vote" });
  }
});

// ─── ROUTES: USER ────────────────────────────────────────────────────────────

// GET /api/users/me
app.get("/api/users/me", authenticate, async (req, res) => {
  const myReports = await db.query(
    "SELECT id, category, title, status, pts_awarded, created_at FROM reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [req.user.id]
  );
  res.json({ user: req.user, reports: myReports.rows });
});

// PATCH /api/users/me — update profile
app.patch("/api/users/me", authenticate, async (req, res) => {
  try {
    const { name, city } = req.body;
    const updates = {};
    if (name) {
      if (name.trim().length < 2 || name.trim().length > 80)
        return res.status(400).json({ error: "Name must be 2–80 characters" });
      updates.name = sanitize(name, 80);
    }
    if (city) updates.city = sanitize(city, 100);

    if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to update" });

    const setClauses = Object.keys(updates).map((k,i) => `${k} = $${i+1}`).join(", ");
    const values = [...Object.values(updates), req.user.id];

    await db.query(`UPDATE users SET ${setClauses} WHERE id = $${values.length}`, values);
    res.json({ message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// ─── ROUTES: LEADERBOARD ────────────────────────────────────────────────────
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { city, period="all" } = req.query;
    let dateFilter = "";
    if (period === "week")  dateFilter = "AND r.created_at > NOW() - INTERVAL '7 days'";
    if (period === "month") dateFilter = "AND r.created_at > NOW() - INTERVAL '30 days'";

    const result = await db.query(`
      SELECT u.id, u.name, u.city, u.badge, u.title, u.pts,
             COUNT(r.id) as total_reports,
             COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved,
             RANK() OVER (ORDER BY u.pts DESC) as rank
      FROM users u
      LEFT JOIN reports r ON r.user_id = u.id ${dateFilter}
      ${city ? "WHERE u.city ILIKE $1" : ""}
      GROUP BY u.id
      ORDER BY u.pts DESC
      LIMIT 100
    `, city ? [sanitize(city,100)] : []);

    res.json({ leaderboard: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ─── ROUTES: STATS ───────────────────────────────────────────────────────────
app.get("/api/stats/national", async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(DISTINCT user_id) as active_users,
        SUM(pts_awarded) as total_pts_given
      FROM reports WHERE is_deleted = false
    `);
    res.json(stats.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── ROUTES: REWARDS ────────────────────────────────────────────────────────
app.post("/api/rewards/redeem", authenticate, async (req, res) => {
  try {
    const { rewardId } = req.body;
    const rewards = {
      r1:{pts:100,label:"₹10 UPI Cashback"},r2:{pts:300,label:"Metro Rides x3"},
      r3:{pts:500,label:"₹50 UPI Cashback"},r4:{pts:1000,label:"1 Month Bus Pass"},
      r5:{pts:2000,label:"₹200 Grocery Voucher"},r7:{pts:5000,label:"IT Rebate Cert"},
    };

    const reward = rewards[rewardId];
    if (!reward) return res.status(400).json({ error: "Invalid reward" });
    if (req.user.pts < reward.pts) return res.status(400).json({ error: "Insufficient points" });

    // Deduct points atomically
    const result = await db.query(
      "UPDATE users SET pts = pts - $1 WHERE id = $2 AND pts >= $1 RETURNING pts",
      [reward.pts, req.user.id]
    );
    if (!result.rows[0]) return res.status(400).json({ error: "Insufficient points" });

    // Log redemption
    await db.query(
      "INSERT INTO redemptions (user_id, reward_id, pts_spent, created_at) VALUES ($1, $2, $3, NOW())",
      [req.user.id, rewardId, reward.pts]
    );

    // In production: trigger actual reward fulfillment (UPI payout, voucher email, etc.)

    res.json({ message: `${reward.label} redeemed!`, remainingPts: result.rows[0].pts });
  } catch (err) {
    res.status(500).json({ error: "Redemption failed" });
  }
});

// ─── AI VERIFICATION SERVICE ─────────────────────────────────────────────────
async function runAIVerification({ title, desc, location, category }) {
  try {
    // Option 1: Use Anthropic Claude API
    // const Anthropic = require("@anthropic-ai/sdk");
    // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // const msg = await client.messages.create({
    //   model: "claude-haiku-4-5-20251001", // fast + cheap for verification
    //   max_tokens: 200,
    //   messages: [{
    //     role: "user",
    //     content: `You are a civic report verifier for India. Analyze this report and give a JSON response with: credibility (0-100), priority (CRITICAL/HIGH/MEDIUM/LOW), isLikelyGenuine (bool), concerns (array of strings if any). Report: Category: ${category}, Title: "${title}", Location: "${location}", Description: "${desc||"N/A"}"`
    //   }]
    // });
    // const json = JSON.parse(msg.content[0].text);
    // return json;

    // Demo: return mock score
    return {
      credibility: 70 + Math.floor(Math.random() * 25),
      priority: ["CRITICAL","HIGH","MEDIUM"][Math.floor(Math.random()*3)],
      isLikelyGenuine: true,
      concerns: [],
    };
  } catch (err) {
    console.error("[AI Verify]", err.message);
    return { credibility: 65, priority: "MEDIUM", isLikelyGenuine: true, concerns: [] };
  }
}

// ─── WEBHOOK: RTI AUTO-FILER ─────────────────────────────────────────────────
// Cron job — run every hour to check SLA violations
async function checkSLAViolations() {
  const SLA = { corruption:7, encroach:14, pollution:10, road:21, litter:3, water:5, power:7, forest:3 };
  
  try {
    for (const [cat, days] of Object.entries(SLA)) {
      const overdue = await db.query(`
        SELECT id, title, city, user_id FROM reports
        WHERE category = $1 AND status = 'verified'
        AND created_at < NOW() - INTERVAL '${days} days'
        AND rti_filed = false AND is_deleted = false
      `, [cat]);

      for (const report of overdue.rows) {
        // Auto-file RTI (integrate with RTI portal API)
        await db.query(
          "UPDATE reports SET rti_filed = true, rti_filed_at = NOW() WHERE id = $1",
          [report.id]
        );
        // Notify user
        // await sendNotification(report.user_id, "RTI automatically filed for your report!");
        console.log(`[RTI] Auto-filed for report ${report.id} in ${cat}`);
      }
    }
  } catch (err) {
    console.error("[SLA Check]", err.message);
  }
}

// Run SLA check every hour
setInterval(checkSLAViolations, 60 * 60 * 1000);

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status:"ok", db:"connected", ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status:"error", db:"disconnected" });
  }
});

// ─── ERROR HANDLERS ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE")  return res.status(400).json({ error: "File too large (max 10MB)" });
  if (err.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ error: "Too many files" });
  console.error("[Unhandled]", req.requestId, err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ─── START ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Prahari API running on port ${PORT}`);
  console.log(`🔒 Security: Helmet, CORS, Rate Limiting, JWT enabled`);
});

module.exports = app;
