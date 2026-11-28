// Derleme: src/ + data/ → dist/
//   dist/<repo>.html : tek dosya (claude.ai sürümü; her şey gömülü)
//   dist/site/              : Play / GitHub Pages sürümü (PWA; veri ayrı dosyalarda, önbelleğe alınır)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAZY = ["conj", "sentences"]; // site sürümünde açılıştan sonra yüklenen veri
const r = p => path.join(root, p);
const read = p => fs.readFileSync(r(p), "utf8");
const hash = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
const cfg = JSON.parse(read("app.config.json"));
const pkgVersion = JSON.parse(read("package.json")).version;

export function loadParts() {
  const tpl = read("src/index.html");
  const css = read("src/style.css");
  // src/notify.js (hatırlatmalar), src/voice.js (sesli pratik) ve src/pron.js (telaffuz) yönlendiriciden hemen önce eklenir
  const js = read("src/app.js").replace("// ---------- router ----------\n", read("src/notify.js") + "\n" + read("src/voice.js") + "\n" + read("src/pron.js") + "\n// ---------- router ----------\n");
  const order = JSON.parse(read("data/_order.json"));
  const data = {};
  for (const k of order) data[k] = JSON.stringify(JSON.parse(read("data/" + k + ".json")));
  return { tpl, css, js, order, data };
}

