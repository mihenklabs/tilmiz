// Derleme: src/ + data/ → dist/
//   dist/elifba-kelime.html : tek dosya (claude.ai sürümü; her şey gömülü)
//   dist/site/              : Play / GitHub Pages sürümü (PWA; veri ayrı dosyalarda, önbelleğe alınır)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAZY = ["conj"]; // site sürümünde açılıştan sonra yüklenen veri
const r = p => path.join(root, p);
const read = p => fs.readFileSync(r(p), "utf8");
const hash = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
const cfg = JSON.parse(read("app.config.json"));

export function loadParts() {
  const tpl = read("src/index.html");
  const css = read("src/style.css");
  const js = read("src/app.js");
  const order = JSON.parse(read("data/_order.json"));
  const data = {};
  for (const k of order) data[k] = JSON.stringify(JSON.parse(read("data/" + k + ".json")));
  return { tpl, css, js, order, data };
}

const fill = (tpl, head, scripts) => tpl.replace("<!-- @head -->\n", head).replace("<!-- @scripts -->\n", scripts);
const names = s => s.replaceAll("{{APP_NAME}}", cfg.name).replaceAll("{{APP_SHORT}}", cfg.shortName).replaceAll("{{DEV_NAME}}", cfg.developer);

// JSON'u <script> içine güvenle koy
const safe = s => s.replace(/<\/(script)/gi, "<\\/$1");

export function buildStandalone(p = loadParts()) {
  const head = `<style>\n${p.css}</style>\n`;
  const dataTags = p.order.map(k => `<script type="application/json" id="${k}">${safe(p.data[k])}</script>\n`).join("");
  return names(fill(p.tpl, head, dataTags + `<script>\n${p.js}</script>\n`));
}

export function buildSite(out = r("dist/site"), p = loadParts()) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "data"), { recursive: true });
  const files = [];
  const emit = (rel, content) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); files.push(rel.replace(/\\/g, "/")); return rel; };

  const dataUrls = {};
  for (const k of p.order) dataUrls[k] = emit(`data/${k}.${hash(p.data[k])}.json`, p.data[k]);
  const jsName = emit(`app.${hash(p.js)}.js`, names(p.js));

  // Yazı tipleri yerelde (çevrimdışı, üçüncü tarafa istek yok)
  const fontCss = fs.existsSync(r("src/fonts/fonts.css")) ? read("src/fonts/fonts.css") : "";
  if (fontCss) for (const f of fs.readdirSync(r("src/fonts"))) if (/.(woff2|txt)$/.test(f)) emit("fonts/" + f, fs.readFileSync(r("src/fonts/" + f)));

  // Pwa statik dosyaları
  const pwa = r("src/pwa");
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(pwa)) {
    const rel = path.relative(pwa, f);
    if (rel === "sw.js") continue;
    const buf = fs.readFileSync(f);
    emit(rel, /\.(html|webmanifest|md|json)$/.test(rel) ? names(buf.toString("utf8")) : buf);
  }

  const boot = `<script>
(function () {
  var U = ${JSON.stringify(dataUrls)}, D = window.__ELIFBA_DATA = {};
  var LAZY = ${JSON.stringify(LAZY)};
  var msg = function (t) { var a = document.getElementById("app"); if (a) a.innerHTML = '<p class="sub" style="padding-top:40px;text-align:center">' + t + "</p>"; };
  var get = function (k) { return fetch(U[k]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  // Büyük ve ilk ekranda gerekmeyen veri (fiil çekimleri) arka planda gelir
  var lazy = {}; LAZY.forEach(function (k) { lazy[k] = get(k); });
  Promise.all(Object.keys(U).filter(function (k) { return LAZY.indexOf(k) < 0; }).map(function (k) { return get(k).then(function (j) { D[k] = j; }); }))
    .then(function () {
      try { performance.mark("elifba-data"); } catch (e) {}
      var s = document.createElement("script"); s.src = ${JSON.stringify(jsName)};
      s.onload = function () { LAZY.forEach(function (k) { lazy[k].then(function (j) { if (window.__elifbaLate) window.__elifbaLate(k, j); }); }); };
      document.body.appendChild(s);
    })
    .catch(function () { msg("Veriler yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile."); });
})();
if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); }); }
</script>
`;
  const preload = Object.entries(dataUrls).filter(([k]) => !LAZY.includes(k)).map(([, u]) => u).map(u => `<link rel="preload" href="${u}" as="fetch" crossorigin="anonymous">\n`).join("")
    + `<link rel="preload" href="${jsName}" as="script">\n`;
  const pwaHead = `<meta name="theme-color" content="${cfg.themeColor}">
<meta name="description" content="${cfg.name}: ${cfg.tagline}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
${preload}`;
  let tpl = p.tpl;
  if (fontCss) tpl = tpl.replace(/<link rel="preconnect"[^\n]*\n/g, "").replace(/<link href="https:\/\/fonts\.googleapis\.com[^\n]*\n/, "");
  const head = pwaHead + `<style>\n${fontCss}${p.css}</style>\n`;
  emit("index.html", names(fill(tpl, head, boot)));

  const version = hash(files.slice().sort().map(f => f + ":" + hash(fs.readFileSync(path.join(out, f)))).join("|"));
  const core = ["./", ...files.filter(f => !f.startsWith(".well-known") && !/\.(md)$/.test(f) && f !== "LICENSE" && f !== ".nojekyll")];
  const sw = read("src/pwa/sw.js").replace("__VERSION__", version).replace("__CORE__", JSON.stringify(core));
  emit("sw.js", sw);
  return { out, files, version };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(r("dist"), { recursive: true });
  const one = buildStandalone();
  fs.writeFileSync(r("dist/elifba-kelime.html"), one);
  const s = buildSite();
  const size = f => (fs.statSync(f).size / 1024).toFixed(0) + " KB";
  console.log("dist/elifba-kelime.html", size(r("dist/elifba-kelime.html")));
  console.log("dist/site/ ", s.files.length, "dosya, sürüm", s.version, "· index.html", size(path.join(s.out, "index.html")));
}
