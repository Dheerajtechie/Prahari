#!/usr/bin/env node
/**
 * Run prahari-schema.sql against DATABASE_URL.
 * Usage: node run-schema.js
 * Requires: .env with DATABASE_URL, or set DATABASE_URL in environment.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL. Set it in .env or environment.");
  process.exit(1);
}

const schemaFile = process.argv[2] || "prahari-schema.sql";
const schemaPath = path.join(__dirname, schemaFile);
if (!fs.existsSync(schemaPath)) {
  console.error("Schema file not found:", schemaFile);
  process.exit(1);
}
const sql = fs.readFileSync(schemaPath, "utf8");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require|supabase|neon|railway|render\.com/i.test(DATABASE_URL)
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function run() {
  let client;
  try {
    client = await pool.connect();
    await client.query(sql);
    console.log("✅ Schema applied successfully.");
  } catch (err) {
    if (/already exists|duplicate key/i.test(err.message))
      console.log("✅ Schema already applied (tables exist).");
    else {
      console.error("❌ Schema error:", err.message);
      process.exit(1);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
