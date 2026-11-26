// Mağaza/simge görsellerini tarayıcıda (canvas + yerel yazı tipleri) üretip diske yazan küçük sunucu.
// Kullanım: node tools/assets/server.mjs  → http://localhost:8091/ aç, "Hepsini kaydet" (ya da ?auto=1)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
// Yalnızca bu hedeflere yazılabilir
const TARGETS = {
  "icon-192": "src/pwa/icons/icon-192.png",
  "icon-512": "src/pwa/icons/icon-512.png",
  "maskable-512": "src/pwa/icons/maskable-512.png",
  "monochrome-192": "src/pwa/icons/monochrome-192.png",
  "play-icon-512": "store/play-icon-512.png",
  "feature-graphic": "store/feature-graphic-1024x500.png",
};
const TYPES = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".css": "text/css", ".json": "application/json" };

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (req.method === "POST" && u.pathname === "/save") {
    const name = u.searchParams.get("name");
    if (!TARGETS[name]) { res.writeHead(400); return res.end("bilinmeyen hedef"); }
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      const b64 = Buffer.concat(chunks).toString("utf8").replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(root, TARGETS[name]), Buffer.from(b64, "base64"));
      console.log("yazıldı", TARGETS[name]);
      res.writeHead(200); res.end("ok");
    });
    return;
  }
  let f;
  if (u.pathname === "/") f = path.join(here, "generator.html");
  else if (u.pathname === "/app.config.json") f = path.join(root, "app.config.json");
  else if (u.pathname.startsWith("/fonts/")) f = path.join(root, "src", u.pathname);
  if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(fs.readFileSync(f));
}).listen(8091, () => console.log("http://localhost:8091/"));
