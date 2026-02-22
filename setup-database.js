#!/usr/bin/env node
/**
 * One-shot database setup: schema + seed. Uses .env DATABASE_URL.
 * Run: node setup-database.js   or  npm run db:setup
 */
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
const PLACEHOLDER = "PUT_YOUR_DB_PASSWORD_HERE";

if (!DATABASE_URL || DATABASE_URL.includes(PLACEHOLDER)) {
  console.error("\n  Open the file .env in this folder.");
  console.error("  Replace PUT_YOUR_DB_PASSWORD_HERE with your Supabase database password.");
  console.error("  (Supabase dashboard → Project Settings → Database — the password you set for the project.)");
  console.error("  Save the file, then run:  npm run db:setup\n");
  process.exit(1);
}

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require|supabase|neon|railway|render\.com/i.test(DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false,
});

async function runSchema() {
  const sqlPath = path.join(__dirname, "schema-online.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("✅ Schema applied successfully.");
  } catch (e) {
    if (/already exists|duplicate key/i.test(e.message)) {
      console.log("✅ Schema already applied (tables exist).");
    } else {
      throw e;
    }
  } finally {
    client.release();
  }
}

async function runSeed() {
  const DEMO_PHONE = "9876543210";
  const DEMO_PASSWORD = "demo1234";
  const client = await pool.connect();
  let userId;

  try {
    const existing = await client.query("SELECT id FROM users WHERE phone = $1", [DEMO_PHONE]);
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

    const count = await client.query("SELECT COUNT(*) FROM reports");
    if (parseInt(count.rows[0].count, 10) === 0 && userId) {
      await client.query(
        `INSERT INTO reports (user_id, category, title, description, location, city, status, pts_awarded, votes, ai_score)
         VALUES ($1, 'road', 'Pothole near Central Park', 'Large pothole on main road', 'Near Central Park', 'Mumbai', 'verified', 150, 24, 82),
                ($1, 'litter', 'Garbage pile not cleared', 'Municipal bin overflowing', 'Lane 4, Andheri West', 'Mumbai', 'pending', 0, 8, 75)`,
        [userId]
      );
      console.log("✅ Sample reports added.");
    } else {
      console.log("ℹ️ Reports already exist, skipping.");
    }
    console.log("✅ Database seed complete.");
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runSchema();
    await runSeed();
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (/password authentication failed/i.test(err.message)) {
      console.error("\n  Your database password in .env is wrong. Get it from Supabase → Project Settings → Database (or reset it there).");
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
