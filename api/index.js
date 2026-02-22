// Vercel: single entry for all /api/* — rewrites send path as query, we restore req.url for Express
const serverless = require("serverless-http");
const app = require("../prahari-server");

const handler = serverless(app);

module.exports = (req, res) => {
  const url = req.url || "";
  const qs = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const params = new URLSearchParams(qs);
  const path = params.get("path");
  if (path != null) {
    params.delete("path");
    const rest = params.toString();
    req.url = (path ? "/api/" + path : "/api") + (rest ? "?" + rest : "");
  }
  return handler(req, res);
};
