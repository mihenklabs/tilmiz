// {{APP_NAME}} – çevrimdışı çalışma için önbellek (derlemede sürüm ve dosya listesi doldurulur)
const CACHE = "elifba-__VERSION__";
const CORE = __CORE__;
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Adı içerik özetini taşıyan dosyalar (app.*.js, data/*.json, fonts) değişmez: önce önbellek.
  // index.html ve diğerleri: önbellekten hemen ver, arka planda yenile.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
