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

// ---- Hatırlatmalar (yüklü PWA için en iyi çaba; Android uygulamasında yerel zamanlayıcı kullanılır) ----
// Uygulama 14 günlük planı gönderir; periyodik eşitleme (tarayıcının seçtiği aralıklarla) zamanı gelmiş
// ve 3 saatten eski olmayan en son hatırlatmayı gösterir.
const idb = (mode, fn) => new Promise((res, rej) => {
  const o = indexedDB.open("tilmiz", 1);
  o.onupgradeneeded = () => o.result.createObjectStore("kv");
  o.onerror = () => rej(o.error);
  o.onsuccess = () => { const tx = o.result.transaction("kv", mode), st = tx.objectStore("kv"), r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); };
});
const kvGet = k => idb("readonly", s => s.get(k));
const kvSet = (k, v) => idb("readwrite", s => s.put(v, k));

self.addEventListener("message", e => {
  if (e.data && e.data.type === "tilmiz-plan") e.waitUntil(kvSet("plan", e.data.plan));
});

async function showDue() {
  const plan = (await kvGet("plan")) || [], shown = (await kvGet("shown")) || [], now = Date.now();
  const due = plan.filter(p => p.at <= now && now - p.at < 3 * 3600e3 && !shown.includes(p.tag)).pop();
  if (!due) return;
  await self.registration.showNotification(due.title, { body: due.body, tag: due.tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: due.url } });
  await kvSet("shown", shown.concat(due.tag).slice(-40));
  for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage({ type: "shown", tag: due.tag, at: now });
}
self.addEventListener("periodicsync", e => { if (e.tag === "tilmiz-remind") e.waitUntil(showDue()); });

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./#calis", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
