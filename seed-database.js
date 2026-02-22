#!/usr/bin/env node
/**
 * Seed the database: demo user + sample reports.
 * Run after schema. Usage: node seed-database.js  (requires DATABASE_URL)
 */
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL. Set it in .env or environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require|supabase|neon|railway|render\.com/i.test(DATABASE_URL)
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const DEMO_PHONE = "9876543210";
const DEMO_PASSWORD = "demo1234";

async function seed() {
  const client = await pool.connect();
  try {
    // Demo user (skip if already exists)
    const existing = await client.query("SELECT id FROM users WHERE phone = $1", [DEMO_PHONE]);
    let userId;
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO users (id, name, phone, password_hash, city, pts, reports, rank, badge, title)
         VALUES ($1, $2, $3, $4, $5, 150, 2, 1, '🦁', 'GUARDIAN LION')`,
        [id, "Demo Guardian", DEMO_PHONE, hash, "Mumbai"]
      );
      userId = id;
      console.log("✅ Demo user created: phone 9876543210, password demo1234");
    } else {
      userId = existing.rows[0].id;
      console.log("ℹ️ Demo user already exists (phone 9876543210).");
    }

    // Sample reports (only if none exist)
    const count = await client.query("SELECT COUNT(*) FROM reports");
    if (parseInt(count.rows[0].count, 10) === 0 && userId) {
      await client.query(
        `INSERT INTO reports (user_id, category, title, description, location, city, status, pts_awarded, votes, ai_score)
         VALUES ($1, 'road', 'Pothole near Central Park causing accidents', 'Large pothole on main road', 'Near Central Park, Sector 12', 'Mumbai', 'verified', 150, 24, 82),
                ($1, 'litter', 'Garbage pile not cleared for 5 days', 'Municipal bin overflowing', 'Lane 4, Andheri West', 'Mumbai', 'pending', 0, 8, 75)`,
        [userId]
      );
      console.log("✅ Sample reports added.");
    } else {
      console.log("ℹ️ Reports already exist, skipping seed.");
    }

    console.log("✅ Database seed complete.");
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
