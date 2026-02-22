// Vercel: single entry for all /api/* — rewrites send path as query, we restore req.url for Express
const serverless = require("serverless-http");
const app = require("../prahari-server");

const handler = serverless(app);

module.exports = (req, res) => {
  try {
    const url = req.url || "";
    const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
    const params = new URLSearchParams(qs);
    let path = params.get("path");
    // Support both rewrite (?path=health) and direct path (/api/health)
    if (path == null && url.startsWith("/api")) {
      const pathPart = url.split("?")[0];
      path = pathPart === "/api" ? "" : pathPart.slice(5); // "/api/health" -> "health"
    }
    params.delete("path");
    const rest = params.toString();
    req.url = (path ? "/api/" + path : "/api") + (rest ? "?" + rest : "");
    return handler(req, res);
  } catch (err) {
    console.error("[Vercel handler]", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
};