const fill = (tpl, head, scripts) => tpl.replace("<!-- @head -->\n", head).replace("<!-- @scripts -->\n", scripts);
const names = s => s.replaceAll("{{APP_NAME}}", cfg.name).replaceAll("{{APP_SHORT}}", cfg.shortName).replaceAll("{{DEV_NAME}}", cfg.developer)
  .replaceAll("{{GITHUB_USER}}", cfg.githubUser).replaceAll("{{REPO}}", cfg.repo).replaceAll("{{PACKAGE_ID}}", cfg.packageId)
  .replaceAll("{{FINGERPRINTS}}", JSON.stringify((cfg.fingerprints || []).map(f => f.sha256)))
  .replaceAll("{{PLAY_BILLING}}", cfg.playBilling ? "1" : "0")
  .replace(/<!--billing-->([\s\S]*?)<!--\/billing-->/g, (m, x) => cfg.playBilling ? x : "")
  .replace(/<!--nobilling-->([\s\S]*?)<!--\/nobilling-->/g, (m, x) => cfg.playBilling ? "" : x)
  .replaceAll("{{CONTACT_EMAIL}}", cfg.contactEmail || "").replaceAll("{{VERSION}}", pkgVersion);

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
  // Arama motorları ve paylaşım önizlemeleri için (Open Graph, yapılandırılmış veri)
  const siteUrl = `https://${cfg.githubUser}.github.io/${cfg.repo}/`;
  emit("og.png", fs.readFileSync(r("store/feature-graphic-1024x500.png")));
  const seoDesc = "Türkçe konuşanlar için ücretsiz, reklamsız Arapça öğrenme: 11.700+ kelime, aralıklı tekrar, Elifbâ, dil bilgisi dersleri, Kur’an ayetleri ve hadisler kelime kelime.";
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: cfg.name, url: siteUrl, applicationCategory: "EducationalApplication", operatingSystem: "Android, Web", inLanguage: "tr", description: seoDesc, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" }, author: { "@type": "Organization", name: cfg.developer, url: `https://${cfg.githubUser}.github.io/` } };
  const pwaHead = `<meta name="theme-color" content="${cfg.themeColor}">
<meta name="description" content="${seoDesc}">
<link rel="canonical" href="${siteUrl}">
<meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="${cfg.name}">
<meta property="og:title" content="${cfg.name} – ücretsiz Arapça öğren"><meta property="og:description" content="${seoDesc}">
<meta property="og:url" content="${siteUrl}"><meta property="og:image" content="${siteUrl}og.png"><meta property="og:image:width" content="1024"><meta property="og:image:height" content="500">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
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
  const sw = names(read("src/pwa/sw.js")).replace("__VERSION__", version).replace("__CORE__", JSON.stringify(core));
  emit("sw.js", sw);
  return { out, files, version };
}

// Geliştirici kök sitesi (<githubUser>.github.io deposu): TWA doğrulaması için assetlinks.json
// alan adının kökünde olmalı. Uygulamalar /<repo>/ altında yayınlanır.
export function buildRoot(out = r("dist/root")) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, ".well-known"), { recursive: true });
  fs.writeFileSync(path.join(out, ".nojekyll"), "");
  fs.writeFileSync(path.join(out, ".well-known/assetlinks.json"), names(read("src/pwa/.well-known/assetlinks.json")));
  // Tanıtım sayfası. Bağış bölümü yalnızca app.config.json donateUrl doluysa görünür (https bağlantısı).
  const donate = /^https:\/\//.test(cfg.donateUrl || "");
  const home = `https://${cfg.githubUser}.github.io/`, app = home + cfg.repo + "/";
  const FAQ = [
    ["Tilmiz gerçekten ücretsiz mi?", "Evet. Reklam, abonelik ya da kilitli içerik yok; bütün bölümler herkese açık."],
    ["Hesap açmam gerekiyor mu?", "Hayır. İlerlemen yalnızca kendi cihazında saklanır. Telefon değiştirirken Ayarlar’dan yedek dosyası alıp yeni cihazda geri yükleyebilirsin."],
    ["Arap harflerini hiç bilmiyorum, kullanabilir miyim?", "Evet. Pratik bölümündeki Elifbâ kısmı harfleri, harekeleri ve okumayı adım adım öğretir; kelimelerin okunuşu Latin harfleriyle de yazılıdır."],
    ["Kur’an Arapçası mı, günlük Arapça mı?", "İkisi de. Kelimeler sık kullanılandan seyreğe sıralı; günlük dil, klasik Arapça ve Kur’an’da geçen kelimeler bir arada. Gelişim ekranı Kur’an’ın ve film altyazılarının ne kadarını anladığını gösterir."],
    ["Mealler ve hadis çevirileri nereden alındı?", "Ayet mealleri QuranEnc.com’daki Rowwad Tercüme Merkezi Türkçe mealinden, hadis çevirileri HadeethEnc.com’dan değiştirilmeden alındı ve kaynağı her metinde belirtildi."],
    ["Çocuklar kullanabilir mi?", "Uygulama 7 yaş ve üzeri için uygundur: kişisel veri toplamaz, reklam göstermez, çocuklara uygun olmayan kelimeler gösterilmez."],
    ["İnternetsiz çalışır mı?", "Evet. Bir kez açıldıktan sonra internet olmadan da kullanılabilir."],
  ];
  const faqHtml = FAQ.map(([q, a]) => `<details class="q"><summary>${q}</summary><p>${a}</p></details>`).join("\n      ");
  const ld = [
    { "@context": "https://schema.org", "@type": "Organization", name: cfg.developer, url: home, email: cfg.contactEmail || undefined, sameAs: [`https://github.com/${cfg.githubUser}`] },
    { "@context": "https://schema.org", "@type": "MobileApplication", name: cfg.name, url: app, operatingSystem: "Android, Web", applicationCategory: "EducationalApplication", inLanguage: "tr", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" }, author: { "@type": "Organization", name: cfg.developer }, ...(cfg.playUrl ? { installUrl: cfg.playUrl } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  const html = names(read("src/root/index.html"))
    .replace("{{FAQ_HTML}}", faqHtml).replace("{{LD_JSON}}", JSON.stringify(ld).replace(/</g, "\\u003c"))
    .replace(/<!--donate-->([\s\S]*?)<!--\/donate-->/g, (m, x) => donate ? x : "")
    .replaceAll("{{DONATE_URL}}", donate ? cfg.donateUrl : "")
    .replaceAll("{{PLAY_LINK}}", cfg.playUrl ? `href="${cfg.playUrl}"` : 'aria-disabled="true"')
    .replaceAll("{{PLAY_TEXT}}", cfg.playUrl ? "Google Play’den indir" : "Google Play · yakında")
    .replaceAll("{{YEAR}}", String(new Date().getFullYear()));
  fs.writeFileSync(path.join(out, "index.html"), html);
  fs.mkdirSync(path.join(out, "img"), { recursive: true });
  for (const f of fs.readdirSync(r("src/root/img"))) fs.copyFileSync(r("src/root/img/" + f), path.join(out, "img", f));
  fs.copyFileSync(r("store/feature-graphic-1024x500.png"), path.join(out, "img/og.png"));
  // Arama motorları: kök alan adı tüm Pages sitelerini (/tilmiz/ dahil) kapsar
  const day = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${home}sitemap.xml\n`);
  fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[home, app, app + "privacy.html"].map((u, i) => `  <url><loc>${u}</loc><lastmod>${day}</lastmod><priority>${["1.0", "0.9", "0.3"][i]}</priority></url>`).join("\n")}\n</urlset>\n`);
  return out;
}

