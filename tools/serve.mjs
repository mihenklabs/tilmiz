// Yerel deneme sunucusu: dist/site'ı gzip ile sunar (GitHub Pages'e benzer)
// Kullanım: node tools/serve.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/site");
const port = +process.argv[2] || 8080;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".opus": "audio/ogg" };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("404"); }
  const type = TYPES[path.extname(f)] || "application/octet-stream";
  let body = fs.readFileSync(f);
  const headers = { "Content-Type": type, "Cache-Control": "no-cache" };
  if (/gzip/.test(req.headers["accept-encoding"] || "") && /text|json|javascript|manifest|svg/.test(type)) { body = zlib.gzipSync(body); headers["Content-Encoding"] = "gzip"; }
  res.writeHead(200, headers); res.end(body);
}).listen(port, () => console.log(`http://localhost:${port}/`));
