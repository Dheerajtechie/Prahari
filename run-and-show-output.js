#!/usr/bin/env node
/**
 * Start the server, wait for it, then request main endpoints and print full output.
 * Run: node run-and-show-output.js
 */
const { spawn } = require("child_process");
const http = require("http");

const BASE = "http://127.0.0.1:3001";
const endpoints = [
  { path: "/", name: "App (HTML)" },
  { path: "/api/health", name: "Health" },
  { path: "/api/stats/national", name: "Stats National" },
  { path: "/api/stats/cities", name: "Stats Cities" },
  { path: "/api/reports", name: "Reports (feed)" },
  { path: "/api/rewards/catalog", name: "Rewards catalog" },
  { path: "/api/leaderboard", name: "Leaderboard" },
];

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.get(url, { timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const t = setInterval(async () => {
      try {
        await get("/api/health");
        clearInterval(t);
        resolve();
      } catch {
        if (++n >= retries) {
          clearInterval(t);
          reject(new Error("Server did not start in time"));
        }
      }
    }, 500);
  });
}

async function main() {
  let server = null;
  // Try to use already-running server first
  try {
    await get("/api/health");
    console.log("Using existing server on port 3001.\n");
  } catch {
    console.log("Starting Prahari server...\n");
    server = spawn("node", ["prahari-server.js"], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "" },
    });
    server.stdout.on("data", (d) => process.stdout.write(d));
    server.stderr.on("data", (d) => process.stderr.write(d));
    server.on("error", () => {});
    try {
      await waitForServer();
    } catch (e) {
      if (server) server.kill();
      console.error("Server failed to start:", e.message);
      process.exit(1);
    }
  }

  console.log("\n" + "=".repeat(60) + "\n  APP OUTPUT (sample responses)\n" + "=".repeat(60));

  for (const { path, name } of endpoints) {
    try {
      const { status, body } = await get(path);
      const preview = body.length > 500 ? body.slice(0, 500) + "\n... [truncated]" : body;
      console.log("\n--- " + name + " " + path + " (HTTP " + status + ") ---\n" + preview);
    } catch (err) {
      console.log("\n--- " + name + " " + path + " ---\nError: " + err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Open in browser: " + BASE);
  if (server) {
    console.log("Server is still running. Stop with Ctrl+C.\n");
    server.on("exit", (code) => process.exit(code || 0));
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
