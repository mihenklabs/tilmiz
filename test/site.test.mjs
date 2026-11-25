// Site (PWA) derlemesi: küçük index.html + ayrı veri dosyaları, önbellek listesi
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openApp, root } from "./helpers.mjs";

const site = path.join(root, "dist/site");
const indexHtml = fs.readFileSync(path.join(site, "index.html"), "utf8");

// fetch ve <script src> isteklerini dist/site'tan karşılayan jsdom açılışı
function openSite() {
  return new Promise((resolve, reject) => {
    const a = openApp({
      html: indexHtml,
      url: "https://elifba.test/",
      beforeParse(w) {
        w.fetch = async u => {
          const f = path.join(site, new URL(u, "https://elifba.test/").pathname);
          if (!fs.existsSync(f)) return { ok: false, status: 404 };
          const txt = fs.readFileSync(f, "utf8");
          return { ok: true, status: 200, json: async () => JSON.parse(txt), text: async () => txt };
        };
        // dinamik eklenen <script src="app.*.js"> dosyasını diskten çalıştır
        const orig = w.Node.prototype.appendChild;
        w.Node.prototype.appendChild = function (el) {
          if (el && el.tagName === "SCRIPT" && el.src) {
            const f = path.join(site, new URL(el.src).pathname);
            const code = fs.readFileSync(f, "utf8");
            const inline = w.document.createElement("script");
            inline.textContent = code;
            return orig.call(this, inline);
          }
          return orig.call(this, el);
        };
      },
    });
    const t0 = Date.now();
    const tick = () => {
      try { if (a.window.eval("typeof N") === "number") return resolve(a); } catch (e) {}
      if (Date.now() - t0 > 10000) return reject(new Error("uygulama açılmadı: " + a.text() + a.errors.join("\n")));
      setTimeout(tick, 20);
    };
    tick();
  });
}

test("index.html küçük; veri ayrı dosyalarda ve içerik özetli adlarla", () => {
  assert.ok(indexHtml.length < 120_000, "index.html " + indexHtml.length);
  assert.doesNotMatch(indexHtml, /type="application\/json"/);
  const data = fs.readdirSync(path.join(site, "data"));
  assert.equal(data.length, 10);
  data.forEach(f => assert.match(f, /^[a-z]+\.[0-9a-f]{10}\.json$/));
});

test("site sürümü açılır ve çalışır", async () => {
  const a = await openSite();
  assert.equal(a.ev("N"), 11719);
  assert.match(a.text(), /Yeni kelime|iyi biliyorum/);
  a.go("pratik"); assert.match(a.text(), /Pratik/);
  assert.deepEqual(a.errors, []);
  a.close();
});

test("service worker önbellek listesi var olan dosyaları gösterir", () => {
  const sw = fs.readFileSync(path.join(site, "sw.js"), "utf8");
  const core = JSON.parse(sw.match(/const CORE = (\[.*\]);/)[1]);
  assert.ok(core.includes("./") && core.includes("index.html"));
  for (const f of core) if (f !== "./") assert.ok(fs.existsSync(path.join(site, f)), "yok: " + f);
  assert.ok(core.some(f => f.startsWith("data/words.")));
  assert.match(sw, /const CACHE = "elifba-[0-9a-f]{10}"/);
});

test("PWA dosyaları: manifest, simgeler, gizlilik, lisans, assetlinks", () => {
  for (const f of ["manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "privacy.html", "LICENSE", ".well-known/assetlinks.json", ".nojekyll"])
    assert.ok(fs.existsSync(path.join(site, f)), f);
  const m = JSON.parse(fs.readFileSync(path.join(site, "manifest.webmanifest"), "utf8"));
  assert.ok(m.name && m.short_name && m.icons.length === 3);
});
