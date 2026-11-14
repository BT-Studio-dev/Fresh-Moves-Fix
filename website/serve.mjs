// Local preview of the built site (public/). Like the live site, it shows 404.html
// for addresses that do not exist. Usage: node serve.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const port = Number(process.argv[2]) || 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".jpg": "image/jpeg", ".md": "text/plain; charset=utf-8", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2", ".cjs": "text/javascript" };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, path.normalize(p));
  if (!file.startsWith(root)) file = root;
  try {
    if (fs.statSync(file).isDirectory()) {
      if (!p.endsWith("/")) { res.writeHead(308, { Location: p + "/" }); return res.end(); }
      file = path.join(file, "index.html");
    }
  } catch (e) {}
  let code = 200;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { code = 404; file = path.join(root, "404.html"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(code, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}).listen(port, "0.0.0.0", () => console.log("Preview on port " + port));
