// ---------- Ses paketleri (isteğe bağlı indirme) ----------
// Uygulama küçük kalsın diye kelime ve cümle sesleri ayrı paketlerde: Ayarlar → Ses paketleri.
// Sunucuda (app.config.json sesUrl, aynı köken: <kullanıcı>.github.io/tilmiz-ses/):
//   packs.json  [{id, title, desc, ver, size, index, parts:[...]}]
//   <id>/index.<ver>.json  {"metin": [parça, bayt_başı, uzunluk], ...}   (metin: boşlukları tekleştirilmiş harekeli Arapça)
//   <id>/p<n>.<ver>.bin   art arda eklenmiş Ogg Opus dosyaları (tools/tts/synth_pack.py --bundle üretir)
// İndirilen dosyalar Cache Storage'da (SES_CACHE) durur; internetsiz çalışır. Paket yoksa cihazın metin okuma sesi kullanılır.
const SES_BASE = "{{SES_URL}}";
const SES_CACHE = "tilmiz-ses-v1";
const SES_OK = !IN_CLAUDE && /^https?:\/\//.test(SES_BASE) && "caches" in window;
let sesPacks = null, sesBusy = null; // sesBusy: {id, done, total}
const sesIdx = {}, sesBlob = {};
const sesKey = t => String(t).replace(/\s+/g, " ").trim();
const sesUrl = p => new URL(p, SES_BASE).href;
async function sesManifest() {
  if (sesPacks) return sesPacks;
  try { const r = await fetch(sesUrl("packs.json"), { cache: "no-cache" }); if (r.ok) sesPacks = await r.json(); } catch (e) {}
  if (!sesPacks) { try { const c = await caches.open(SES_CACHE); const r = await c.match(sesUrl("packs.json")); if (r) sesPacks = await r.json(); } catch (e) {} }
  return sesPacks || [];
}
async function sesLoad(id) { // kurulu paketin dizinini bellekte tut
  const p = (S.set.ses || {})[id]; if (!p) return false;
  try { const c = await caches.open(SES_CACHE); const r = await c.match(sesUrl(p.index)); if (!r) return false; sesIdx[id] = { idx: await r.json(), base: p }; return true; } catch (e) { return false; }
}
async function sesInstall(id) {
  const list = await sesManifest(), pk = list.find(x => x.id === id); if (!pk || sesBusy) return;
  const files = [pk.index, ...pk.parts], c = await caches.open(SES_CACHE);
  sesBusy = { id, done: 0, total: pk.size || 1 }; sesRefresh();
  try {
    for (const f of files) {
      const url = sesUrl(f); if (await c.match(url)) continue;
      const r = await fetch(url); if (!r.ok) throw new Error(r.status);
      const rd = r.body.getReader(), chunks = [];
      for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); sesBusy.done += value.length; sesRefresh(); }
      await c.put(url, new Response(new Blob(chunks), { headers: { "Content-Type": f.endsWith(".json") ? "application/json" : "application/octet-stream" } }));
    }
    await c.put(sesUrl("packs.json"), new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } }));
    S.set.ses = Object.assign({}, S.set.ses, { [id]: { ver: pk.ver, index: pk.index, parts: pk.parts } }); save();
    await sesLoad(id); toast(`${pk.title} indirildi; artık internetsiz de çalışır.`);
  } catch (e) { toast("İndirme yarıda kaldı. İnternet bağlantını kontrol edip tekrar dene; inen kısım saklandı."); }
  sesBusy = null; sesRefresh();
}
async function sesRemove(id) {
  const p = (S.set.ses || {})[id]; if (!p) return;
  try { const c = await caches.open(SES_CACHE); for (const f of [p.index, ...p.parts]) await c.delete(sesUrl(f)); } catch (e) {}
  for (const f of p.parts) delete sesBlob[sesUrl(f)];
  delete sesIdx[id]; const s = Object.assign({}, S.set.ses); delete s[id]; S.set.ses = s; save(); sesRefresh();
}
function sesFind(text) { const k = sesKey(text); for (const id in sesIdx) { const e = sesIdx[id].idx[k]; if (e) return { id, e }; } return null; }
let sesAudio = null;
function sesSpeak(text) { // varsa paketteki kaydı çal; yoksa false döner ve cihaz sesi kullanılır
  const hit = sesFind(text); if (!hit) return false;
  (async () => {
    try {
      const [pi, off, len] = hit.e, url = sesUrl(sesIdx[hit.id].base.parts[pi]);
      if (!sesBlob[url]) { const c = await caches.open(SES_CACHE); const r = await c.match(url); if (!r) throw new Error("yok"); sesBlob[url] = await r.blob(); }
      const src = URL.createObjectURL(sesBlob[url].slice(off, off + len, "audio/ogg"));
      if (sesAudio) { try { sesAudio.pause(); } catch (e) {} }
      const a = sesAudio = new Audio(src); a.playbackRate = Math.min(1.2, Math.max(0.8, (+S.set.vrate || 0.85) / 0.85));
      a.onended = a.onerror = () => URL.revokeObjectURL(src);
      await a.play();
    } catch (e) { deviceSpeak(spk(text)); }
  })();
  return true;
}
const sesMB = b => (b / 1048576).toFixed(b < 10485760 ? 1 : 0).replace(".", ",") + " MB";
function sesBox() {
  if (!SES_OK) return "";
  const inst = S.set.ses || {};
  if (!sesPacks) { sesManifest().then(() => sesRefresh()); return `<div class="set" id="sesSet"><h3>Ses paketleri</h3><p>Paket listesi yükleniyor…</p></div>`; }
  const rows = sesPacks.map(p => {
    const on = !!inst[p.id], busy = sesBusy && sesBusy.id === p.id, old = on && inst[p.id].ver !== p.ver;
    return `<div class="sesrow"><div><b>${esc(p.title)}</b><span>${esc(p.desc || "")} · ${sesMB(p.size || 0)}</span>${busy ? `<span class="mini wide"><i style="width:${Math.round(100 * sesBusy.done / sesBusy.total)}%"></i></span><span>%${Math.round(100 * sesBusy.done / sesBusy.total)} indirildi</span>` : ""}</div>
      ${busy ? "" : on && !old ? `<button class="btn sm" data-sesdel="${esc(p.id)}">Sil</button>` : `<button class="btn sm primary" data-sesget="${esc(p.id)}">${old ? "Güncelle" : "İndir"}</button>`}</div>`;
  }).join("");
  return `<div class="set" id="sesSet"><h3>Ses paketleri</h3><p>Uygulamanın kendi Arapça sesiyle okunmuş kelime ve cümleler. İsteğe bağlıdır; indirince internetsiz çalışır ve telefonun sesinin yerine kullanılır. Wi-Fi’de indirmen önerilir.</p>${sesPacks.length ? rows : "<p class=\"note mut\">Ses paketleri henüz hazır değil.</p>"}</div>`;
}
function sesRefresh() { const el = $("#sesSet"); if (!el || view !== "ayarlar") return; el.outerHTML = sesBox(); sesBind(); }
function sesBind() {
  app.querySelectorAll("[data-sesget]").forEach(b => b.onclick = () => sesInstall(b.dataset.sesget));
  app.querySelectorAll("[data-sesdel]").forEach(b => b.onclick = () => { if (confirm("Ses paketi silinsin mi? İstediğin zaman yeniden indirebilirsin.")) sesRemove(b.dataset.sesdel); });
}
if (SES_OK) for (const id in (S.set.ses || {})) sesLoad(id);