// Bubblewrap (Android TWA) yapılandırması: `bubblewrap init --manifest` yerine `bubblewrap build` ile kullanılır.
// İmza anahtarı depoda tutulmaz (signingKey.path depo dışını gösterir).
export function buildTwa(out = r("dist/twa/twa-manifest.json")) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const host = `${cfg.githubUser}.github.io`, base = `https://${host}/${cfg.repo}/`;
  const [maj, min = 0, pat = 0] = pkgVersion.split(".").map(Number);
  const m = {
    packageId: cfg.packageId, host, name: `${cfg.name} – Arapça öğren`, launcherName: cfg.shortName,
    display: "standalone", orientation: "portrait", themeColor: cfg.themeColor, themeColorDark: "#10161D",
    navigationColor: cfg.themeColor, navigationColorDark: "#10161D", navigationDividerColor: cfg.themeColor, navigationDividerColorDark: "#10161D",
    backgroundColor: "#EEF2F1", enableNotifications: true, splashScreenFadeOutDuration: 300, startUrl: `/${cfg.repo}/`,
    iconUrl: base + "icons/icon-512.png", maskableIconUrl: base + "icons/maskable-512.png", monochromeIconUrl: base + "icons/monochrome-192.png",
    webManifestUrl: base + "manifest.webmanifest", fallbackType: "customtabs",
    appVersion: pkgVersion, appVersionCode: maj * 10000 + min * 100 + pat,
    features: { playBilling: { enabled: !!cfg.playBilling } },
    enableSiteSettingsShortcut: true, isChromeOSOnly: false, isMetaQuest: false, minSdkVersion: 24,
    signingKey: { path: "../../../tilmiz-imza/tilmiz-upload.keystore", alias: "tilmiz" },
    generatorApp: "bubblewrap-cli", shortcuts: [], additionalTrustedOrigins: [], retainedBundles: [], fingerprints: [],
  };
  fs.writeFileSync(out, JSON.stringify(m, null, 2) + "\n");
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(r("dist"), { recursive: true });
  const one = buildStandalone();
  fs.writeFileSync(r("dist/" + cfg.repo + ".html"), one);
  const s = buildSite();
  buildRoot();
  buildTwa();
  if (!cfg.contactEmail) console.warn("UYARI: app.config.json contactEmail boş: gizlilik politikasında iletişim adresi yok, öneri düğmesi gizli. Yayından önce doldur.");
  const size = f => (fs.statSync(f).size / 1024).toFixed(0) + " KB";
  console.log("dist/" + cfg.repo + ".html", size(r("dist/" + cfg.repo + ".html")));
  console.log("dist/site/ ", s.files.length, "dosya, sürüm", s.version, "· index.html", size(path.join(s.out, "index.html")));
}
