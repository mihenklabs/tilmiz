"use strict";
// Veri: tek dosya sürümünde <script type="application/json"> etiketlerinden, site sürümünde önceden indirilen JSON'lardan okunur.
const DATA = id => { const D = window.__ELIFBA_DATA; if (D) return D[id]; return JSON.parse(document.getElementById(id).textContent); };
// ---------- data ----------
// her kelime: [arapça, okunuş, türkçe, ingilizce, tür, çoğul / muzari]
const W = DATA("words");
const N = W.length;
const OFF = i => !!(S.flag[i] || MAT.has(+i));
const MAT = new Set(DATA("mat")); // 7+ yaş için gizlenen kelimeler
const ORDER = DATA("order");
const POSI = new Array(N); ORDER.forEach((id, p) => { POSI[id] = p; });
const CORE = 710;
const POS = {noun:"isim",verb:"fiil",adj:"sıfat",adv:"zarf",pron:"zamir",prep:"edat",conj:"bağlaç",intj:"ünlem",num:"sayı",phrase:"ifade",particle:"edat"};
const INT = [0,1,10,1440,4320,10080,23040,50400,129600]; // dakika: kutu 1..8
const KNOWN = 5; // bu kutu ve üstü = iyi biliyorum
const fmt = n => n.toLocaleString("tr-TR");
const $ = s => document.querySelector(s);
const app = $("#app");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const bare = s => s.replace(/[\u064B-\u0652\u0670\u0640]/g, "");
const COG = DATA("cog");
const cogLine = id => COG[id] ? `<div class="cog">Türkçede de var: ${esc(COG[id].join(", "))}</div>` : "";
const vz = (t, id) => (S.set.hk === "off" || (S.set.hk === "known" && S.p[id] && S.p[id][0] >= 5)) ? bare(t) : t;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nowMin = () => Math.floor(Date.now() / 60000);
const dayStr = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const extraLabel = w => w[5] ? (w[4] === "verb" ? "Muzari" : "Çoğulu") : "";
const lvl = box => { const n = box >= 7 ? 4 : box >= 5 ? 3 : box >= 3 ? 2 : 1; return `<span class="lvl" aria-label="Seviye ${n}/4">${[1,2,3,4].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`; };
function when(m) {
  const d = m - nowMin();
  if (d <= 0) return "şimdi";
  if (d < 60) return d + " dk sonra";
  if (d < 1440) return Math.round(d / 60) + " saat sonra";
  return Math.round(d / 1440) + " gün sonra";
}
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2400); }

// ---------- state ----------
const KEY = "elifba-kelime-v1";
const DEF = () => ({ v: 1, t: 0, next: 0, p: {}, flag: {}, set: { daily: 10, dir: "mix", auto: true, okSec: 2, badSec: 4, cjT: "mix", cjP: "basic", cjK: "form", hk: "on", lmix: true, triM: "mix", voice: "auto", vrate: 0.85, goal: 100, fx: true }, prio: [], cj: { r: 0, w: 0, s: {} }, sp: { r: 0, w: 0 }, log: {}, gr: {}, md: {}, ds: {}, tb: {}, place: null, cm: {}, welcomed: 0, day: { d: "", n: 0, r: 0, bonus: 0 }, streak: { last: "", c: 0 } });
function normalize(o) { const d = DEF(); o = o && typeof o === "object" ? o : {}; return Object.assign(d, o, { set: Object.assign(d.set, o.set || {}), day: Object.assign(d.day, o.day || {}), streak: Object.assign(d.streak, o.streak || {}), p: o.p || {}, flag: o.flag || {}, prio: o.prio || [], cj: Object.assign({ r: 0, w: 0, s: {} }, o.cj || {}), sp: Object.assign({ r: 0, w: 0 }, o.sp || {}), log: o.log || {}, gr: o.gr || {}, md: o.md || {}, ds: o.ds || {}, tb: o.tb || {}, place: o.place || null, cm: o.cm || {} }); }
let S = DEF();
try { const raw = localStorage.getItem(KEY); if (raw) S = normalize(JSON.parse(raw)); } catch (e) {}
const ORIG = W.map(w => w[2]);
function applyCM() { for (let i = 0; i < N; i++) W[i][2] = ORIG[i]; for (const k in S.cm) if (W[k]) W[k][2] = S.cm[k]; }
applyCM();

const IN_CLAUDE = !!(window.claude && typeof window.claude.use === "function");
let db = null, uid = null, pushTimer = null, pushing = false, pushAgain = false, syncLabel = "Bu cihazda kaydediliyor";
function save() {
  try { if (typeof checkBadges === "function") checkBadges(); } catch (e) {}
  S.t = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  clearTimeout(pushTimer); pushTimer = setTimeout(push, 2000);
}
const CH = 2500, nChunks = () => Math.ceil(N / CH), lastPushed = {};
async function push() {
  if (!db || !uid) return;
  if (pushing) { pushAgain = true; return; }
  pushing = true;
  try {
    const base = "data/users/" + uid + "/", t = S.t, chunks = {};
    for (const k in S.p) { const c = Math.floor(+k / CH); (chunks[c] = chunks[c] || {})[k] = S.p[k]; }
    for (let c = 0; c < nChunks(); c++) {
      const js = JSON.stringify(chunks[c] || {});
      if (lastPushed[c] === js) continue;
      await db.doc(base + "pchunk" + c).set({ json: js, t });
      lastPushed[c] = js;
    }
    const meta = Object.assign({}, S); delete meta.p;
    await db.doc(base + "progress").set({ json: JSON.stringify(meta), t, fmt: 2, chunks: nChunks() });
    syncLabel = "Hesabına kaydediliyor, cihazlar arasında eşitlenir";
  } catch (e) { syncLabel = "Eşitlenemedi; bu cihazda kaydediliyor"; }
  pushing = false;
  if (pushAgain) { pushAgain = false; push(); }
}
async function initSync() {
  try {
    if (!window.claude || typeof window.claude.use !== "function") return;
    const [d, u] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!d || !u) return;
    const id = await u.id();
    if (!id) return;
    db = d; uid = id;
    const base = "data/users/" + uid + "/";
    const timeout = ms => new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms));
    const snap = await Promise.race([db.doc(base + "progress").get(), timeout(10000)]);
    const remote = snap && snap.exists ? snap.data() : null;
    if (remote && remote.json && (remote.t || 0) > (S.t || 0)) {
      const obj = JSON.parse(remote.json);
      if (remote.fmt === 2) {
        const snaps = await Promise.race([Promise.all([...Array(remote.chunks || 0).keys()].map(c => db.doc(base + "pchunk" + c).get())), timeout(15000)]);
        obj.p = {};
        snaps.forEach((sn, c) => { if (sn && sn.exists) { const j = sn.data().json; if (j) { lastPushed[c] = j; Object.assign(obj.p, JSON.parse(j)); } } });
      }
      S = normalize(obj);
      applyCM();
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
      if (!cur || cur.type === "done") cur = null;
      route(true);
      if (remote.fmt !== 2) push();
    } else if (S.t) { push(); }
    syncLabel = "Hesabına kaydediliyor, cihazlar arasında eşitlenir";
    if (view === "ayarlar") render();
  } catch (e) { db = null; }
}

// ---------- speech ----------
let arVoice = null, ttsCap = null, warned = false;
function loadVoices() { try { const vs = speechSynthesis.getVoices(); arVoice = vs.find(v => /^ar/i.test(v.lang)) || null; } catch (e) {} }
if ("speechSynthesis" in window) { loadVoices(); try { speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch (e) {} }
(async () => { try { if (window.claude && window.claude.use) ttsCap = await window.claude.use("tts"); } catch (e) { ttsCap = null; } })();
// Doğru / yanlış ses efektleri (Web Audio; dosya gerektirmez, çevrimdışı çalışır)
let actx = null, lastFx = 0;
function fx(ok) {
  if (S.set.fx === false) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    actx = actx || new AC(); if (actx.state === "suspended") actx.resume();
    const t0 = actx.currentTime + 0.01;
    const tone = (f, a, d, type, vol) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0 + a);
      g.gain.setValueAtTime(0.0001, t0 + a); g.gain.exponentialRampToValueAtTime(vol, t0 + a + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      o.connect(g); g.connect(actx.destination); o.start(t0 + a); o.stop(t0 + a + d + 0.02);
    };
    if (ok) { tone(784, 0, 0.14, "sine", 0.22); tone(1047, 0.1, 0.26, "sine", 0.2); }
    else { tone(233, 0, 0.16, "triangle", 0.28); tone(185, 0.13, 0.26, "triangle", 0.26); }
    lastFx = Date.now();
  } catch (e) {}
}
// Konuşma motorları harekeli Kur’an yazımını (ٰ, ٱ, küçük işaretler) iyi okuyamıyor: standart yazıma çevir
function spk(t) {
  return String(t)
    .replace(/ٱ/g, "ا")
    .replace(/ى\u0670/g, "ى")
    .replace(/\u064Eو\u0670/g, "\u064Eا")
    .replace(/\u064E?\u0670/g, "\u064Eا")
    .replace(/[\u06D6-\u06ED\u0653]/g, "")
    .replace(/\s+/g, " ").trim();
}
function deviceSpeak(t) {
  if (!("speechSynthesis" in window)) { toast("Bu tarayıcıda sesli okuma yok. Ayarlar’dan başka ses kaynağı seç."); return; }
  try {
    const u = new SpeechSynthesisUtterance(t);
    if (arVoice) { u.voice = arVoice; u.lang = arVoice.lang; } else u.lang = "ar-SA";
    u.rate = +S.set.vrate || 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
  if (!arVoice && !warned) { warned = true; toast("Telefonunda Arapça ses yüklü değilse Ayarlar’dan ses indir."); }
}
function speak(text, force) {
  const wait = 330 - (Date.now() - lastFx); if (wait > 30) { setTimeout(() => speak(text, force), wait); return; }
  const t = spk(text), src = force || S.set.voice || "auto";
  if ((src === "auto" || src === "claude") && ttsCap) {
    ttsCap.speak(t, { language: "ar", rate: Math.max(0.7, +S.set.vrate || 0.85) }).catch(e => {
      const c = e && e.code;
      if (c === "not_granted" || c === "unavailable") ttsCap = null;
      if (src === "auto" && c !== "stopped" && c !== "no_gesture") deviceSpeak(t);
      else if (c === "rate_limited") toast("Claude sesi şu an çok sık kullanıldı; biraz sonra tekrar dene ya da telefonun sesine geç.");
    });
    return;
  }
  if (src === "claude" && !ttsCap) { toast("Claude sesi bu ekranda kullanılamıyor (Chrome’da açınca çalışır). Telefonun sesi kullanılıyor."); }
  deviceSpeak(t);
}
const listenBtn = (t, label = "Dinle") => `<button class="listen" data-say="${esc(t)}">🔊 ${label}</button>`;
document.addEventListener("click", e => { const b = e.target.closest("[data-say]"); if (b) { e.preventDefault(); e.stopPropagation(); speak(b.dataset.say); } });

// ---------- learning engine ----------
function ensureDay() { const t = dayStr(); if (S.day.d !== t) S.day = { d: t, n: 0, r: 0, bonus: 0 }; }
function markStudy() {
  const t = dayStr(); if (S.streak.last === t) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  S.streak.c = S.streak.last === dayStr(y) ? S.streak.c + 1 : 1; S.streak.last = t;
}
function streakNow() { const y = new Date(); y.setDate(y.getDate() - 1); return (S.streak.last === dayStr() || S.streak.last === dayStr(y)) ? S.streak.c : 0; }
function nextNewId() { while (S.prio.length && (S.p[S.prio[0]] || OFF(S.prio[0]))) S.prio.shift(); if (S.prio.length) return S.prio[0]; for (let q = 0; q < N; q++) { const i = ORDER[q]; if (!S.p[i] && !OFF(i)) return i; } return null; }
function counts() {
  let learn = 0, known = 0, due = 0; const nm = nowMin();
  for (const k in S.p) { if (OFF(k)) continue; const s = S.p[k]; if (s[0] >= KNOWN) known++; else learn++; if (s[1] <= nm) due++; }
  return { learn, known, due };
}
let recent = [], sinceNew = 0, early = 0, cur = null;
let hist = [], viewing = null, advTimer = null;
function pushHist(e) { hist.push(e); if (hist.length > 30) hist.shift(); }
const secs = ok => +(ok ? S.set.okSec : S.set.badSec) || 0;
function pick() {
  ensureDay();
  const nm = nowMin(); const due = []; let learning = 0, soon = null;
  for (const k in S.p) {
    if (OFF(k)) continue;
    const s = S.p[k], id = +k;
    if (s[0] <= 2) learning++;
    if (recent.includes(id)) continue;
    if (s[1] <= nm) due.push(id);
    else if (s[0] <= 2 && (soon === null || s[1] < S.p[soon][1])) soon = id;
  }
  due.sort((a, b) => S.p[a][0] - S.p[b][0] || S.p[a][1] - S.p[b][1]);
  const limit = S.set.daily + S.day.bonus;
  const nid = nextNewId();
  const canNew = nid !== null && S.day.n < limit && learning < 12;
  const intro = () => { sinceNew = 0; return { type: "intro", id: nid }; };
  if (due.length) { if (canNew && sinceNew >= 3) return intro(); sinceNew++; return makeQ(due[0]); }
  if (soon !== null && (sinceNew < 2 || !canNew)) { sinceNew++; return makeQ(soon); }
  if (canNew) return intro();
  if (soon !== null) { sinceNew++; return makeQ(soon); }
  for (const id of recent) { const s = S.p[id]; if (s && !OFF(id) && (s[1] <= nm || s[0] <= 2)) return makeQ(id); }
  if (early > 0) {
    let best = null;
    for (const k in S.p) { if (OFF(k) || recent.includes(+k)) continue; if (best === null || S.p[k][1] < S.p[best][1]) best = +k; }
    if (best !== null) { early--; return makeQ(best); }
  }
  return { type: "done" };
}
const parts = s => s.split(/[,;]/).map(x => x.trim().toLocaleLowerCase("tr")).filter(Boolean);
function makeQ(id) {
  const s = S.p[id];
  const canSpeak = !!(arVoice || ttsCap), r = Math.random();
  let dir = S.set.dir === "mix" ? (s[0] <= 1 ? "ar" : (S.set.lmix && canSpeak ? (r < 0.4 ? "ar" : r < 0.7 ? "tr" : "listen") : (r < 0.5 ? "ar" : "tr"))) : S.set.dir;
  if (dir === "listen" && !canSpeak) dir = "ar";
  const w = W[id], mine = new Set(parts(w[2])), usedAr = new Set([bare(w[0])]);
  const out = []; let tries = 0;
  const lo = Math.max(0, id - 350), hi = Math.min(N - 1, id + 350);
  while (out.length < 3 && tries < 400) {
    tries++;
    const j = lo + Math.floor(Math.random() * (hi - lo + 1));
    if (j === id || OFF(j) || out.includes(j)) continue;
    const x = W[j];
    if (tries < 250 && x[4] !== w[4]) continue;
    const ps = parts(x[2]);
    if (ps.some(p => mine.has(p)) || usedAr.has(bare(x[0]))) continue;
    ps.forEach(p => mine.add(p)); usedAr.add(bare(x[0])); out.push(j);
  }
  return { type: "q", id, dir, opts: shuffle([id, ...out]), picked: null };
}
function grade(id, ok) {
  const s = S.p[id];
  if (cur && cur.dir) { const d = S.ds[cur.dir] = S.ds[cur.dir] || { r: 0, w: 0 }; d[ok ? "r" : "w"]++; }
  if (ok) { s[0] = Math.min(8, s[0] + 1); s[2]++; } else { s[0] = 1; s[3]++; }
  const iv = INT[s[0]];
  s[1] = nowMin() + (s[0] >= 3 ? Math.round(iv * (0.9 + Math.random() * 0.2)) : iv);
  ensureDay(); S.day.r++; markStudy(); logDay("r", 1); if (ok) logDay("ok", 1);
  recent.push(id); if (recent.length > 2) recent.shift();
  S.log[dayStr()].k = counts().known;
  save();
}

// ---------- views ----------
let view = "calis";
function header() {
  const c = counts(); ensureDay();
  const limit = S.set.daily + S.day.bonus, st = streakNow(), started = Object.keys(S.p).length;
  return `
  <div class="top"><div class="brand"><span class="ar" lang="ar">ت</span>{{APP_NAME}}</div><div class="streak">${st ? "🔥 " + st + " gün üst üste" : "Bugün ilk çalışmanı yap"}</div></div>
  <div class="stats">
    <a class="stat" href="#kelimelerim" data-list="known"><b>${fmt(c.known)}</b><span>iyi biliyorum</span></a>
    <a class="stat" href="#kelimelerim" data-list="learn"><b>${fmt(c.learn)}</b><span>öğreniyorum</span></a>
    <div class="stat"><b>${fmt(c.due)}</b><span>tekrar bekliyor</span></div>
  </div>
  <div class="today"><span>Bugün yeni: ${Math.min(S.day.n, limit)}/${limit} · ⭐ ${todayXP()}/${+S.set.goal || 100} XP</span><span>${fmt(started)} / ${fmt(N)}</span></div>
  <div class="meter"><i style="width:${Math.max(0.5, started / N * 100)}%"></i></div>`;
}
function cardInfo(w) {
  return `<div class="tl">${esc(w[1])}</div>
    <div class="mean">${esc(w[2])}</div>
    <div class="en">İng. ${esc(w[3])}</div>
    ${w[5] ? `<div class="extra">${extraLabel(w)}: <span class="ar" lang="ar">${w[5]}</span></div>` : ""}${cogLine(W.indexOf(w))}${rootLine(W.indexOf(w))}`;
}
function study() {
  clearTimeout(advTimer);
  if (viewing !== null) return review();
  if (!cur) cur = pick();
  const fresh = !S.welcomed && !Object.keys(S.p).length;
  let h = header() + (fresh ? `<section class="welcome"><b>Hoş geldin!</b><p>Her gün birkaç yeni kelime öğrenirsin; bilemediklerin sık, bildiklerin seyrek sorulur. Dil bilgisi, cümle ve ayet-hadis alıştırmaları Pratik sekmesinde, gelişimin Gelişim sekmesinde.</p><p>Arap harflerini henüz okuyamıyorsan önce Elifbâ bölümünden başla. Biraz Arapça biliyorsan seviye tespit sınavıyla uygun yerden başlayabilirsin.</p><div class="row"><button class="btn" id="wAlf">Harfleri öğren</button><button class="btn" id="wTest">Seviye sınavı</button></div><div class="row"><button class="btn primary" id="wStart">Kelimelerle başla</button></div></section>` : planCard(false)) + (hist.length ? `<div class="backrow"><button class="linkbtn" id="back">← Önceki kart</button></div>` : "");
  if (cur.type === "intro") {
    const w = W[cur.id];
    h += `<section class="tile card">
      <span class="badge">Yeni kelime</span><span class="badge r">${POS[w[4]] || ""} · #${fmt(POSI[cur.id] + 1)}</span>
      <div class="big ar" lang="ar">${w[0]}</div>
      ${cardInfo(w)}
      ${listenBtn(w[0])}
    </section>
    <div class="row"><button class="btn" id="knowit">Zaten biliyorum</button><button class="btn primary" id="start">Öğrenmeye başla</button></div>`;
  } else if (cur.type === "q") {
    const w = W[cur.id], a = cur.picked, s = S.p[cur.id];
    h += `<section class="tile card">
      <span class="badge">${{ ar: "Arapça → Türkçe", tr: "Türkçe → Arapça", listen: "Dinleme" }[cur.dir]}</span><span class="badge r">${POS[w[4]] || ""}</span>
      ${cur.dir === "listen" && a === null ? `<button class="lsn" data-say="${esc(w[0])}" aria-label="Kelimeyi dinle">🔊</button><div class="tl">Dinle, anlamını seç</div>` : cur.dir !== "tr" ? `<div class="big ar" lang="ar">${cur.dir === "listen" ? w[0] : vz(w[0], cur.id)}</div>${listenBtn(w[0])}` : `<div class="trbig">${esc(w[2])}</div><div class="en" style="opacity:.7">İng. ${esc(w[3])}</div>`}
    </section>
    <div class="opts">${cur.opts.map(j => {
      let cls = ""; if (a !== null) { if (j === cur.id) cls = "ok"; else if (j === a) cls = "no"; else cls = "dim"; }
      const x = W[j];
      return `<button class="${cls}" data-o="${j}" ${a !== null ? "disabled" : ""}>${cur.dir !== "tr" ? esc(x[2]) : `<span class="ar" lang="ar">${vz(x[0], j)}</span>`}</button>`;
    }).join("")}</div>`;
    if (a !== null) {
      const ok = a === cur.id;
      h += `<div class="fb" role="status">
        <div class="verdict ${ok ? "good" : "bad"}">${ok ? "Doğru!" + (s[0] >= 3 ? " Sonraki tekrar " + when(s[1]) + "." : " Biraz sonra tekrar soracağım.") : "Yanlış. Bu kelimeyi daha sık göreceksin."}</div>
        <span class="ar" lang="ar">${w[0]}</span>
        <div class="m">${esc(w[2])}</div>
        <div class="t">${esc(w[1])} ${lvl(s[0])}</div>
        <div class="t">İng. ${esc(w[3])}</div>
        ${w[5] ? `<div class="x">${extraLabel(w)}: <span class="ar" lang="ar">${w[5]}</span></div>` : ""}${cogLine(cur.id)}${rootLine(cur.id)}
      </div>
      <div class="row">${listenBtn(w[0])}<button class="btn primary adv" id="next"><span class="fill" id="fill"></span><span class="lbl">Devam</span></button></div>
      <div class="links">${secs(ok) ? `<button class="linkbtn" id="pause">${cur.paused ? "Otomatik geçiş durdu" : "Duraklat"}</button>` : ""}<button class="linkbtn" id="flag">Bu çeviri hatalı, bir daha gösterme</button></div>`;
    }
  } else {
    const c = counts(), more = nextNewId() !== null;
    h += `<section class="tile done">
      <div class="ar" lang="ar">أَحْسَنْتَ</div>
      <p><b>Aferin!</b> Bugünkü yeni kelimeler ve bekleyen tekrarlar bitti.</p>
      <p>${c.due ? "" : "Sonraki tekrarlar zamanı gelince burada olacak."}</p>
    </section>
    <div class="row">${more ? `<button class="btn primary" id="more5">5 yeni kelime daha</button>` : ""}<button class="btn" id="early">Erken tekrar yap</button></div>`;
  }
  app.innerHTML = h;
  bindPlan();
  // events
  const bk = $("#back"); if (bk) bk.onclick = () => { if (cur && cur.picked !== null && cur.picked !== undefined) cur.paused = true; viewing = hist.length - 1; render(); };
  app.querySelectorAll("[data-list]").forEach(a => a.addEventListener("click", () => { listTab = a.dataset.list; }));
  if (cur.type === "intro") {
    const w = W[cur.id];
    $("#start").onclick = () => { pushHist({ type: "intro", id: cur.id }); S.welcomed = 1; ensureDay(); S.p[cur.id] = [1, nowMin() + 1, 0, 0]; S.day.n++; markStudy(); logDay("n", 1); recent.push(cur.id); if (recent.length > 2) recent.shift(); save(); cur = pick(); render(); };
    $("#knowit").onclick = () => { pushHist({ type: "intro", id: cur.id, known: true }); S.p[cur.id] = [6, nowMin() + INT[6], 1, 0]; save(); toast("“" + w[2] + "” iyi bildiklerine eklendi."); cur = pick(); render(); };
    if (S.set.auto && hasGesture) speak(w[0]);
    const wb = $("#wTest"); if (wb) wb.onclick = () => { S.welcomed = 1; save(); location.hash = "#gelisim"; setTimeout(() => { gv = { mode: "test" }; pt = null; growth(); }, 0); };
    const wa = $("#wAlf"); if (wa) wa.onclick = () => { S.welcomed = 1; save(); pv = { mode: "alf" }; location.hash = "#pratik"; };
    const ws = $("#wStart"); if (ws) ws.onclick = () => { S.welcomed = 1; save(); render(); };
  } else if (cur.type === "q") {
    if (cur.picked === null) {
      if ((cur.dir === "listen" || (cur.dir === "ar" && S.set.auto)) && hasGesture && !cur.spoke) { cur.spoke = true; speak(W[cur.id][0]); }
      app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
        cur.picked = +b.dataset.o; const ok = cur.picked === cur.id; fx(ok);
        grade(cur.id, ok);
        pushHist({ type: "q", id: cur.id, dir: cur.dir, picked: cur.picked });
        cur.advAt = secs(ok) ? Date.now() + secs(ok) * 1000 : 0;
        if (S.set.auto && (cur.dir === "tr" || !ok)) speak(W[cur.id][0]);
        render();
        const n = $("#next"); if (n) n.focus({ preventScroll: true });
      });
    } else {
      const go = () => { clearTimeout(advTimer); cur = pick(); render(); };
      $("#next").onclick = go;
      const pz = $("#pause"); if (pz) pz.onclick = () => { cur.paused = true; clearTimeout(advTimer); render(); };
      if (cur.advAt && !cur.paused) {
        const total = secs(cur.picked === cur.id) * 1000, left = Math.max(0, cur.advAt - Date.now()), f = $("#fill");
        f.style.transition = "none"; f.style.width = (100 * (1 - left / (total || 1))) + "%";
        requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = "width " + left + "ms linear"; f.style.width = "100%"; }));
        advTimer = setTimeout(() => { if (view === "calis" && viewing === null) go(); }, left);
      }
      $("#flag").onclick = () => { S.flag[cur.id] = 1; save(); toast("Bildirildi. İstersen Ayarlar’dan doğru anlamını yazıp geri alabilirsin."); cur = pick(); render(); };
    }
  } else {
    const m = $("#more5"); if (m) m.onclick = () => { ensureDay(); S.day.bonus += 5; save(); cur = pick(); render(); };
    $("#early").onclick = () => { early = 10; cur = pick(); if (cur.type === "done") toast("Henüz tekrar edilecek kelime yok."); render(); };
  }
}

function review() {
  const e = hist[viewing], w = W[e.id], s = S.p[e.id];
  let v, good = true;
  if (e.type === "intro") v = e.known ? "Yeni kelimeydi, “zaten biliyorum” dedin." : "Yeni kelime olarak tanıtılmıştı.";
  else if (e.picked === e.id) v = "Doğru bilmiştin.";
  else { good = false; v = "Yanlış yapmıştın. Seçtiğin: " + (e.dir !== "tr" ? esc(W[e.picked][2]) : `<span class="ar" lang="ar" style="font-size:1.3rem">${W[e.picked][0]}</span>`); }
  app.innerHTML = header() + `<section class="tile card">
    <span class="badge">Önceki kart · ${hist.length - viewing}. geri</span><span class="badge r">${POS[w[4]] || ""}</span>
    <div class="big ar" lang="ar">${w[0]}</div>${cardInfo(w)}${listenBtn(w[0])}</section>
    <div class="fb"><div class="verdict ${good ? "good" : "bad"}">${v}</div>${s ? `<div class="t" style="grid-column:1/-1">Seviye ${lvl(s[0])} · sonraki tekrar ${when(s[1])}</div>` : ""}</div>
    <div class="row"><button class="btn" id="older" ${viewing === 0 ? "disabled" : ""}>← Daha önceki</button><button class="btn primary" id="resume">Kaldığım yere dön</button></div>`;
  $("#older").onclick = () => { if (viewing > 0) { viewing--; render(); } };
  $("#resume").onclick = () => { viewing = null; render(); };
}

let listTab = "learn", listQ = "", listShown = 60, editing = null;
function listData(tab) {
  const ids = [];
  for (const k in S.p) {
    if (OFF(k)) continue; const s = S.p[k];
    if (tab === "known" ? s[0] >= KNOWN : tab === "hard" ? (s[3] >= 2 && s[0] < KNOWN) : s[0] < KNOWN) ids.push(+k);
  }
  if (tab === "hard") ids.sort((a, b) => S.p[b][3] - S.p[a][3]);
  else if (tab === "known") ids.sort((a, b) => S.p[b][0] - S.p[a][0] || a - b);
  else ids.sort((a, b) => S.p[a][1] - S.p[b][1]);
  return ids;
}
function lists() {
  const L = listData("learn"), K = listData("known"), H = listData("hard");
  const seg = `<div class="seg" role="group" aria-label="Liste">
    <button data-t="learn" aria-pressed="${listTab === "learn"}"><b>${fmt(L.length)}</b>Öğreniyorum</button>
    <button data-t="known" aria-pressed="${listTab === "known"}"><b>${fmt(K.length)}</b>İyi biliyorum</button>
    <button data-t="hard" aria-pressed="${listTab === "hard"}"><b>${fmt(H.length)}</b>Zorlandıklarım</button>
    <button data-t="dict" aria-pressed="${listTab === "dict"}"><b>${fmt(dictIds().length)}</b>Sözlük</button>
  </div>`;
  if (listTab === "dict") return dictView(seg);
  const all = listTab === "known" ? K : listTab === "hard" ? H : L;
  const q = listQ.trim().toLocaleLowerCase("tr"), qb = bare(listQ.trim());
  const ids = q ? all.filter(i => { const w = W[i]; return w[2].toLocaleLowerCase("tr").includes(q) || w[1].toLocaleLowerCase("tr").includes(q) || (qb && bare(w[0]).includes(qb)); }) : all;
  const empty = { learn: "Henüz öğrenmekte olduğun kelime yok. Çalış sekmesinden başla.", known: "İyi bildiğin kelimeler burada birikecek. Bir kelime birkaç kez arka arkaya doğru bilinince buraya geçer.", hard: "Birden fazla kez yanlış yaptığın kelimeler burada görünür." }[listTab];
  app.innerHTML = `<h2>Kelimelerim</h2>
  ${statsBlock()}
  <p class="sub">Bir kelimeyi farklı günlerde üst üste doğru bilince (önce 1, sonra 3 gün arayla) “iyi biliyorum” listesine geçer. Yanlış yaptığın kelime başa döner ve sık sorulur.</p>
  ${seg}
  ${all.length ? `<input class="search" id="q" type="search" placeholder="Türkçe ya da Arapça ara" value="${esc(listQ)}" aria-label="Listede ara">` : ""}
  <div class="list">${ids.length ? ids.slice(0, listShown).map(i => {
    const w = W[i], s = S.p[i];
    return `<details data-i="${i}"${editing === i ? " open" : ""}><summary><div><div class="m">${esc(w[2])}</div><div class="t">${esc(w[1])}${lvl(s[0])}</div></div><span class="ar" lang="ar">${vz(w[0], i)}</span></summary>
      <div class="det">${cogLine(i)}${rootLine(i)}${COG[i] || ROOT[i] ? "<br>" : ""}İng. ${esc(w[3])}${w[5] ? ` · ${extraLabel(w)}: <span class="ar" lang="ar" style="font-size:1.2rem">${w[5]}</span>` : ""}<br>
      ${POS[w[4]] || ""} · doğru ${s[2]}, yanlış ${s[3]} · sonraki tekrar ${when(s[1])}
      <div class="acts">${listenBtn(w[0])}<button data-act="reset">Baştan öğren</button>${s[0] < KNOWN ? `<button data-act="know">Biliyorum</button>` : ""}${CJ[i] ? `<button data-act="conj">Çekim tablosu</button>` : ""}<button data-act="edit">Anlamı düzelt</button><button data-act="flag">Çeviri hatalı</button></div>${editing === i ? `<div class="editbox"><input id="cmIn" value="${esc(w[2])}" aria-label="Türkçe anlam"><button class="btn primary sm" data-act="save">Kaydet</button>${S.cm[i] ? `<button class="btn sm" data-act="orig">Orijinal anlam</button>` : ""}</div>` : ""}${S.cm[i] ? `<div class="mut" style="margin-top:6px">Senin düzelttiğin anlam. Orijinali: ${esc(ORIG[i])}</div>` : ""}</div></details>`;
  }).join("") : `<div class="empty">${q ? "Aramana uyan kelime yok." : empty}</div>`}</div>
  ${ids.length > listShown ? `<button class="btn more" id="more">Daha fazla göster (${fmt(ids.length - listShown)} kelime kaldı)</button>` : ""}`;
  app.querySelectorAll(".seg button").forEach(b => b.onclick = () => { listTab = b.dataset.t; listShown = 60; listQ = ""; lists(); });
  const qi = $("#q"); if (qi) qi.oninput = () => { listQ = qi.value; listShown = 60; const pos = qi.selectionStart; lists(); const n = $("#q"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
  const mo = $("#more"); if (mo) mo.onclick = () => { listShown += 100; lists(); };
  app.querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
    const i = +b.closest("details").dataset.i, s = S.p[i];
    if (b.dataset.act === "conj") { pv = { mode: "table", id: i, from: "list" }; location.hash = "#pratik"; return; }
    if (b.dataset.act === "reset") { s[0] = 1; s[1] = nowMin(); toast("Kelime yeniden öğrenme listesine alındı."); }
    if (b.dataset.act === "know") { s[0] = 6; s[1] = nowMin() + INT[6]; toast("İyi bildiklerine eklendi."); }
    if (b.dataset.act === "edit") { editing = editing === i ? null : i; lists(); const ci = $("#cmIn"); if (ci) { ci.focus(); ci.select(); } return; }
    if (b.dataset.act === "save") { const v = ($("#cmIn").value || "").trim(); if (!v) { toast("Anlam boş olamaz."); return; } S.cm[i] = v; W[i][2] = v; delete S.flag[i]; editing = null; toast("Anlam güncellendi; artık her yerde bu anlam kullanılacak."); }
    if (b.dataset.act === "orig") { delete S.cm[i]; W[i][2] = ORIG[i]; editing = null; toast("Orijinal anlama dönüldü."); }
    if (b.dataset.act === "flag") { S.flag[i] = 1; editing = null; toast("Bildirildi. Bu kelime artık sorulmayacak; Ayarlar’dan geri alabilirsin."); }
    save(); if (cur && cur.id === i) cur = null; lists();
  });
}

// ---------- sözlük (çevrimdışı, bütün kelimeler) ----------
// Arapça arama: harekeler, tatvil ve elif/ye/te-i merbuta/hemze farkları yok sayılır
const arNorm = s => bare(String(s)).replace(/[ۖ-ۭٕٓٔ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء").replace(/\s+/g, " ").trim();
// Türkçe/okunuş arama: büyük-küçük harf, şapka ve kesme işaretleri yok sayılır
const trNorm = s => String(s).toLocaleLowerCase("tr").replace(/[âä]/g, "a").replace(/[îï]/g, "i").replace(/[ûü]/g, "u").replace(/ô/g, "o").replace(/[’'ʼ`ʿʾ-]/g, "").replace(/\s+/g, " ").trim();
let DIX = null, dictQ = "", dictShown = 40, dictOpen = null;
const dictIds = () => (dictIds.c = dictIds.c || ORDER.filter(i => !MAT.has(i)));
function dictIndex() {
  if (DIX) return DIX;
  DIX = { ar: [], tr: [], ro: [], root: [] };
  for (let i = 0; i < N; i++) {
    const w = W[i];
    DIX.ar[i] = " " + arNorm(w[0] + (w[5] ? " " + w[5] : "")) + " ";
    DIX.tr[i] = " " + trNorm(w[2] + " ; " + w[3]).replace(/[,;()]/g, " ") + " ";
    DIX.ro[i] = " " + trNorm(w[1]) + " ";
    DIX.root[i] = ROOT[i] ? arNorm(ROOT[i]) : "";
  }
  return DIX;
}
// Sonuçlar: tam eşleşme > aynı kökten > kelime başı > içinde geçen; her grupta sıklık sırası
function dictSearch(q) {
  q = String(q || "").trim();
  if (!q) return dictIds();
  const X = dictIndex(), isAr = /[؀-ۿ]/.test(q);
  const n = isAr ? arNorm(q) : trNorm(q).replace(/[,;()]/g, " ").trim();
  if (!n) return dictIds();
  const rootQ = isAr ? n.replace(/ /g, "") : "";
  const score = i => {
    if (isAr) {
      const a = X.ar[i];
      if (a.includes(" " + n + " ")) return 0;
      if (rootQ.length >= 2 && rootQ.length <= 4 && X.root[i] === rootQ) return 1;
      if (a.includes(" " + n)) return 2;
      if (a.includes(n)) return 3;
      return -1;
    }
    const t = X.tr[i], r = X.ro[i];
    if (t.includes(" " + n + " ") || r === " " + n + " ") return 0;
    if (t.includes(" " + n) || r.includes(" " + n)) return 2;
    if (t.includes(n) || r.includes(n)) return 3;
    return -1;
  };
  const b = [[], [], [], []];
  for (const i of dictIds()) { const s = score(i); if (s >= 0) b[s].push(i); }
  return b.flat();
}
function dictCard(i) {
  const w = W[i], s = S.p[i], g = GEN.g[i], fam = ROOT[i] ? FAM[ROOT[i]].filter(j => j !== i && !MAT.has(j)) : [];
  const queued = (S.prio || []).includes(i);
  const state = s ? (s[0] >= KNOWN ? "İyi biliyorsun" : "Öğreniyorsun") + ` · sonraki tekrar ${when(s[1])}` : queued ? "Öğrenme sırasında öne alındı" : "Henüz çalışılmadı";
  return `<div class="det">
    <div class="dmeta">${POS[w[4]] || ""}${g ? " · " + (g === "f" ? "dişil" : "eril") : ""} · sıklık #${fmt(POSI[i] + 1)}${RARE(i) ? " · seyrek" : ""}</div>
    ${w[5] ? `<div>${extraLabel(w)}: <span class="ar" lang="ar" style="font-size:1.3rem">${w[5]}</span></div>` : ""}
    <div>İng. ${esc(w[3])}</div>
    ${cogLine(i)}${rootLine(i)}
    ${fam.length ? `<div class="fam">${fam.slice(0, 8).map(j => `<button class="chip" data-dw="${j}"><span class="ar" lang="ar">${W[j][0]}</span> ${esc(W[j][2].split(/[,;]/)[0])}</button>`).join("")}</div>` : ""}
    <div class="dmeta">${state}</div>
    <div class="acts">${listenBtn(w[0])}${CJ[i] ? `<button data-dact="conj">Çekim tablosu</button>` : ""}${!s && !queued && !OFF(i) ? `<button data-dact="learn">Öğrenmeye ekle</button>` : ""}</div>
  </div>`;
}
function dictView(seg) {
  const ids = dictSearch(dictQ);
  app.innerHTML = `<h2>Sözlük</h2>
  ${seg}
  <input class="search" id="dq" type="search" placeholder="Arapça, Türkçe, okunuş ya da kök (ör. كتب)" value="${esc(dictQ)}" aria-label="Sözlükte ara" autocomplete="off" spellcheck="false">
  <p class="sub small">${dictQ.trim() ? `${fmt(ids.length)} sonuç` : `${fmt(ids.length)} kelime, sık kullanılandan seyreğe`} · internetsiz çalışır</p>
  <div class="list">${ids.length ? ids.slice(0, dictShown).map(i => {
    const w = W[i];
    return `<details data-i="${i}"${dictOpen === i ? " open" : ""}><summary><div><div class="m">${esc(w[2])}</div><div class="t">${esc(w[1])}${S.p[i] ? lvl(S.p[i][0]) : ""}</div></div><span class="ar" lang="ar">${w[0]}</span></summary>${dictOpen === i ? dictCard(i) : ""}</details>`;
  }).join("") : `<div class="empty">Aramana uyan kelime yok. Harekesiz yazmayı ya da kökün harflerini (ör. كتب) dene.</div>`}</div>
  ${ids.length > dictShown ? `<button class="btn more" id="dmore">Daha fazla göster (${fmt(ids.length - dictShown)} kelime kaldı)</button>` : ""}`;
  app.querySelectorAll(".seg button").forEach(b => b.onclick = () => { listTab = b.dataset.t; listShown = 60; listQ = ""; lists(); });
  const qi = $("#dq");
  qi.oninput = () => { dictQ = qi.value; dictShown = 40; dictOpen = null; const pos = qi.selectionStart; lists(); const n = $("#dq"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
  const mo = $("#dmore"); if (mo) mo.onclick = () => { dictShown += 100; lists(); };
  const bindCard = (d, i) => {
    d.querySelectorAll("[data-dact]").forEach(b => b.onclick = () => {
      if (b.dataset.dact === "conj") { pv = { mode: "table", id: i, from: "list" }; location.hash = "#pratik"; return; }
      if (b.dataset.dact === "learn") { S.prio = (S.prio || []).filter(x => x !== i); S.prio.unshift(i); save(); if (cur && cur.type === "intro") cur = null; toast("Eklendi: Çalış sekmesinde sıradaki yeni kelime bu olacak."); lists(); }
    });
    d.querySelectorAll("[data-dw]").forEach(b => b.onclick = () => { dictQ = W[+b.dataset.dw][0]; dictOpen = +b.dataset.dw; dictShown = 40; lists(); window.scrollTo(0, 0); });
  };
  app.querySelectorAll(".list details").forEach(d => d.addEventListener("toggle", () => {
    const i = +d.dataset.i;
    if (d.open && dictOpen !== i) {
      dictOpen = i;
      app.querySelectorAll(".list details[open]").forEach(o => { if (o !== d) { o.open = false; const c = o.querySelector(".det"); if (c) c.remove(); } });
      if (!d.querySelector(".det")) d.insertAdjacentHTML("beforeend", dictCard(i));
      bindCard(d, i);
    } else if (!d.open && dictOpen === i) { dictOpen = null; const c = d.querySelector(".det"); if (c) c.remove(); }
  }));
  const op = dictOpen !== null && app.querySelector(`.list details[data-i="${dictOpen}"]`); if (op) bindCard(op, dictOpen);
}

let fedit = null;
function settings() {
  const nflag = Object.keys(S.flag).length;
  const pill = (k, v, label) => `<button data-k="${k}" data-v="${v}" aria-pressed="${String(S.set[k]) === String(v)}">${label}</button>`;
  app.innerHTML = `<h2>Ayarlar</h2><p class="sub">${esc(syncLabel)}.</p>
  <div class="set"><h3>Günde kaç yeni kelime?</h3><p>Yeni kelimeler tekrarların arasına serpiştirilir. Bitirince “5 yeni kelime daha” diyebilirsin.</p>
    <div class="pills">${[5, 10, 15, 20, 30].map(n => pill("daily", n, n)).join("")}</div></div>
  <div class="set"><h3>Günlük XP hedefi</h3><p>Her doğru cevap 10, yanlış cevap 2, yeni kelime 5, geçilen ders 50 XP kazandırır.</p>
    <div class="pills">${pill("goal", 50, "50 · rahat")}${pill("goal", 100, "100 · normal")}${pill("goal", 200, "200 · yoğun")}</div></div>
  <div class="set"><h3>Soru yönü</h3><p>Karışıkta yeni kelimeler önce Arapçadan sorulur, oturdukça iki yönden de gelir.</p>
    <div class="pills">${pill("dir", "mix", "Karışık")}${pill("dir", "ar", "Arapça → Türkçe")}${pill("dir", "tr", "Türkçe → Arapça")}${pill("dir", "listen", "Dinleme")}</div>
    <p style="margin:12px 0 6px;color:var(--ink)">Karışığa dinleme soruları da girsin</p><div class="pills">${pill("lmix", true, "Evet")}${pill("lmix", false, "Hayır")}</div>
    ${arVoice || ttsCap ? "" : `<p style="margin:10px 0 0">Bu ekranda ses çalışmadığı için dinleme soruları şimdilik Arapça → Türkçe olarak sorulur.</p>`}</div>
  <div class="set"><h3>Harekeler</h3><p>Gerçek metinlerde hareke çoğu zaman yazılmaz. Gizlersen harekesiz okumaya alışırsın; cevaptan sonra harekeli hali gösterilir.</p>
    <div class="pills">${pill("hk", "on", "Göster")}${pill("hk", "known", "İyi bildiklerimde gizle")}${pill("hk", "off", "Hep gizle")}</div></div>
  <div class="set"><h3>Otomatik seslendirme</h3><p>Kelimenin telaffuzu kart açılınca kendiliğinden okunur.</p>
    <div class="pills">${pill("auto", true, "Açık")}${pill("auto", false, "Kapalı")}</div></div>
  <div class="set"><h3>Ses</h3>${IN_CLAUDE ? `<p>Telefonların kendi Arapça sesleri tek kelimelerde harekeleri sık sık yanlış okur. Claude sesi harekelere daha sadık kalır ama yalnızca Chrome gibi tarayıcılarda çalışır; Safari’de ve Claude uygulamasında çalışmaz.${ttsCap ? " Bu ekranda Claude sesi kullanılabilir." : " Bu ekranda Claude sesi kullanılamıyor."}</p>` : `<p>Telaffuz telefonunun Arapça sesiyle okunur. Ses gelmiyorsa ya da harekeler yanlış okunuyorsa telefonun ayarlarından daha kaliteli bir Arapça ses indirebilirsin (Ayarlar → Metin okuma → Google Konuşma Hizmetleri → Ses verilerini yükle → Arapça).</p>`}
    ${IN_CLAUDE ? `<p style="margin:0 0 6px;color:var(--ink)">Ses kaynağı</p><div class="pills" style="margin-bottom:10px">${pill("voice", "auto", "Otomatik")}${pill("voice", "claude", "Claude sesi")}${pill("voice", "device", "Telefonun sesi")}</div>` : ""}
    <p style="margin:0 0 6px;color:var(--ink)">Doğru / yanlış sesleri</p><div class="pills" style="margin-bottom:10px">${pill("fx", true, "Açık")}${pill("fx", false, "Kapalı")}</div>
    <p style="margin:0 0 6px;color:var(--ink)">Hız</p><div class="pills" style="margin-bottom:10px">${pill("vrate", 0.7, "Yavaş")}${pill("vrate", 0.85, "Orta")}${pill("vrate", 1, "Normal")}</div>
    <div class="row" style="margin-top:4px">${IN_CLAUDE ? `<button class="btn" id="vtC">Claude sesini dene</button>` : ""}<button class="btn" id="vtD">${IN_CLAUDE ? "Telefonun sesini dene" : "Sesi dene"}</button></div></div>
  <div class="set"><h3>Otomatik geçiş</h3><p>Cevabı gösterdikten sonra sonraki karta kendiliğinden geçer. “Devam”a basarak beklemeden de geçebilirsin.</p>
    <p style="margin:0 0 6px;color:var(--ink)">Doğru cevapta</p><div class="pills" style="margin-bottom:12px">${[0, 1.5, 2, 3].map(n => pill("okSec", n, n ? String(n).replace(".", ",") + " sn" : "Kapalı")).join("")}</div>
    <p style="margin:0 0 6px;color:var(--ink)">Yanlış cevapta</p><div class="pills">${[0, 3, 4, 6].map(n => pill("badSec", n, n ? n + " sn" : "Kapalı")).join("")}</div></div>
  <div class="set"><h3>Kelime havuzu</h3><p>${fmt(N)} kelime, sık kullanılandan seyreğe sıralı. Bütün kelimelerin Türkçesi elle yazıldı ya da tek tek kontrol edildi. Günlük dilde nadir geçenler “(seyrek kullanılır)” diye işaretli. Yine de hatalı gördüğün bir kelimeyi bildirebilir ya da Kelimelerim’de anlamını kendin düzeltebilirsin.</p>
    ${nflag ? `<p style="margin:10px 0 6px;color:var(--ink)">Bildirdiğin kelimeler (${nflag})</p><div class="flist">${Object.keys(S.flag).slice(0, 100).map(k => `<div class="frow"><span class="ar" lang="ar">${W[k][0]}</span><span class="ft">${esc(W[k][2])}</span>${fedit === +k ? `<input id="fIn" value="${esc(W[k][2])}" aria-label="Doğru anlam"><button class="btn primary sm" data-fs="${k}">Kaydet</button>` : `<button class="btn sm" data-fe="${k}">Düzelt</button><button class="btn sm" data-fu="${k}">Geri al</button>`}</div>`).join("")}</div>
    <button class="btn" id="unflag" style="margin-top:8px">Hepsini geri al</button>` : ""}</div>
  ${dgs && tipItems.length ? `<div class="set support"><h3>Destek ol</h3><p>{{APP_NAME}} reklamsız ve ücretsiz. Beğendiysen küçük bir destekle geliştirilmesine katkıda bulunabilirsin. Destekler yalnızca teşekkür amaçlıdır, uygulamada hiçbir şeyi değiştirmez.${S.tips ? ` <b>Desteğin için teşekkürler! 🌙</b>` : ""}</p>
    ${gate ? `<div class="gate"><p><b>Ebeveyn onayı:</b> Ödemeye geçmeden önce bir yetişkin şu soruyu cevaplasın.</p><p class="gq">${gate.a} × ${gate.b} = ?</p><div class="row"><input id="gIn" inputmode="numeric" aria-label="Cevap"><button class="btn primary sm" id="gOk">Onayla</button><button class="btn sm" id="gNo">Vazgeç</button></div></div>` : `<div class="tips">${tipItems.map(d => `<button class="btn tip" data-tip="${esc(d.itemId)}"><span>${esc(TIP_LABEL[d.itemId] || d.title)}</span><b>${esc(fmtPrice(d.price))}</b></button>`).join("")}</div>`}</div>` : ""}
  <div class="set"><h3>Yedekle ve geri yükle</h3><p>İlerlemenin bir kopyasını al. Telefon değiştirdiğinde ya da uygulamayı yeniden yüklediğinde bu yedekle kaldığın yerden devam edersin.</p>
    <div class="row"><button class="btn" id="bkSave">${IN_CLAUDE ? "Yedeği kopyala" : "Yedek dosyası indir"}</button><button class="btn" id="bkLoad">Yedekten yükle</button></div>
    <input type="file" id="bkFile" accept=".json,application/json,text/plain" hidden>
    <details class="bkp"><summary>Metin olarak yapıştırıp yükle</summary><textarea id="bkText" rows="3" placeholder="Yedek metnini buraya yapıştır" aria-label="Yedek metni"></textarea><div class="row"><button class="btn sm" id="bkApply">Yapıştırılanı yükle</button></div></details></div>
  <details class="set about"><summary><h3 style="display:inline">Hakkında, kaynaklar ve lisanslar</h3></summary>
    <p><b>{{APP_NAME}}</b> Arapça kelime, dil bilgisi ve okuma çalışmaları için hazırlandı. Verilerin tamamı bu cihazda saklanır${IN_CLAUDE ? " (ve Claude hesabında eşitlenir)" : ""}; hiçbir kişisel veri toplanmaz.</p>
    <p>Geliştirici: {{DEV_NAME}}. Kaynak kodu (GPL-3.0-or-later): <a href="https://github.com/{{GITHUB_USER}}/{{REPO}}" target="_blank" rel="noopener">github.com/{{GITHUB_USER}}/{{REPO}}</a></p>
    <p>Kelime, çekim ve anlam verileri: Vikisözlük (Wiktionary) katkıcıları, kaikki.org üzerinden; lisans: CC BY-SA 4.0. Türkçe anlamlar bu veriler temel alınarak elle düzenlendi ve aynı lisansla paylaşılır.</p>
    <p>Kur’an metni, kök ve lemma bilgileri: Quranic Arabic Corpus (Kais Dukes, <a href="https://corpus.quran.com" target="_blank" rel="noopener">corpus.quran.com</a>) morfoloji verisi v0.4 ve furqan.co düzeltmeleri; lisans: GNU GPL.</p>
    <p>Kelime sıklığı: FrequencyWords (Hermit Dave), OpenSubtitles verisinden; lisans: CC BY-SA 4.0.</p>
    <p>Yazı tipleri: Amiri ve Rubik; lisans: SIL Open Font License.</p></details>
  <div class="set"><h3>İlerlemeyi sıfırla</h3><p>Tüm öğrenme geçmişin silinir.</p><button class="btn danger" id="reset">İlerlemeyi sıfırla</button></div>`;
  app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
    const k = b.dataset.k; let v = b.dataset.v;
    S.set[k] = ["daily", "okSec", "badSec", "vrate", "goal"].includes(k) ? +v : (k === "auto" || k === "lmix" || k === "fx") ? v === "true" : v;
    save(); if (cur && cur.type !== "intro") cur = null; settings();
  });
  const SAMPLE = "كَتَبَ الطَّالِبُ الدَّرْسَ";
  if ($("#vtC")) $("#vtC").onclick = () => { if (!ttsCap) { toast("Claude sesi bu ekranda kullanılamıyor."); return; } speak(SAMPLE, "claude"); };
  $("#vtD").onclick = () => deviceSpeak(spk(SAMPLE));
  app.querySelectorAll("[data-tip]").forEach(b => b.onclick = () => { gate = { sku: b.dataset.tip, a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }; settings(); const g = $("#gIn"); if (g) g.focus(); });
  const gOk = $("#gOk"); if (gOk) gOk.onclick = () => { const v = +($("#gIn").value || "").trim(); if (v === gate.a * gate.b) { const sku = gate.sku; gate = null; settings(); buyTip(sku); } else toast("Cevap yanlış."); };
  const gNo = $("#gNo"); if (gNo) gNo.onclick = () => { gate = null; settings(); };
  $("#bkSave").onclick = () => {
    const txt = JSON.stringify({ app: "elifba-kelime", v: 1, date: dayStr(), data: S });
    if (!IN_CLAUDE) {
      try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = "tilmiz-yedek-" + dayStr() + ".json"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast("Yedek dosyası indirildi."); return; } catch (e) {}
    }
    const done = () => toast("Yedek panoya kopyalandı. Bir nota yapıştırıp sakla.");
    const fallback = () => { const t = $("#bkText"); t.value = txt; t.closest("details").open = true; t.select(); toast("Yedek metni aşağıda; kopyalayıp sakla."); };
    try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
  };
  const restore = txt => {
    let o; try { o = JSON.parse(txt); } catch (e) { toast("Yedek okunamadı."); return; }
    const d = o && o.data ? o.data : o;
    if (!d || typeof d !== "object" || typeof d.p !== "object") { toast("Bu bir {{APP_NAME}} yedeği değil."); return; }
    if (!confirm("Yedek, bu cihazdaki ilerlemenin yerine geçecek. Devam edilsin mi?")) return;
    S = normalize(d); applyCM(); save(); cur = null; recent = []; hist = [];
    toast("Yedek yüklendi: " + fmt(Object.keys(S.p).length) + " kelime."); settings();
  };
  $("#bkLoad").onclick = () => $("#bkFile").click();
  $("#bkFile").onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => restore(String(r.result)); r.readAsText(f); };
  $("#bkApply").onclick = () => restore($("#bkText").value || "");
  const uf = $("#unflag"); if (uf) uf.onclick = () => { S.flag = {}; save(); toast("Bildirdiğin kelimeler geri alındı."); settings(); };
  app.querySelectorAll("[data-fu]").forEach(b => b.onclick = () => { delete S.flag[b.dataset.fu]; save(); settings(); });
  app.querySelectorAll("[data-fe]").forEach(b => b.onclick = () => { fedit = +b.dataset.fe; settings(); const f = $("#fIn"); if (f) { f.focus(); f.select(); } });
  app.querySelectorAll("[data-fs]").forEach(b => b.onclick = () => { const k = +b.dataset.fs, v = ($("#fIn").value || "").trim(); if (!v) return; S.cm[k] = v; W[k][2] = v; delete S.flag[k]; fedit = null; save(); toast("Anlam düzeltildi, kelime yeniden sorulacak."); settings(); });
  $("#reset").onclick = () => { if (confirm("Tüm ilerleme silinsin mi? Bu geri alınamaz.")) { S = DEF(); save(); cur = null; recent = []; toast("İlerleme sıfırlandı."); settings(); } };
}

// ---------- fiil çekimi verisi ----------
let CJ = DATA("conj") || {}; // id -> [mazi[13], muzari[13], emir[5]]; site sürümünde açılıştan sonra gelir (__elifbaLate)
const AP = ["أَنَا","أَنْتَ","أَنْتِ","هُوَ","هِيَ","أَنْتُمَا","هُمَا","هُمَا","نَحْنُ","أَنْتُمْ","أَنْتُنَّ","هُمْ","هُنَّ"];
const TP = [[0,"ben"],[1,"sen (erkek)"],[1,"sen (kadın)"],[2,"o (erkek)"],[2,"o (kadın)"],[4,"siz ikiniz"],[5,"o ikisi (erkek)"],[5,"o ikisi (kadın)"],[3,"biz"],[4,"siz (erkekler)"],[4,"siz (kadınlar)"],[5,"onlar (erkekler)"],[5,"onlar (kadınlar)"]];
const TRP = ["ben","sen","o","biz","siz","onlar"];
const BASIC = [0,1,2,3,4,8,9,11];
const TENSE = { p: "mazi (geçmiş)", n: "muzari (şimdiki/geniş)" };
// Türkçe fiil çekimi (yaklaşık karşılık göstermek için)
const VOW = "aeıioöuü";
const lastV = s => { for (let i = s.length - 1; i >= 0; i--) if (VOW.includes(s[i])) return s[i]; return "e"; };
const h4 = v => ({ a: "ı", ı: "ı", o: "u", u: "u", e: "i", i: "i", ö: "ü", ü: "ü" })[v] || "i";
const isBack = v => "aıou".includes(v);
function trVerb(m) {
  const t = (m || "").split(/[,;]/)[0].replace(/\(.*?\)/g, "").trim().toLocaleLowerCase("tr");
  if (t.startsWith("-") || !/(mak|mek)$/.test(t)) return null;
  const ws = t.split(/\s+/), last = ws.pop();
  return { pre: ws.length ? ws.join(" ") + " " : "", st: last.slice(0, -3) };
}
function soften(st) {
  if (["et", "git", "tat", "güt", "dit"].includes(st)) return st.slice(0, -1) + "d";
  if (/(ss|ff|dd|nn|yr|br|yb|kk|mm|ll|rr)et$/.test(st)) return st.slice(0, -1) + "d";
  return st;
}
function trPres(st, p) {
  let b;
  if (st === "de") b = "diyor"; else if (st === "ye") b = "yiyor";
  else { const lc = st[st.length - 1];
    if ("ıiuü".includes(lc)) b = st + "yor";
    else if ("ae".includes(lc)) { const s = st.slice(0, -1); b = s + h4(lastV(s)) + "yor"; }
    else { const s = soften(st); b = s + h4(lastV(s)) + "yor"; } }
  return b + ["um", "sun", "", "uz", "sunuz", "lar"][p];
}
function trPast(st, p) {
  const lc = st[st.length - 1], v = h4(lastV(st));
  const b = st + ("fstkçşhp".includes(lc) ? "t" : "d") + v;
  return b + ["m", "n", "", "k", "n" + v + "z", isBack(lastV(b)) ? "lar" : "ler"][p];
}
function trConj(id, tense, ap) {
  const b = trVerb(W[id][2]); if (!b) return "";
  const p = TP[ap][0];
  return TRP[p] + " " + b.pre + (tense === "p" ? trPast(b.st, p) : trPres(b.st, p));
}
const learned = id => !!(S.p[id] && S.p[id][0] >= 3 && !OFF(id));
const verbPool = () => Object.keys(CJ).map(Number).filter(learned);

// ---------- pratik ----------
let pv = { mode: "hub" }, cq = null;
function practice() {
  clearTimeout(advTimer);
  if (pv.mode === "conj") return conjDrill();
  if (pv.mode === "table") return conjTable(pv.id);
  if (pv.mode === "verbs") return verbList();
  if (pv.mode === "spell") return spellDrill();
  if (pv.mode === "lessons") return lessonList();
  if (pv.mode === "lesson") return lessonPage(pv.k);
  if (pv.mode === "quiz") return quizView();
  if (pv.mode === "roots") return rootList();
  if (pv.mode === "root") return rootPage(pv.r);
  if (pv.mode === "texts") return textList();
  if (pv.mode === "alf") return alfPage();
  if (pv.mode === "dlgs") return dlgList();
  if (pv.mode === "dlg") return dlgPage(pv.k);
  if (pv.mode === "text") return textPage(pv.k);
  const pool = verbPool(), st = S.cj;
  app.innerHTML = `<h2>Pratik</h2>
  <p class="sub">Bu alıştırmalarda yalnızca öğrendiğin kelimeler kullanılır: üst üste en az iki kez doğru bildiğin kelimeler.</p>
  <button class="hub" id="goLes"><span class="ar" lang="ar">قَوَاعِد</span><div><strong>Dil bilgisi dersleri</strong><span>${LESSONS.length} kısa ders, her birinde 8 soruluk alıştırma · ${Object.keys(S.gr).length} ders çalışıldı</span></div></button>
  <button class="hub" id="goAlf"><span class="ar" lang="ar">أ ب ت</span><div><strong>Elifbâ: Arap harfleri</strong><span>Harfler, harekeler ve okuma alıştırmaları; Arapça okumayı bilmiyorsan buradan başla</span></div></button>
  <button class="hub" id="goDlg"><span class="ar" lang="ar">حِوَار</span><div><strong>Konuşma pratiği</strong><span>${DLG.length} günlük diyalog, dinle ve doğru cevabı seç</span></div></button>
  <button class="hub" id="goTx"><span class="ar" lang="ar">آيَة · حَدِيث</span><div><strong>Ayet ve hadisler</strong><span>${TX.length} seçme metin, kelime kelime anlamlarıyla</span></div></button>
  <button class="hub" id="goSent"><span class="ar" lang="ar">جُمْلَة</span><div><strong>Cümle pratiği</strong><span>Öğrendiğin kelimelerle kurulmuş cümleler: anlamını bul, cümleyi kur</span></div></button>
  <button class="hub" id="goTri"><span class="ar" lang="ar">ع · T · E</span><div><strong>Üçlü çeviri</strong><span>Arapça, Türkçe ve İngilizce arasında</span></div></button>
  <button class="hub" id="goConj"><span class="ar" lang="ar">فَعَلَ</span><div><strong>Fiil çekimi</strong><span>Mazi ve muzari, ${fmt(pool.length)} öğrenilmiş fiille${st.r + st.w ? ` · başarı %${Math.round(100 * st.r / (st.r + st.w))}` : ""}</span></div></button>
  <button class="hub" id="goVerbs"><span class="ar" lang="ar">جَدْوَل</span><div><strong>Çekim tabloları</strong><span>Öğrendiğin fiillerin tam çekimi</span></div></button>
  <button class="hub" id="goSpell"><span class="ar" lang="ar">ح ر ف</span><div><strong>Harf dizme</strong><span>Türkçesi verilen kelimeyi harf harf yaz, ${fmt(spellPool().length)} öğrenilmiş kelimeyle${S.sp.r + S.sp.w ? ` · başarı %${Math.round(100 * S.sp.r / (S.sp.r + S.sp.w))}` : ""}</span></div></button>
  <button class="hub" id="goRoots"><span class="ar" lang="ar">ج ذ ر</span><div><strong>Kök aileleri</strong><span>Aynı kökten gelen kelimeler</span></div></button>`;
  $("#goAlf").onclick = () => { pv = { mode: "alf" }; practice(); window.scrollTo(0, 0); };
  $("#goDlg").onclick = () => { pv = { mode: "dlgs" }; practice(); window.scrollTo(0, 0); };
  $("#goTx").onclick = () => { pv = { mode: "texts" }; practice(); window.scrollTo(0, 0); };
  $("#goLes").onclick = () => { pv = { mode: "lessons" }; practice(); window.scrollTo(0, 0); };
  $("#goRoots").onclick = () => { pv = { mode: "roots" }; practice(); window.scrollTo(0, 0); };
  const toHub = () => { pv = { mode: "hub" }; practice(); };
  $("#goSent").onclick = () => startQuiz({ mod: "sent", gen: sentQ, need: "cinsiyeti bilinen 2 isim, 2 sıfat ya da 2 fiil (öğrenilmiş)", backLabel: "Pratik", back: toHub });
  $("#goTri").onclick = () => startQuiz({ mod: "tri", gen: triQ, need: "4 öğrenilmiş kelime", backLabel: "Pratik", back: toHub,
    extraTop: () => `<div class="pills small">${[["mix", "Karışık"], ["ar-en", "Ar → İng"], ["en-ar", "İng → Ar"], ["tr-en", "Tr → İng"], ["en-tr", "İng → Tr"]].map(([v, l]) => `<button data-tm="${v}" aria-pressed="${S.set.triM === v}">${l}</button>`).join("")}</div>` });
  $("#goSpell").onclick = () => { pv = { mode: "spell" }; sq = null; practice(); window.scrollTo(0, 0); };
  $("#goConj").onclick = () => { pv = { mode: "conj" }; cq = null; practice(); window.scrollTo(0, 0); };
  $("#goVerbs").onclick = () => { pv = { mode: "verbs" }; practice(); window.scrollTo(0, 0); };
}
function needVerbs(pool) {
  const cand = []; for (let q = 0; q < Math.min(N, 2500) && cand.length < 15; q++) { const i = ORDER[q]; if (CJ[i] && !S.p[i] && !OFF(i) && !(S.prio || []).includes(i)) cand.push(i); }
  return `<section class="tile done"><div class="ar" lang="ar">فِعْل</div>
    <p><b>Henüz yeterince fiil öğrenmedin (${pool.length}/3).</b></p><p>Çekim alıştırması öğrendiğin fiillerle yapılır. İstersen en sık kullanılan ${cand.length} fiili yeni kelime sırana öne alayım; Çalış sekmesinde sıradaki yeni kelimeler bunlar olur.</p></section>
    <div class="row"><button class="btn" id="backHub">Pratiğe dön</button>${cand.length ? `<button class="btn primary" id="prioV">Fiilleri öne al</button>` : ""}</div>`
    ;
}
function bindNeed() {
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  const b = $("#prioV"); if (b) b.onclick = () => {
    const cand = []; for (let q = 0; q < Math.min(N, 2500) && cand.length < 15; q++) { const i = ORDER[q]; if (CJ[i] && !S.p[i] && !OFF(i) && !(S.prio || []).includes(i)) cand.push(i); }
    S.prio = (S.prio || []).concat(cand); save(); cur = null;
    toast(cand.length + " fiil öne alındı. Çalış sekmesinde sıradaki yeni kelimeler bunlar."); location.hash = "#calis";
  };
}
function cjSlot(id, persons) {
  const t = S.set.cjT === "mix" ? (Math.random() < 0.5 ? "p" : "n") : S.set.cjT;
  const tbl = CJ[id][t === "p" ? 0 : 1];
  const ok = persons.filter(a => tbl[a]);
  const wts = ok.map(a => { const k = S.cj.s[t + a] || [0, 0]; return 1 + 2 * k[1] / (1 + k[0]); });
  let r = Math.random() * wts.reduce((x, y) => x + y, 0), a = ok[0];
  for (let i = 0; i < ok.length; i++) { r -= wts[i]; if (r <= 0) { a = ok[i]; break; } }
  return { t, a };
}
function makeCQ() {
  const pool = verbPool(); if (pool.length < 3) return null;
  const persons = S.set.cjP === "all" ? [...Array(13).keys()] : BASIC;
  let id = pool[Math.floor(Math.random() * pool.length)];
  if (cq && cq.id === id && pool.length > 1) id = pool[(pool.indexOf(id) + 1) % pool.length];
  const { t, a } = cjSlot(id, persons);
  const kind = S.set.cjK === "mix" ? (Math.random() < 0.5 ? "form" : "who") : S.set.cjK;
  const form = CJ[id][t === "p" ? 0 : 1][a];
  const slots = []; // [tense, person]
  for (const tt of ["p", "n"]) for (const pp of persons) if (CJ[id][tt === "p" ? 0 : 1][pp]) slots.push([tt, pp]);
  const seen = new Set([form]), opts = [[t, a]];
  const pref = shuffle(slots.filter(([tt]) => tt === t)).concat(shuffle(slots.filter(([tt]) => tt !== t)));
  for (const [tt, pp] of pref) {
    if (opts.length >= 4) break;
    const f = CJ[id][tt === "p" ? 0 : 1][pp];
    if (kind === "form" ? seen.has(f) : (f === form || opts.some(([x, y]) => x === tt && TP[y][1] === TP[pp][1]))) continue;
    seen.add(f); opts.push([tt, pp]);
  }
  return { id, t, a, kind, form, opts: shuffle(opts), picked: null };
}
function conjDrill() {
  const pool = verbPool();
  if (pool.length < 3) { app.innerHTML = needVerbs(pool); bindNeed(); return; }
  if (!cq) cq = makeCQ();
  const w = W[cq.id], pill = (k, v, l) => `<button data-k="${k}" data-v="${v}" aria-pressed="${S.set[k] === v}">${l}</button>`;
  let h = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button><div class="streak">Doğru ${S.cj.r} · Yanlış ${S.cj.w}</div></div>
  <div class="pills small">${pill("cjT", "p", "Mazi")}${pill("cjT", "n", "Muzari")}${pill("cjT", "mix", "İkisi")}<span class="sep"></span>${pill("cjP", "basic", "Temel şahıslar")}${pill("cjP", "all", "Tümü")}<span class="sep"></span>${pill("cjK", "form", "Çekimi bul")}${pill("cjK", "who", "Şahsı bul")}${pill("cjK", "mix", "Karışık")}</div>
  <section class="tile card">
    <span class="badge">${TENSE[cq.t]}</span><span class="badge r">${esc(w[2].split(/[,;]/)[0])}</span>`;
  if (cq.kind === "form") {
    const tr = trConj(cq.id, cq.t, cq.a);
    h += `<div class="ar" lang="ar" style="font-size:1.6rem;margin-top:24px;opacity:.85">${w[0]}</div>
      <div class="big ar" lang="ar" style="margin-top:0">${AP[cq.a]} …</div>
      <div class="tl">${TP[cq.a][1]}${tr ? " · “" + esc(tr) + "”" : ""}</div>`;
  } else {
    h += `<div class="big ar" lang="ar">${cq.form}</div><div class="tl">Kim, hangi zaman?</div>`;
  }
  h += `</section><div class="opts">${cq.opts.map(([tt, pp], k) => {
    const f = CJ[cq.id][tt === "p" ? 0 : 1][pp];
    const right = cq.kind === "form" ? f === cq.form : (f === cq.form);
    let cls = ""; if (cq.picked !== null) cls = right ? "ok" : (k === cq.picked ? "no" : "dim");
    return `<button class="${cls}" data-o="${k}" ${cq.picked !== null ? "disabled" : ""}>${cq.kind === "form" ? `<span class="ar" lang="ar">${f}</span>` : `<span class="ar" lang="ar" style="font-size:1.35rem">${AP[pp]}</span><br>${TP[pp][1]} · ${tt === "p" ? "mazi" : "muzari"}`}</button>`;
  }).join("")}</div>`;
  if (cq.picked !== null) {
    const [tt, pp] = cq.opts[cq.picked], f = CJ[cq.id][tt === "p" ? 0 : 1][pp], ok = f === cq.form;
    const tr = trConj(cq.id, cq.t, cq.a);
    h += `<div class="fb" role="status"><div class="verdict ${ok ? "good" : "bad"}">${ok ? "Doğru!" : "Yanlış."}</div>
      <span class="ar" lang="ar">${AP[cq.a]} ${cq.form}</span>
      <div class="m">${TP[cq.a][1]} · ${TENSE[cq.t]}</div>
      <div class="t">${tr ? esc(tr) : esc(w[2])}</div>
      <div class="t">${esc(w[1])} = ${esc(w[2].split(/[,;]/)[0])}</div></div>
      <div class="row">${listenBtn(AP[cq.a] + " " + cq.form)}<button class="btn primary adv" id="next"><span class="fill" id="fill"></span><span class="lbl">Devam</span></button></div>
      <div class="links"><button class="linkbtn" id="tbl">Bu fiilin tablosu</button>${secs(ok) ? `<button class="linkbtn" id="pause">${cq.paused ? "Otomatik geçiş durdu" : "Duraklat"}</button>` : ""}</div>`;
  }
  app.innerHTML = h;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; cq = null; practice(); };
  app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { S.set[b.dataset.k] = b.dataset.v; save(); cq = null; practice(); });
  if (cq.picked === null) {
    if (cq.kind === "who" && S.set.auto && hasGesture && !cq.spoke) { cq.spoke = true; speak(cq.form); }
    app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
      cq.picked = +b.dataset.o; const [tt, pp] = cq.opts[cq.picked]; const ok = CJ[cq.id][tt === "p" ? 0 : 1][pp] === cq.form; fx(ok);
      const k = cq.t + cq.a; S.cj.s[k] = S.cj.s[k] || [0, 0]; S.cj.s[k][ok ? 0 : 1]++; S.cj[ok ? "r" : "w"]++;
      ensureDay(); markStudy(); logDay("x", 1); if (ok) logDay("xo", 1); save();
      cq.advAt = secs(ok) ? Date.now() + secs(ok) * 1000 : 0;
      if (S.set.auto) speak(AP[cq.a] + " " + cq.form);
      practice();
    });
  } else {
    const go = () => { clearTimeout(advTimer); cq = makeCQ(); practice(); };
    $("#next").onclick = go;
    $("#tbl").onclick = () => { clearTimeout(advTimer); cq.paused = true; pv = { mode: "table", id: cq.id, from: "conj" }; practice(); };
    const pz = $("#pause"); if (pz) pz.onclick = () => { cq.paused = true; clearTimeout(advTimer); practice(); };
    if (cq.advAt && !cq.paused) {
      const ok = CJ[cq.id][cq.opts[cq.picked][0] === "p" ? 0 : 1][cq.opts[cq.picked][1]] === cq.form;
      const total = secs(ok) * 1000, left = Math.max(0, cq.advAt - Date.now()), f = $("#fill");
      f.style.transition = "none"; f.style.width = (100 * (1 - left / (total || 1))) + "%";
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = "width " + left + "ms linear"; f.style.width = "100%"; }));
      advTimer = setTimeout(() => { if (view === "pratik" && pv.mode === "conj") go(); }, left);
    }
  }
}
function conjTable(id) {
  const w = W[id], c = CJ[id];
  if (!c) { pv = { mode: "hub" }; return practice(); }
  const back = pv.from === "conj" ? "← Alıştırmaya dön" : pv.from === "list" ? "← Kelimelerim" : "← Fiiller";
  const IMPP = [1, 2, 5, 9, 10];
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backT">${back}</button></div>
  <section class="tile card" style="min-height:0;padding:18px"><div class="big ar" lang="ar" style="margin-top:0">${w[0]}</div>${cardInfo(w)}${listenBtn(w[0])}</section>
  <div class="ctab"><table><thead><tr><th>Şahıs</th><th>Mazi</th><th>Muzari</th></tr></thead><tbody>
  ${AP.map((p, a) => `<tr><td><span class="ar" lang="ar">${p}</span><small>${TP[a][1]}</small></td>
    <td>${c[0][a] ? `<button class="cf" data-say="${esc(p + " " + c[0][a])}"><span class="ar" lang="ar">${c[0][a]}</span><small>${esc(trConj(id, "p", a).replace(/^\S+ /, ""))}</small></button>` : "—"}</td>
    <td>${c[1][a] ? `<button class="cf" data-say="${esc(p + " " + c[1][a])}"><span class="ar" lang="ar">${c[1][a]}</span><small>${esc(trConj(id, "n", a).replace(/^\S+ /, ""))}</small></button>` : "—"}</td></tr>`).join("")}
  </tbody></table></div>
  ${c[2] && c[2].some(Boolean) ? `<h3 style="margin:16px 0 6px">Emir (buyruk)</h3><div class="ctab"><table><tbody>${IMPP.map((a, k) => c[2][k] ? `<tr><td><span class="ar" lang="ar">${AP[a]}</span><small>${TP[a][1]}</small></td><td><button class="cf" data-say="${esc(c[2][k])}"><span class="ar" lang="ar">${c[2][k]}</span></button></td></tr>` : "").join("")}</tbody></table></div>` : ""}
  <p class="sub" style="margin-top:12px">Bir çekime dokununca okunur. Türkçe karşılıklar yaklaşık ve otomatik üretilmiştir.</p>`;
  $("#backT").onclick = () => { if (pv.from === "list") { pv = { mode: "hub" }; location.hash = "#kelimelerim"; return; } pv = { mode: pv.from === "conj" ? "conj" : "verbs" }; practice(); };
}
function verbList() {
  const pool = verbPool().sort((a, b) => a - b);
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><h2>Çekim tabloları</h2>
  <p class="sub">Öğrendiğin ${fmt(pool.length)} fiil. Birine dokun, tam çekimini gör.</p>
  ${pool.length ? `<div class="list">${pool.map(i => `<button class="vrow" data-i="${i}"><div><div class="m">${esc(W[i][2])}</div><div class="t">${esc(W[i][1])}</div></div><span class="ar" lang="ar">${W[i][0]}</span></button>`).join("")}</div>` : needVerbs(pool)}`;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  if (!pool.length) bindNeed();
  app.querySelectorAll(".vrow").forEach(b => b.onclick = () => { pv = { mode: "table", id: +b.dataset.i, from: "verbs" }; practice(); window.scrollTo(0, 0); });
}

// ---------- harf dizme ----------
const SIM = ["بتثني", "جحخ", "دذ", "رز", "سش", "صض", "طظ", "عغ", "فق", "هة", "اأإآ", "وؤ", "ىي"];
const ALLL = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
let sq = null;
function spellPool() {
  const out = [];
  for (const k in S.p) { const id = +k; if (!learned(id)) continue; const b = bare(W[id][0]).replace(/ٱ/g, "ا"); if (b.length >= 2 && b.length <= 9 && /^[\u0621-\u064A]+$/.test(b)) out.push(id); }
  return out;
}
function makeSQ() {
  const pool = spellPool(); if (pool.length < 3) return null;
  let id = pool[Math.floor(Math.random() * pool.length)];
  if (sq && sq.id === id && pool.length > 1) id = pool[(pool.indexOf(id) + 1) % pool.length];
  const ans = Array.from(bare(W[id][0]).replace(/ٱ/g, "ا"));
  const extra = [];
  const cands = shuffle(SIM.filter(g => ans.some(c => g.includes(c))).join("").split("").filter(c => !ans.includes(c)));
  for (const c of cands.concat(shuffle(ALLL.split("")))) { if (extra.length >= Math.min(3, Math.max(2, ans.length - 2))) break; if (!ans.includes(c) && !extra.includes(c)) extra.push(c); }
  const tiles = shuffle(ans.concat(extra).map((c, i) => ({ c, i })));
  return { id, ans, tiles, used: [], done: null };
}
function spellDrill() {
  const pool = spellPool();
  if (pool.length < 3) {
    app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><section class="tile done"><div class="ar" lang="ar">حَرْف</div><p><b>Henüz yeterince öğrenilmiş kelimen yok (${pool.length}/3).</b></p><p>Harf dizme, öğrendiğin kelimelerle yapılır. Çalış sekmesinde birkaç gün devam edince açılır.</p></section>`;
    $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); }; return;
  }
  if (!sq) sq = makeSQ();
  const w = W[sq.id], built = sq.used.map(k => sq.tiles[k].c).join("");
  let h = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button><div class="streak">Doğru ${S.sp.r} · Yanlış ${S.sp.w}</div></div>
  <section class="tile card">
    <span class="badge">Harf dizme</span><span class="badge r">${sq.ans.length} harf</span>
    <div class="trbig">${esc(w[2])}</div>
    ${listenBtn(w[0], "İpucu: dinle")}
  </section>
  <div class="built ${sq.done === true ? "ok" : sq.done === false ? "no" : ""}" aria-live="polite"><span class="ar" lang="ar">${built || "&nbsp;"}</span></div>`;
  if (sq.done === null) {
    h += `<div class="tiles">${sq.tiles.map((t, k) => `<button class="tl8 ar" lang="ar" data-t="${k}" ${sq.used.includes(k) ? "disabled" : ""}>${t.c}</button>`).join("")}</div>
    <div class="row"><button class="btn" id="undo" ${sq.used.length ? "" : "disabled"}>⌫ Sil</button><button class="btn" id="giveup">Göster</button></div>`;
  } else {
    const ok = sq.done;
    h += `<div class="fb" role="status"><div class="verdict ${ok ? "good" : "bad"}">${ok ? "Doğru!" : "Doğrusu:"}</div>
      <span class="ar" lang="ar">${w[0]}</span><div class="m">${esc(w[2])}</div><div class="t">${esc(w[1])}</div>${cogLine(sq.id)}</div>
      <div class="row">${listenBtn(w[0])}<button class="btn primary adv" id="next"><span class="fill" id="fill"></span><span class="lbl">Devam</span></button></div>
      ${secs(ok) ? `<div class="links"><button class="linkbtn" id="pause">${sq.paused ? "Otomatik geçiş durdu" : "Duraklat"}</button></div>` : ""}`;
  }
  app.innerHTML = h;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; sq = null; practice(); };
  const finish = ok => {
    fx(ok); sq.done = ok; S.sp[ok ? "r" : "w"]++; logDay("x", 1); if (ok) logDay("xo", 1); ensureDay(); markStudy(); save();
    sq.advAt = secs(ok) ? Date.now() + secs(ok) * 1000 : 0; if (S.set.auto) speak(w[0]); practice();
  };
  if (sq.done === null) {
    app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => {
      sq.used.push(+b.dataset.t);
      if (sq.used.length === sq.ans.length) finish(sq.used.map(k => sq.tiles[k].c).join("") === sq.ans.join(""));
      else practice();
    });
    $("#undo").onclick = () => { sq.used.pop(); practice(); };
    $("#giveup").onclick = () => finish(false);
  } else {
    const go = () => { clearTimeout(advTimer); sq = makeSQ(); practice(); };
    $("#next").onclick = go;
    const pz = $("#pause"); if (pz) pz.onclick = () => { sq.paused = true; clearTimeout(advTimer); practice(); };
    if (sq.advAt && !sq.paused) {
      const total = secs(sq.done) * 1000, left = Math.max(0, sq.advAt - Date.now()), f = $("#fill");
      f.style.transition = "none"; f.style.width = (100 * (1 - left / (total || 1))) + "%";
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = "width " + left + "ms linear"; f.style.width = "100%"; }));
      advTimer = setTimeout(() => { if (view === "pratik" && pv.mode === "spell") go(); }, left);
    }
  }
}

// ---------- istatistik ----------
function logDay(f, n) {
  const d = dayStr(); S.log = S.log || {}; const e = S.log[d] = S.log[d] || {};
  e[f] = (e[f] || 0) + n;
  const xp = (XPW[f] || 0) * n;
  if (xp) { e.xp = (e.xp || 0) + xp; S.xp = (S.xp || 0) + xp; const g = +S.set.goal || 100; if (!e.gh && e.xp >= g) { e.gh = 1; setTimeout(() => toast("🎯 Günlük hedefe ulaştın: " + g + " XP!"), 300); } }
  const ks = Object.keys(S.log).sort(); while (ks.length > 400) delete S.log[ks.shift()];
}
function statsBlock() {
  const L = S.log || {}, days = [], names = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  for (let i = 6; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); const k = dayStr(dt); const e = L[k] || {}; days.push({ k, lab: i === 0 ? "Bugün" : names[dt.getDay()], tot: (e.r || 0) + (e.x || 0), ok: (e.ok || 0) + (e.xo || 0), n: e.n || 0 }); }
  const tot = days.reduce((a, d) => a + d.tot, 0), ok = days.reduce((a, d) => a + d.ok, 0), nn = days.reduce((a, d) => a + d.n, 0);
  const kNow = counts().known; let kBase = null;
  const keys = Object.keys(L).sort();
  for (const k of keys) { if (k < days[0].k && L[k].k !== undefined) kBase = L[k].k; }
  if (kBase === null) { const f = keys.find(k => k >= days[0].k && L[k].k !== undefined); kBase = f ? Math.max(0, L[f].k - (L[f].kd || 0)) : kNow; }
  const mx = Math.max(10, ...days.map(d => d.tot)), bw = 30, gap = 14, H = 90;
  const bars = days.map((d, i) => { const x = 8 + i * (bw + gap), h = Math.round(H * d.tot / mx), ho = Math.round(H * d.ok / mx);
    return `<rect x="${x}" y="${100 - h}" width="${bw}" height="${h}" rx="5" style="fill:var(--soft)"/><rect x="${x}" y="${100 - ho}" width="${bw}" height="${ho}" rx="5" style="fill:var(--tile)"/>
    ${d.tot ? `<text x="${x + bw / 2}" y="${96 - h}" text-anchor="middle" style="fill:var(--muted);font-size:10px">${d.tot}</text>` : ""}
    <text x="${x + bw / 2}" y="116" text-anchor="middle" style="fill:var(--muted);font-size:10px">${d.lab}</text>`; }).join("");
  return `<div class="statsbox"><div class="sh"><b>Son 7 gün</b><span>${tot ? `${fmt(tot)} cevap · %${Math.round(100 * ok / tot)} doğru` : "Henüz kayıt yok"}</span></div>
    <svg viewBox="0 0 322 122" role="img" aria-label="Son 7 günün cevap sayıları">${bars}</svg>
    <div class="sf"><span><b>${fmt(nn)}</b> yeni kelime</span><span><b>${kNow - kBase >= 0 ? "+" : ""}${fmt(kNow - kBase)}</b> iyi bilinen</span><span><b>${streakNow()}</b> gün seri</span></div></div>`;
}

// ================= DİL BİLGİSİ, CÜMLE, ÜÇLÜ ÇEVİRİ, KÖK =================
const ROOT = DATA("roots"); // id -> kök
const GEN = DATA("gender"); // {g:{id:m|f}, f:{id:dişil sıfat}}
const FAM = {}; for (const k in ROOT) (FAM[ROOT[k]] = FAM[ROOT[k]] || []).push(+k);
const rootTxt = r => r.split("").join(" ");
const IDX = {}; W.forEach((w, i) => { if (!(w[0] in IDX)) IDX[w[0]] = i; });
const SUN = "تثدذرزسشصضطظلن";
const pick1 = a => a[Math.floor(Math.random() * a.length)];
const cap = s => s ? s.charAt(0).toLocaleUpperCase("tr") + s.slice(1) : s;
const learnedIds = () => POOLX || Object.keys(S.p).map(Number).filter(learned);
const RARE = i => /seyrek kullanılır/.test(W[i][2]);
const gramIds = () => learnedIds().filter(i => !RARE(i));

// --- Arapça yardımcılar ---
function caseable(w) {
  if (/\s/.test(w) || /[\u064B-\u064D]/.test(w)) return false;
  const b = bare(w); if (b.length < 2) return false;
  const l = b[b.length - 1];
  if ("اىوآ".includes(l)) return false;
  if (l === "ي" && !/يّ$/.test(w)) return false;
  return true;
}
const defArt = w => SUN.includes(w[0]) ? "ال" + w[0] + "ّ" + w.slice(1) : "الْ" + w;
const okDef = w => w[0] !== "ا";
const tMarb = w => w.replace(/ة$/, "ت");
const femOf = i => { const w = W[i][0]; if (GEN.f[i]) return caseable(GEN.f[i]) ? GEN.f[i] : null; const b = bare(w); if (/ة$/.test(w) || /^[اأ]/.test(b) && b.length === 4) return null; return w + "َة"; };
const genderOf = i => GEN.g[i] || null;

// --- Türkçe yardımcılar ---
const t1 = m => { if (/^[A-ZÇĞİÖŞÜ]/.test(m || "")) return null; const x = (m || "").split(/[,;]/)[0].replace(/\(.*?\)/g, "").trim().toLocaleLowerCase("tr"); return /^[a-zçğıöşüâîû]+$/.test(x) ? x : null; };
const FRONT = new Set("saat hal kalp harp dikkat hakikat kabul ihtimal istikbal istiklal misal sual rol gol alkol kontrol petrol futbol hayal meal terminal festival emsal ahval idrak ittifak ahlak".split(" "));
const SKIPN = new Set(["su", "ne", "ya"]);
const EXW = new Set(["آسِف", "كُلّ", "بَعْض", "شَيْء", "أَحَد", "غَيْر", "نَفْس", "ثَالِث", "ثَانٍ", "أَوَّل", "آخِر", "آخَر", "أَكْثَر", "أَفْضَل", "وَحِيد"]);
const diptA = w => { const b = bare(w); return (/^[اأ]/.test(b) && b.length === 4) || (/ان$/.test(b) && b.length === 5); };
const diptN = w => { const b = bare(w); return /اء$/.test(b) && b.length >= 5; };
const nv = n => FRONT.has(n) ? "e" : lastV(n.replace(/[âîû]/g, c => ({ â: "a", î: "i", û: "u" })[c]));
const isVowEnd = n => VOW.includes(n[n.length - 1]) || "âîû".includes(n[n.length - 1]);
function softN(n) {
  const m = { kalp: "kalb", renk: "reng", harp: "harb" }; if (m[n]) return m[n];
  if ((n.match(/[aeıioöuüâîû]/g) || []).length < 2) return n;
  const l = n[n.length - 1];
  if (l === "p") return n.slice(0, -1) + "b";
  if (l === "ç") return n.slice(0, -1) + "c";
  if (l === "k") return n.slice(0, -1) + (n[n.length - 2] === "n" ? "g" : "ğ");
  return n;
}
function poss(n, p) { // p: 0 ben,1 sen,2 o,3 biz,4 siz,5 onlar
  const v = h4(nv(n)), back = isBack(nv(n));
  if (p === 5) return n + (back ? "ları" : "leri");
  if (isVowEnd(n)) return n + ["m", "n", "s" + v, "m" + v + "z", "n" + v + "z"][p];
  const s = softN(n); return s + v + ["m", "n", "", "m" + v + "z", "n" + v + "z"][p];
}
const genT = n => isVowEnd(n) ? n + "n" + h4(nv(n)) + "n" : softN(n) + h4(nv(n)) + "n";
function trV(id, kind, p) {
  const b = trVerb(W[id][2]); if (!b) return null;
  const st = b.st, back = isBack(lastV(st)), A = back ? "a" : "e";
  let f;
  if (kind === "pres") f = trPres(st, p);
  else if (kind === "past") f = trPast(st, p);
  else if (kind === "negpres") f = st + "m" + h4(lastV(st)) + "yor" + ["um", "sun", "", "uz", "sunuz", "lar"][p];
  else if (kind === "negpast") f = st + "m" + A + "d" + (back ? "ı" : "i") + ["m", "n", "", "k", back ? "nız" : "niz", back ? "lar" : "ler"][p];
  else if (kind === "fut" || kind === "negfut") {
    let base;
    if (kind === "negfut") base = st + "m" + (back ? "ayaca" : "eyece");
    else if (st === "de" || st === "ye") base = st[0] + "iyece";
    else base = (isVowEnd(st) ? st + "y" : soften(st)) + (back ? "aca" : "ece");
    const fb = kind === "negfut" ? back : (st === "de" || st === "ye") ? false : back;
    f = base + (fb ? ["ğım", "ksın", "k", "ğız", "ksınız", "klar"] : ["ğim", "ksin", "k", "ğiz", "ksiniz", "kler"])[p];
  }
  else if (kind === "imp") return b.pre + st + "!";
  else if (kind === "negimp") return b.pre + st + "m" + A + "!";
  return b.pre + f;
}
const TRPRO = p => ["ben", "sen", "o", "biz", "siz", "onlar"][p];

// --- havuzlar (yalnızca öğrenilmiş kelimeler) ---
function poolN(needG) { return gramIds().filter(i => W[i][4] === "noun" && !EXW.has(W[i][0]) && !diptN(W[i][0]) && caseable(W[i][0]) && okDef(W[i][0]) && t1(W[i][2]) && !SKIPN.has(t1(W[i][2])) && (!needG || genderOf(i))); }
function poolA() { return gramIds().filter(i => W[i][4] === "adj" && !EXW.has(W[i][0]) && !diptA(W[i][0]) && caseable(W[i][0]) && okDef(W[i][0]) && t1(W[i][2]) && femOf(i)); }
const PREFV = ["كَتَبَ", "ذَهَبَ", "فَتَحَ", "دَرَسَ", "شَرِبَ", "جَلَسَ", "خَرَجَ", "دَخَلَ"];
const exV = list => { for (const v of PREFV) if (IDX[v] !== undefined && list.includes(IDX[v])) return IDX[v]; return list.find(i => !["كَانَ", "لَيْسَ"].includes(W[i][0])) ?? IDX["كَتَبَ"]; };
const EXV = new Set(["كَانَ", "لَيْسَ", "أَصْبَحَ", "صَارَ", "وَجَبَ", "اِسْتَطَاعَ"]);
function poolV(kinds) { return gramIds().filter(i => CJ[i] && !EXV.has(W[i][0]) && trVerb(W[i][2]) && (kinds || []).every(k => k())); }
const poolVneg = () => gramIds().filter(i => CJ[i] && !EXV.has(W[i][0]) && trVerb(W[i][2]) && CJ[i][3] && CJ[i][4] && CJ[i][3][3] && CJ[i][4][3]);
const poolPl = () => gramIds().filter(i => W[i][4] === "noun" && W[i][5] && !EXW.has(W[i][0]) && !/[ءأؤئ]$/.test(bare(W[i][0])) && caseable(W[i][0]) && t1(W[i][2]) && bare(W[i][5]) !== bare(W[i][0]));
const exN = (pool, fallback) => pool.length ? pick1(pool) : IDX[fallback];
const mark = i => learned(i) ? "" : ` <small class="mut">(örnek)</small>`;
const arS = (t, big) => `<span class="ar" lang="ar"${big ? ' style="font-size:1.6rem"' : ""}>${t}</span>`;
function opts4(correct, wrongs) { const seen = new Set([correct.k]); const o = [{ h: correct.h, ok: true }]; for (const w of shuffle(wrongs)) { if (o.length >= 4) break; if (seen.has(w.k)) continue; seen.add(w.k); o.push({ h: w.h, ok: false }); } return shuffle(o); }

// --- DERSLER ---
const PRON_EX = ["أَنَا", "أَنْتَ", "أَنْتِ", "هُوَ", "هِيَ", "نَحْنُ", "أَنْتُمْ", "هُمْ"];
const LESSONS = [
 { id: "zamir", t: "Şahıs zamirleri", ar: "أَنَا", need: 0,
   body: () => `<p>Arapçada “sen”, “o”, “siz” ve “onlar” için erkek ve kadın ayrı zamirler vardır. Ayrıca iki kişi için ikil (tesniye) zamirleri bulunur.</p>
   <div class="ctab"><table><tbody>${AP.map((p, a) => `<tr><td>${arS(p, 1)}</td><td>${TP[a][1]}</td></tr>`).join("")}</tbody></table></div>
   <p>Arapçada “olmak” fiili şimdiki zamanda kullanılmaz: <span class="ar" lang="ar">أَنَا طَالِبٌ</span> “Ben öğrenciyim.”</p>`,
   q: () => { const a = pick1([0, 1, 2, 3, 4, 8, 9, 11, 12]); const toAr = Math.random() < .5;
     const others = [...Array(13).keys()].filter(x => x !== a && AP[x] !== AP[a]);
     return toAr ? { badge: "Zamir", prompt: `<div class="trbig">${TP[a][1]}</div>`, opts: opts4({ k: AP[a], h: arS(AP[a]) }, others.map(x => ({ k: AP[x], h: arS(AP[x]) }))), fb: `${arS(AP[a])} = ${TP[a][1]}`, say: AP[a] }
       : { badge: "Zamir", prompt: `<div class="big ar" lang="ar">${AP[a]}</div>`, sayFirst: AP[a], opts: opts4({ k: TP[a][1], h: TP[a][1] }, others.filter(x => TP[x][1] !== TP[a][1] && AP[x] !== AP[a]).map(x => ({ k: TP[x][1], h: TP[x][1] }))), fb: `${arS(AP[a])} = ${TP[a][1]}`, say: AP[a] }; } },
 { id: "soru", t: "Soru kelimeleri", ar: "؟", need: 0,
   body: () => `<p>Evet/hayır soruları cümlenin başına <span class="ar" lang="ar">هَلْ</span> getirilerek sorulur. Diğer soru kelimeleri de cümlenin başında durur.</p>
   <div class="ctab"><table><tbody>${QW.map(([a, t]) => `<tr><td>${arS(a, 1)}</td><td>${t}</td></tr>`).join("")}</tbody></table></div>`,
   q: () => { const [a, t] = pick1(QW); const toAr = Math.random() < .5;
     return toAr ? { badge: "Soru kelimesi", prompt: `<div class="trbig">${t}</div>`, opts: opts4({ k: a, h: arS(a) }, QW.filter(x => x[0] !== a).map(x => ({ k: x[0], h: arS(x[0]) }))), fb: `${arS(a)} = ${t}`, say: a }
       : { badge: "Soru kelimesi", prompt: `<div class="big ar" lang="ar">${a}</div>`, sayFirst: a, opts: opts4({ k: t, h: t }, QW.filter(x => x[1] !== t).map(x => ({ k: x[1], h: x[1] }))), fb: `${arS(a)} = ${t}`, say: a }; } },
 { id: "tarif", t: "El- takısı: şemsi ve kameri harfler", ar: "ال", need: 4, needTxt: "4 öğrenilmiş isim",
   body: () => { const pn = poolN(); const s = pn.find(i => SUN.includes(W[i][0][0])) ?? IDX["شَمْس"], m = pn.find(i => !SUN.includes(W[i][0][0])) ?? IDX["قَمَر"];
     return `<p><span class="ar" lang="ar">ال</span> (el-) ismi belirli yapar, İngilizcedeki “the” gibidir.</p>
     <p><b>Şemsi (güneş) harfler:</b> <span class="ar" lang="ar" style="font-size:1.3rem">${SUN.split("").join(" ")}</span>. Bunlarla başlayan isimlerde “l” okunmaz, ilk harf şeddeli (çift) okunur: ${arS(defArt(W[s][0]), 1)} ${tlDef(s)}${mark(s)}</p>
     <p><b>Kameri (ay) harfler:</b> diğer harfler. “l” okunur: ${arS(defArt(W[m][0]), 1)} ${tlDef(m)}${mark(m)}</p>`; },
   q: () => { const pn = poolN(); if (pn.length < 4) return null; const i = pick1(pn), w = W[i][0], sun = SUN.includes(w[0]);
     const wrong = sun ? "الْ" + w : "ال" + w[0] + "ّ" + w.slice(1);
     if (Math.random() < .5) return { badge: "Şemsi mi kameri mi?", prompt: `<div class="big ar" lang="ar">${w}</div><div class="tl">${esc(W[i][2])}</div>`, sayFirst: w, one: true,
       opts: shuffle([{ h: "Şemsi harf: l okunmaz", ok: sun }, { h: "Kameri harf: l okunur", ok: !sun }]), fb: `${arS(defArt(w))} ${tlDef(i)}`, say: defArt(w) };
     return { badge: "Doğru yazım", prompt: `<div class="trbig">${esc(t1(W[i][2]) || W[i][2])} (belirli)</div>`, one: true,
       opts: shuffle([{ h: arS(defArt(w)) + " " + tlDef(i), ok: true }, { h: arS(wrong) + " " + (sun ? "el-" + W[i][1] : "e" + W[i][1][0] + "-" + W[i][1]), ok: false }]), fb: `${arS(defArt(w))} ${tlDef(i)}: ${sun ? "şemsi harf" : "kameri harf"}`, say: defArt(w) }; } },
 { id: "cins", t: "Eril ve dişil isimler", ar: "ة", need: 4, needTxt: "cinsiyeti bilinen 4 öğrenilmiş isim",
   body: () => `<p>Arapçada her isim ya eril (müzekker) ya dişildir (müennes). Dişil isimlerin çoğu <b>ة</b> (yuvarlak te) ile biter: ${arS(W[IDX["مَدْرَسَة"]][0], 1)} okul.</p>
   <p>Bazı dişil isimlerde işaret yoktur: ${arS("أُمّ")} anne, ${arS("بِنْت")} kız, ${arS("شَمْس")} güneş, ${arS("أَرْض")} yer, ${arS("نَار")} ateş.</p><p>Sıfatlar, fiiller ve işaret zamirleri ismin cinsine uyar; bu yüzden cinsiyeti bilmek önemlidir.</p>`,
   q: () => { const pn = poolN(true); if (pn.length < 4) return null; const i = pick1(pn), g = genderOf(i), w = W[i][0];
     return { badge: "Eril mi dişil mi?", prompt: `<div class="big ar" lang="ar">${vz(w, i)}</div><div class="tl">${esc(W[i][2])}</div>`, sayFirst: w, one: true,
       opts: [{ h: "Eril (müzekker)", ok: g === "m" }, { h: "Dişil (müennes)", ok: g === "f" }], fb: `${arS(w)} ${g === "f" ? "dişildir" : "erildir"}.${g === "f" && !/ة$/.test(w) ? " ة ile bitmediği hâlde dişildir." : g === "m" && /ة$/.test(w) ? " ة ile bittiği hâlde erildir." : ""}`, say: w }; } },
 { id: "isaret", t: "Bu, şu: işaret zamirleri", ar: "هٰذَا", need: 4, needTxt: "cinsiyeti bilinen 4 öğrenilmiş isim",
   body: () => { const pn = poolN(true); const m = pn.find(i => genderOf(i) === "m") ?? IDX["كِتَاب"], f = pn.find(i => genderOf(i) === "f") ?? IDX["مَدْرَسَة"];
     return `<p>${arS("هٰذَا", 1)} “bu” (eril), ${arS("هٰذِهِ", 1)} “bu” (dişil); ${arS("ذٰلِكَ", 1)} “şu” (eril), ${arS("تِلْكَ", 1)} “şu” (dişil).</p>
     <p>İsim belirsiz ve tenvinli gelir, “bir” anlamı katar:</p>
     <p>${arS("هٰذَا " + W[m][0] + "ٌ", 1)} ${cap("bu bir " + t1(W[m][2] || "") )}.${mark(m)}</p><p>${arS("هٰذِهِ " + W[f][0] + "ٌ", 1)} ${cap("bu bir " + (t1(W[f][2]) || ""))}.${mark(f)}</p>`; },
   q: () => { const pn = poolN(true); if (pn.length < 4) return null; const i = pick1(pn), g = genderOf(i), w = W[i][0] + "ٌ";
     const near = Math.random() < .6, dm = near ? "هٰذَا" : "ذٰلِكَ", df = near ? "هٰذِهِ" : "تِلْكَ", ok = (g === "m" ? dm : df) + " " + w, bad = (g === "m" ? df : dm) + " " + w;
     return { badge: "Doğru işaret zamiri", prompt: `<div class="trbig">${cap((near ? "bu" : "şu") + " bir " + t1(W[i][2]))}.</div>`, one: true,
       opts: shuffle([{ h: arS(ok), ok: true }, { h: arS(bad), ok: false }]), fb: `${arS(ok)}: ${arS(W[i][0])} ${g === "f" ? "dişil" : "eril"} olduğu için ${arS(g === "m" ? dm : df)}.`, say: ok }; } },
 { id: "isimcumle", t: "İsim cümlesi", ar: "جُمْلَة", need: 1, needTxt: "cinsiyeti bilinen 3 öğrenilmiş isim ve 2 öğrenilmiş sıfat",
   body: () => { const [n, a] = exNA(); return `<p>İsim cümlesi “X, Y’dir” demektir ve “olmak” fiili kullanılmaz. Özne (mübteda) belirli ve ötreli (-u), haber belirsiz ve tenvinlidir (-un).</p>
     <p>${arS(nomSent(n, a), 1)}<br>${trNom(n, a)}${mark(n)}${mark(a)}</p><p>Haber, öznenin cinsine uyar: dişil özneyle sıfata <b>ة</b> eklenir.</p>`; },
   q: () => { const pn = poolN(true), pa = poolA(); if (pn.length < 3 || pa.length < 2) return null; const n = pick1(pn), a = pick1(pa), g = genderOf(n);
     const sub = defArt(W[n][0]) + "ُ", okA = (g === "f" ? femOf(a) : W[a][0]) + "ٌ", badA = (g === "f" ? W[a][0] : femOf(a)) + "ٌ";
     if (Math.random() < .5) return { badge: "Doğru haber", prompt: `<div class="trbig">${trNom(n, a)}</div>`, one: true, opts: shuffle([{ h: arS(sub + " " + okA), ok: true }, { h: arS(sub + " " + badA), ok: false }]), fb: `${arS(sub + " " + okA)}: özne ${g === "f" ? "dişil, sıfat da dişil" : "eril, sıfat da eril"}.`, say: sub + " " + okA };
     const o = [{ k: trNom(n, a), h: trNom(n, a) }]; const wr = [];
     for (let t = 0; t < 12 && wr.length < 6; t++) { const n2 = pick1(pn), a2 = pick1(pa); const s = trNom(n2, a2); if (s !== o[0].k) wr.push({ k: s, h: s }); }
     return { badge: "Anlamı ne?", prompt: `<div class="big ar" lang="ar" style="font-size:2.3rem">${sub} ${okA}</div>`, sayFirst: sub + " " + okA, one: true, opts: opts4(o[0], wr), fb: `${arS(sub + " " + okA)} = ${trNom(n, a)}`, say: sub + " " + okA }; } },
 { id: "sifat", t: "Sıfat tamlaması", ar: "صِفَة", need: 1, needTxt: "cinsiyeti bilinen 3 öğrenilmiş isim ve 2 öğrenilmiş sıfat",
   body: () => { const [n, a] = exNA(); const g = genderOf(n) || "m", A = g === "f" ? femOf(a) : W[a][0];
     return `<p>Sıfat ismin <b>arkasından</b> gelir ve ona cinsiyet, belirlilik ve harekede uyar.</p>
     <p>${arS(W[n][0] + "ٌ " + A + "ٌ", 1)} ${t1(W[a][2])} bir ${t1(W[n][2])}</p>
     <p>${arS(defArt(W[n][0]) + "ُ " + defArt(A) + "ُ", 1)} ${t1(W[a][2])} ${t1(W[n][2])}</p>
     <p>Dikkat: sıfatta el- yoksa cümle olur: ${arS(defArt(W[n][0]) + "ُ " + A + "ٌ", 1)} ${trNom(n, a)}${mark(n)}${mark(a)}</p>`; },
   q: () => { const pn = poolN(true), pa = poolA(); if (pn.length < 3 || pa.length < 2) return null; const n = pick1(pn), a = pick1(pa), g = genderOf(n), A = g === "f" ? femOf(a) : W[a][0];
     const N = t1(W[n][2]), J = t1(W[a][2]); const forms = [[W[n][0] + "ٌ " + A + "ٌ", `${J} bir ${N}`], [defArt(W[n][0]) + "ُ " + defArt(A) + "ُ", `${J} ${N}`], [defArt(W[n][0]) + "ُ " + A + "ٌ", trNom(n, a)]];
     const [ar, tr] = pick1(forms);
     return { badge: "Tamlama mı, cümle mi?", prompt: `<div class="big ar" lang="ar" style="font-size:2.3rem">${ar}</div>`, sayFirst: ar, one: true, opts: shuffle(forms.map(f => ({ h: cap(f[1]), ok: f[1] === tr }))), fb: `${arS(ar)} = ${cap(tr)}`, say: ar }; } },
 { id: "izafet", t: "İsim tamlaması (izafet)", ar: "إِضَافَة", need: 1, needTxt: "4 öğrenilmiş isim",
   body: () => { const pn = poolN(); const a = pn[0] ?? IDX["كِتَاب"], b = pn[1] ?? IDX["طَالِب"];
     return `<p>Türkçedeki “öğrencinin kitabı” yapısıdır ama sıra terstir: önce sahip olunan, sonra sahip gelir.</p>
     <p>Birinci isim el- ve tenvin almaz; ikinci isim el- alır ve esreli (-i) okunur.</p>
     <p>${arS(W[a][0] + "ُ " + defArt(W[b][0]) + "ِ", 1)} ${izTr(a, b)}${mark(a)}${mark(b)}</p>`; },
   q: () => { const pn = poolN(); if (pn.length < 4) return null; const [a, b] = shuffle(pn).slice(0, 2), A = W[a][0], B = W[b][0];
     const ok = A + "ُ " + defArt(B) + "ِ";
     const wr = [defArt(A) + "ُ " + defArt(B) + "ِ", A + "ٌ " + defArt(B) + "ِ", B + "ُ " + defArt(A) + "ِ"].map(x => ({ k: x, h: arS(x) }));
     return { badge: "İzafet", prompt: `<div class="trbig">${cap(izTr(a, b))}</div>`, one: true, opts: opts4({ k: ok, h: arS(ok) }, wr), fb: `${arS(ok)} = ${izTr(a, b)}`, say: ok }; } },
 { id: "iyelik", t: "Bitişik zamirler (iyelik)", ar: "ـهُ", need: 1, needTxt: "3 öğrenilmiş isim",
   body: () => { const i = poolN()[0] ?? IDX["كِتَاب"], w = W[i][0], n = t1(W[i][2]);
     return `<p>İyelik ekleri ismin sonuna bitişir. ة ile biten isimlerde ة, ت olur.</p>
     <div class="ctab"><table><tbody>${PS.map(([s, p, lab]) => `<tr><td>${arS(possAr(w, s), 1)}</td><td>${poss(n, p)} <small class="mut">(${lab})</small></td></tr>`).join("")}</tbody></table></div>${mark(i)}`; },
   q: () => { const pn = poolN(); if (pn.length < 3) return null; const i = pick1(pn), w = W[i][0], n = t1(W[i][2]); const k = Math.floor(Math.random() * PS.length), [s, p, lab] = PS[k];
     const ok = possAr(w, s); const wr = PS.filter((x, j) => j !== k && x[1] !== p).map(x => ({ k: possAr(w, x[0]), h: arS(possAr(w, x[0])) }));
     return { badge: "İyelik eki", prompt: `<div class="trbig">${poss(n, p)}</div><div class="tl">(${lab})</div>`, opts: opts4({ k: ok, h: arS(ok) }, wr), fb: `${arS(ok)} = ${poss(n, p)} (${lab})`, say: ok }; } },
 { id: "cogul", t: "İkil ve çoğul", ar: "ـَانِ", need: 1, needTxt: "çoğulu bilinen 3 öğrenilmiş isim",
   body: () => { const i = poolPl()[0] ?? IDX["كِتَاب"], w = W[i][0];
     return `<p><b>İkil (tesniye):</b> iki tane için isme <b>ـَانِ</b> eklenir: ${arS(tMarb(w) + "َانِ", 1)} iki ${t1(W[i][2]) || ""}</p>
     <p><b>Düzenli eril çoğul:</b> genelde insanlar için <b>ـُونَ</b>: ${arS("مُعَلِّمُونَ", 1)} öğretmenler</p>
     <p><b>Düzenli dişil çoğul:</b> ة yerine <b>ـَات</b>: ${arS("سَيَّارَات", 1)} arabalar</p>
     <p><b>Kırık çoğul:</b> kelimenin içi değişir, ezberlemek gerekir: ${arS(w, 1)} → ${arS(W[i][5], 1)}${mark(i)}</p>`; },
   q: () => { const pn = poolPl(); if (pn.length < 3) return null; const i = pick1(pn), w = W[i][0], pl = W[i][5], du = tMarb(w) + "َانِ", n = t1(W[i][2]);
     const askPl = Math.random() < .6;
     return { badge: askPl ? "Hangisi çoğul?" : "Hangisi ikil?", prompt: `<div class="trbig">${askPl ? (n ? n + (isBack(nv(n)) ? "lar" : "ler") : esc(W[i][2])) : "iki " + (n || esc(W[i][2]))}</div>`,
       opts: shuffle([{ h: arS(pl), ok: askPl }, { h: arS(du), ok: !askPl }, { h: arS(w), ok: false }]), fb: `Tekil ${arS(w)}, ikil ${arS(du)}, çoğul ${arS(pl)}`, say: askPl ? pl : du }; } },
 { id: "mazi", t: "Mazi (geçmiş zaman)", ar: "فَعَلَ", need: 1, needTxt: "3 öğrenilmiş fiil",
   body: () => { const i = exV(poolV()), c = CJ[i];
     return `<p>Mazi, biten işi anlatır. Sözlükteki biçim “o (erkek) yaptı” anlamındaki 3. tekil şahıstır. Diğer şahıslar sona ek alarak çekilir:</p>
     <div class="ctab"><table><tbody>${BASIC.map(a => `<tr><td>${arS(AP[a])}</td><td>${arS(c[0][a], 1)}</td><td>${esc(trV(i, "past", TP[a][0]) || "")}</td></tr>`).join("")}</tbody></table></div>${mark(i)}`; },
   q: () => tenseQ("past") },
 { id: "muzari", t: "Muzari ve gelecek zaman", ar: "يَفْعَلُ", need: 1, needTxt: "3 öğrenilmiş fiil",
   body: () => { const i = exV(poolV()), c = CJ[i];
     return `<p>Muzari, şimdiki ve geniş zamanı anlatır. Başa <b>أ ت ي ن</b> öneklerinden biri gelir.</p>
     <div class="ctab"><table><tbody>${BASIC.map(a => `<tr><td>${arS(AP[a])}</td><td>${arS(c[1][a], 1)}</td><td>${esc(trV(i, "pres", TP[a][0]) || "")}</td></tr>`).join("")}</tbody></table></div>
     <p>Gelecek zaman için muzarinin başına <b>سَـ</b> ya da <b>سَوْفَ</b> getirilir: ${arS("سَ" + c[1][3], 1)} ${esc(trV(i, "fut", 2) || "")}${mark(i)}</p>`; },
   q: () => { const pv2 = poolV(); if (pv2.length < 3) return null; const i = pick1(pv2), a = pick1(BASIC), p = TP[a][0], c = CJ[i];
     if (!c[1][a] || !c[0][a]) return null; const items = [["pres", c[1][a]], ["fut", "سَ" + c[1][a]], ["past", c[0][a]]]; const [k, ar] = pick1(items); const full = AP[a] + " " + ar;
     return { badge: "Hangi zaman?", prompt: `<div class="big ar" lang="ar" style="font-size:2.3rem">${full}</div>`, sayFirst: full, one: true,
       opts: shuffle(["pres", "fut", "past"].map(kk => ({ h: cap(TRPRO(p) + " " + trV(i, kk, p)), ok: kk === k }))), fb: `${arS(full)} = ${cap(TRPRO(p) + " " + trV(i, k, p))}`, say: full }; } },
 { id: "olumsuz", t: "Olumsuzluk: لَا، لَمْ، لَنْ، مَا", ar: "لَا", need: 1, needTxt: "3 öğrenilmiş fiil",
   body: () => { const i = exV(poolVneg()), c = CJ[i];
     return `<div class="ctab"><table><tbody>
     <tr><td>${arS("لَا " + c[1][3], 1)}</td><td>${esc(trV(i, "negpres", 2) || "")}</td><td><small class="mut">لَا + muzari: şimdiki/geniş</small></td></tr>
     <tr><td>${arS("لَمْ " + c[3][3], 1)}</td><td>${esc(trV(i, "negpast", 2) || "")}</td><td><small class="mut">لَمْ + cezimli muzari: geçmiş</small></td></tr>
     <tr><td>${arS("مَا " + c[0][3], 1)}</td><td>${esc(trV(i, "negpast", 2) || "")}</td><td><small class="mut">مَا + mazi: geçmiş</small></td></tr>
     <tr><td>${arS("لَنْ " + c[4][3], 1)}</td><td>${esc(trV(i, "negfut", 2) || "")}</td><td><small class="mut">لَنْ + nasblı muzari: gelecek</small></td></tr></tbody></table></div>
     <p>لَمْ sondaki ötreyi cezme (sükûn) çevirir, لَنْ ise üstüne (nasb) çevirir.${mark(i)}</p>`; },
   q: () => { const pv2 = poolVneg(); if (pv2.length < 3) return null; const i = pick1(pv2), a = pick1([0, 3, 4, 8]), p = TP[a][0], c = CJ[i];
     const items = [["negpres", "لَا " + c[1][a]], ["negpast", "لَمْ " + c[3][a]], ["negfut", "لَنْ " + c[4][a]], ["pres", c[1][a]]].filter(x => !/undefined|null/.test(x[1])); const [k, ar] = pick1(items); const full = AP[a] + " " + ar;
     return { badge: "Anlamı ne?", prompt: `<div class="big ar" lang="ar" style="font-size:2.3rem">${full}</div>`, sayFirst: full, one: true,
       opts: shuffle(["negpres", "negpast", "negfut", "pres"].map(kk => ({ h: cap(TRPRO(p) + " " + trV(i, kk, p)), ok: kk === k }))), fb: `${arS(full)} = ${cap(TRPRO(p) + " " + trV(i, k, p))}`, say: full }; } },
 { id: "emir", t: "Emir (buyruk)", ar: "اِفْعَلْ", need: 1, needTxt: "3 öğrenilmiş fiil",
   body: () => { const i = exV(poolVneg().filter(j => CJ[j][2][0])), c = CJ[i];
     return `<p>Emir, muzariden türetilir: önek düşer, son harf cezmlenir; gerekirse başa elif gelir.</p>
     <p>${arS(c[2][0], 1)} ${esc(trV(i, "imp") || "")} <small class="mut">(erkeğe)</small> · ${arS(c[2][1] || "", 1)} <small class="mut">(kadına)</small> · ${arS(c[2][3] || "", 1)} <small class="mut">(topluluğa)</small></p>
     <p>Olumsuz emir: <b>لَا</b> + cezimli muzari: ${arS("لَا " + c[3][1], 1)} ${esc(trV(i, "negimp") || "")}${mark(i)}</p>`; },
   q: () => { const pv2 = poolVneg().filter(j => CJ[j][2][0] && CJ[j][3][1]); if (pv2.length < 3) return null; const i = pick1(pv2), c = CJ[i], neg = Math.random() < .4;
     const ok = neg ? "لَا " + c[3][1] : c[2][0]; const wr = [c[1][1], "لَا " + c[1][1], c[0][1], neg ? c[2][0] : "لَا " + c[3][1]].filter(Boolean).map(x => ({ k: x, h: arS(x) }));
     return { badge: neg ? "Olumsuz emir" : "Emir", prompt: `<div class="trbig">${cap(trV(i, neg ? "negimp" : "imp"))}</div><div class="tl">(bir erkeğe)</div>`, opts: opts4({ k: ok, h: arS(ok) }, wr), fb: `${arS(ok)} = ${cap(trV(i, neg ? "negimp" : "imp"))}`, say: ok }; } },
];
const QW = [["هَلْ", "-mı? (evet/hayır sorusu)"], ["مَا", "ne"], ["مَاذَا", "ne (fiille)"], ["مَنْ", "kim"], ["أَيْنَ", "nerede"], ["مَتَى", "ne zaman"], ["كَيْفَ", "nasıl"], ["لِمَاذَا", "neden"], ["كَمْ", "kaç, ne kadar"], ["أَيّ", "hangi"]];
const PS = [["ي", 0, "benim"], ["كَ", 1, "senin, erkek"], ["كِ", 1, "senin, kadın"], ["هُ", 2, "onun, erkek"], ["هَا", 2, "onun, kadın"], ["نَا", 3, "bizim"], ["كُمْ", 4, "sizin"], ["هُمْ", 5, "onların"]];
const possAr = (w, s) => s === "ي" ? tMarb(w) + "ِي" : tMarb(w) + "ُ" + s;
const tlDef = i => { const t = W[i][1]; return SUN.includes(W[i][0][0]) ? "e" + t[0] + "-" + t : "el-" + t; };
const trNom = (n, a) => cap(t1(W[n][2]) + " " + t1(W[a][2])) + ".";
const nomSent = (n, a) => defArt(W[n][0]) + "ُ " + ((genderOf(n) === "f" ? femOf(a) : W[a][0]) || W[a][0]) + "ٌ";
const izTr = (a, b) => genT(t1(W[b][2])) + " " + poss(t1(W[a][2]), 2);
function exNA() { const pn = poolN(true), pa = poolA(); return [pn.length ? pick1(pn) : IDX["بَيْت"], pa.length ? pick1(pa) : IDX["كَبِير"]]; }
function tenseQ(kind) {
  const pv2 = poolV(); if (pv2.length < 3) return null; const i = pick1(pv2), a = pick1(BASIC), c = CJ[i], tbl = kind === "past" ? c[0] : c[1];
  const ok = tbl[a]; if (!ok) return null; const wr = BASIC.filter(x => x !== a && tbl[x] && tbl[x] !== ok).map(x => ({ k: tbl[x], h: arS(tbl[x]) }));
  return { badge: TENSE[kind === "past" ? "p" : "n"], prompt: `<div class="ar" lang="ar" style="font-size:1.4rem;opacity:.8;margin-top:22px">${W[i][0]}</div><div class="big ar" lang="ar" style="margin-top:0">${AP[a]} …</div><div class="tl">${esc(cap(TRPRO(TP[a][0]) + " " + trV(i, kind, TP[a][0])))}</div>`, opts: opts4({ k: ok, h: arS(ok) }, wr), fb: `${arS(AP[a] + " " + ok)} = ${esc(cap(TRPRO(TP[a][0]) + " " + trV(i, kind, TP[a][0])))}`, say: AP[a] + " " + ok };
}

// --- CÜMLE PRATİĞİ ---
function sentGen() {
  const pn = poolN(true), pa = poolA(), pvn = poolVneg(), make = [];
  if (pn.length >= 2) make.push(() => { const i = pick1(pn), g = genderOf(i); return { ar: (g === "f" ? "هٰذِهِ " : "هٰذَا ") + W[i][0] + "ٌ", tr: cap("bu bir " + t1(W[i][2])) + "." }; });
  if (pn.length >= 2 && pa.length >= 2) make.push(() => { const n = pick1(pn), a = pick1(pa); return { ar: nomSent(n, a), tr: trNom(n, a) }; });
  if (pn.length >= 2 && pa.length >= 2) make.push(() => { const n = pick1(pn), a = pick1(pa), k = pick1(PS.filter(x => x[0] !== "ي")), g = genderOf(n); return { ar: possAr(W[n][0], k[0]) + " " + ((g === "f" ? femOf(a) : W[a][0]) + "ٌ"), tr: cap(poss(t1(W[n][2]), k[1]) + " " + t1(W[a][2])) + ".", note: k[2] }; });
  if (pvn.length >= 2) make.push(() => { const i = pick1(pvn), a = pick1(BASIC), p = TP[a][0], c = CJ[i];
    const k = pick1(["pres", "past", "fut", "negpres", "negpast", "negfut"]);
    const v = { pres: c[1][a], past: c[0][a], fut: "سَ" + c[1][a], negpres: "لَا " + c[1][a], negpast: "لَمْ " + c[3][a], negfut: "لَنْ " + c[4][a] }[k];
    if (!v || /undefined|null/.test(v)) return null; return { ar: AP[a] + " " + v, tr: cap(TRPRO(p) + " " + trV(i, k, p)) + "." + (TP[a][1].includes("(") ? " " + "(" + TP[a][1].split("(")[1] : ""), };
  });
  return make;
}
function sentQ() {
  const make = sentGen().concat(sentGen2()); if (!make.length) return null;
  let s = null; for (let t = 0; t < 10 && !s; t++) s = pick1(make)();
  if (!s) return null;
  if (Math.random() < .5) {
    const wr = []; for (let t = 0; t < 30 && wr.length < 6; t++) { const f = pick1(make)(); if (f && f.tr !== s.tr) wr.push({ k: f.tr, h: f.tr }); }
    return { badge: "Cümlenin anlamı", prompt: `<div class="big ar" lang="ar" style="font-size:clamp(1.8rem,8vw,2.5rem)">${s.ar}</div>`, sayFirst: s.ar, one: true, opts: opts4({ k: s.tr, h: s.tr }, wr), fb: `${arS(s.ar)} = ${s.tr}`, say: s.ar };
  }
  const toks = s.ar.split(" "); if (toks.length < 2) return null;
  const extra = []; for (let t = 0; t < 20 && extra.length < 2; t++) { const f = pick1(make)(); if (!f) continue; const x = pick1(f.ar.split(" ")); if (!toks.includes(x) && !extra.includes(x)) extra.push(x); }
  return { type: "order", badge: "Cümleyi kur", prompt: `<div class="trbig">${s.tr}</div>`, tokens: shuffle(toks.concat(extra)), answer: toks, fb: `${arS(s.ar)} = ${s.tr}`, say: s.ar };
}

// --- ÜÇLÜ ÇEVİRİ ---
const enS = i => (W[i][3] || "").split(/[,;]/)[0].replace(/\(.*?\)/g, "").trim();
const trS = i => (W[i][2] || "").split(/[;]/)[0].trim();
function triQ() {
  const pool = learnedIds().filter(i => enS(i) && trS(i)); if (pool.length < 4) return null;
  const i = pick1(pool); let pair = S.set.triM === "mix" ? pick1([["ar", "en"], ["en", "ar"], ["tr", "en"], ["en", "tr"], ["ar", "tr"]]) : S.set.triM.split("-");
  const [from, to] = pair, lab = { ar: "Arapça", tr: "Türkçe", en: "İngilizce" };
  const show = (j, l, big) => l === "ar" ? (big ? `<div class="big ar" lang="ar">${vz(W[j][0], j)}</div>` : arS(vz(W[j][0], j))) : (big ? `<div class="trbig">${esc(l === "tr" ? trS(j) : enS(j))}</div>` : esc(l === "tr" ? trS(j) : enS(j)));
  const key = j => to === "ar" ? bare(W[j][0]) : (to === "tr" ? trS(j) : enS(j)).toLowerCase();
  const near = pool.length >= 8 ? pool : pool.concat(Object.keys(S.p).map(Number));
  const wr = shuffle(near).filter(j => j !== i && key(j) !== key(i)).slice(0, 8).map(j => ({ k: key(j), h: show(j, to) }));
  return { badge: lab[from] + " → " + lab[to], prompt: show(i, from, true), sayFirst: from === "ar" ? W[i][0] : null, opts: opts4({ k: key(i), h: show(i, to) }, wr),
    fb: `${arS(W[i][0])} · ${esc(trS(i))} · <i>${esc(enS(i))}</i>`, say: W[i][0] };
}

// --- ORTAK ALIŞTIRMA EKRANI ---
let gq = null;
function startQuiz(o) { gq = Object.assign({ n: 0, score: 0, q: null, picked: null, used: [], done: null }, o); pv = { mode: "quiz" }; practice(); window.scrollTo(0, 0); }
function nextGQ() { gq.q = null; gq.picked = null; gq.used = []; gq.done = null; gq.paused = false; gq.advAt = 0; gq.spoke = false; }
function quizView() {
  if (!gq) { pv = { mode: "hub" }; return practice(); }
  const st = S.md[gq.mod] = S.md[gq.mod] || { r: 0, w: 0 };
  if (gq.total && gq.n >= gq.total) {
    if (gq.store) { S[gq.store] = S[gq.store] || {}; S[gq.store][gq.key] = Math.max(S[gq.store][gq.key] || 0, gq.score); save(); } else if (gq.lesson) { S.gr[gq.lesson] = Math.max(S.gr[gq.lesson] || 0, gq.score); if (gq.score >= 6 && !gq.logged) { gq.logged = true; logDay("L", 1); } save(); }
    app.innerHTML = `<div class="top"><button class="linkbtn" id="qback">← ${esc(gq.backLabel)}</button></div>
    <section class="tile done"><div class="ar" lang="ar">${gq.score === gq.total ? "مُمْتَاز" : "أَحْسَنْتَ"}</div><p><b>${gq.score}/${gq.total} doğru</b></p><p>${gq.score === gq.total ? "Kusursuz!" : gq.score >= gq.total * .7 ? "Çok iyi, konu oturuyor." : "Konuyu bir kez daha okuyup tekrar dene."}</p></section>
    <div class="row"><button class="btn" id="qback2">Geri dön</button><button class="btn primary" id="qagain">Tekrar çöz</button></div>`;
    $("#qback").onclick = $("#qback2").onclick = () => { const b = gq.back; gq = null; b(); };
    $("#qagain").onclick = () => { gq.n = 0; gq.score = 0; nextGQ(); practice(); };
    return;
  }
  if (!gq.q) { for (let t = 0; t < 8 && !gq.q; t++) gq.q = gq.gen(); }
  const top = `<div class="top"><button class="linkbtn" id="qback">← ${esc(gq.backLabel)}</button><div class="streak">${gq.total ? `Soru ${gq.n + 1}/${gq.total} · doğru ${gq.score}` : `Doğru ${st.r} · Yanlış ${st.w}`}</div></div>${gq.extraTop ? gq.extraTop() : ""}`;
  if (!gq.q) {
    app.innerHTML = top + `<section class="tile done"><div class="ar" lang="ar">صَبْرًا</div><p><b>Bu alıştırma için henüz yeterli öğrenilmiş kelimen yok.</b></p><p>Gerekli: ${esc(gq.need || "birkaç öğrenilmiş kelime")}. Çalış sekmesinde devam ettikçe açılacak.</p></section>`;
    $("#qback").onclick = () => { const b = gq.back; gq = null; b(); }; bindExtra(); return;
  }
  const q = gq.q, ans = gq.picked !== null || gq.done !== null;
  let h = top + `<section class="tile card"><span class="badge">${q.badge}</span>${q.prompt}${q.sayFirst && !ans ? listenBtn(q.sayFirst) : ""}</section>`;
  if (q.type === "order") {
    const built = gq.used.map(k => q.tokens[k]).join(" ");
    h += `<div class="built ${gq.done === true ? "ok" : gq.done === false ? "no" : ""}"><span class="ar" lang="ar" style="font-size:1.9rem">${built || "&nbsp;"}</span></div>`;
    if (gq.done === null) h += `<div class="tiles words">${q.tokens.map((t, k) => `<button class="tl8 ar" lang="ar" data-t="${k}" ${gq.used.includes(k) ? "disabled" : ""}>${t}</button>`).join("")}</div>
      <div class="row"><button class="btn" id="undo" ${gq.used.length ? "" : "disabled"}>⌫ Sil</button><button class="btn" id="giveup">Göster</button></div>`;
  } else {
    h += `<div class="opts${q.one ? " one" : ""}">${q.opts.map((o, k) => { let c = ""; if (ans) c = o.ok ? "ok" : (k === gq.picked ? "no" : "dim"); return `<button class="${c}" data-o="${k}" ${ans ? "disabled" : ""}>${o.h}</button>`; }).join("")}</div>`;
  }
  if (ans) {
    const ok = q.type === "order" ? gq.done : q.opts[gq.picked].ok;
    h += `<div class="fb" role="status"><div class="verdict ${ok ? "good" : "bad"}">${ok ? "Doğru!" : "Yanlış."}</div><div class="m" style="grid-column:1/-1">${q.fb}</div>${!ok && gq.rule ? `<div class="rule"><b>Kural:</b> ${gq.rule}</div>` : ""}</div>
      <div class="row">${q.say ? listenBtn(q.say) : ""}<button class="btn primary adv" id="next"><span class="fill" id="fill"></span><span class="lbl">${gq.total && gq.n + 1 >= gq.total ? "Sonucu gör" : "Devam"}</span></button></div>
      ${secs(ok) ? `<div class="links"><button class="linkbtn" id="pause">${gq.paused ? "Otomatik geçiş durdu" : "Duraklat"}</button></div>` : ""}`;
  }
  app.innerHTML = h;
  $("#qback").onclick = () => { clearTimeout(advTimer); const b = gq.back; gq = null; b(); };
  bindExtra();
  const finish = ok => { fx(ok); st[ok ? "r" : "w"]++; if (ok) gq.score++; logDay("x", 1); if (ok) logDay("xo", 1); ensureDay(); markStudy(); save();
    gq.advAt = secs(ok) ? Date.now() + secs(ok) * 1000 : 0; if (S.set.auto && q.say) speak(q.say); practice(); };
  if (!ans) {
    if (q.sayFirst && S.set.auto && hasGesture && !gq.spoke) { gq.spoke = true; speak(q.sayFirst); }
    if (q.type === "order") {
      app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { gq.used.push(+b.dataset.t); if (gq.used.length === q.answer.length) { gq.done = gq.used.map(k => q.tokens[k]).join(" ") === q.answer.join(" "); finish(gq.done); } else practice(); });
      $("#undo").onclick = () => { gq.used.pop(); practice(); };
      $("#giveup").onclick = () => { gq.done = false; finish(false); };
    } else app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { gq.picked = +b.dataset.o; finish(q.opts[gq.picked].ok); });
  } else {
    const ok = q.type === "order" ? gq.done : q.opts[gq.picked].ok;
    const go = () => { clearTimeout(advTimer); gq.n++; nextGQ(); practice(); };
    $("#next").onclick = go;
    const pz = $("#pause"); if (pz) pz.onclick = () => { gq.paused = true; clearTimeout(advTimer); practice(); };
    if (gq.advAt && !gq.paused) {
      const total = secs(ok) * 1000, left = Math.max(0, gq.advAt - Date.now()), f = $("#fill");
      f.style.transition = "none"; f.style.width = (100 * (1 - left / (total || 1))) + "%";
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = "width " + left + "ms linear"; f.style.width = "100%"; }));
      advTimer = setTimeout(() => { if (view === "pratik" && pv.mode === "quiz" && gq) go(); }, left);
    }
  }
}
function bindExtra() { app.querySelectorAll("[data-tm]").forEach(b => b.onclick = () => { S.set.triM = b.dataset.tm; save(); nextGQ(); practice(); }); }

// --- DERS LİSTESİ VE DERS SAYFASI ---
function lessonList() {
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><h2>Dil bilgisi dersleri</h2>
  <p class="sub">Her ders kısa bir konu anlatımı ve 8 soruluk alıştırmadan oluşur. Alıştırmalarda yalnızca öğrendiğin kelimeler kullanılır.</p>
  <div class="list">${LESSONS.map((L, k) => `<button class="vrow" data-l="${k}"><div><div class="m">${k + 1}. ${esc(L.t)} <span class="lvtag">${L.lv || ""}</span></div><div class="t">${S.gr[L.id] !== undefined ? "En iyi skor: " + S.gr[L.id] + "/8" : "Başlanmadı"}</div></div><span class="ar" lang="ar">${L.ar}</span></button>`).join("")}</div>`;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  app.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { pv = { mode: "lesson", k: +b.dataset.l }; practice(); window.scrollTo(0, 0); });
}
const SUMS = {
  zamir: "Arapçada sen, o, siz ve onlar için erkek ve kadın ayrı zamirler vardır; iki kişi için de ikil zamirler kullanılır. Şimdiki zamanda “olmak” fiili kullanılmaz: أَنَا طَالِبٌ ben öğrenciyim.",
  soru: "Evet/hayır soruları هَلْ ile başlar. Diğer soru kelimeleri de cümlenin başına gelir: مَنْ kim, مَا ve مَاذَا ne, أَيْنَ nerede, مَتَى ne zaman, كَيْفَ nasıl, لِمَاذَا neden, كَمْ kaç.",
  tarif: "ال ismi belirli yapar. Şemsi harflerde l okunmaz ve sonraki harf şeddeli okunur (الشَّمْس eş-şems); kameri harflerde l okunur (الْقَمَر el-kamer).",
  cins: "Her isim ya eril ya dişildir. Çoğu dişil isim ة ile biter; bazı dişil isimlerin işareti yoktur: أُمّ، بِنْت، شَمْس، أَرْض. Sıfat, fiil ve işaret zamiri ismin cinsine uyar.",
  isaret: "Yakın için هٰذَا (eril) ve هٰذِهِ (dişil), uzak için ذٰلِكَ ve تِلْكَ kullanılır. Ardından belirsiz isim gelince “bu bir …” anlamı çıkar: هٰذَا كِتَابٌ.",
  isimcumle: "İsim cümlesinde “olmak” fiili yoktur. Özne belirli ve ötreli (-u), haber belirsiz ve tenvinli (-un) olur; haber öznenin cinsine uyar: الْبَيْتُ كَبِيرٌ.",
  sifat: "Sıfat isimden sonra gelir ve ona belirlilik, cinsiyet ve harekede uyar: الْبَيْتُ الْكَبِيرُ büyük ev. Sıfatta el- yoksa tamlama değil cümle olur: الْبَيْتُ كَبِيرٌ ev büyük.",
  izafet: "İsim tamlamasında sıra Türkçenin tersidir: önce sahip olunan gelir (el- ve tenvin almaz), sonra sahip gelir (el- alır, esreli okunur): كِتَابُ الطَّالِبِ öğrencinin kitabı.",
  iyelik: "İyelik ekleri ismin sonuna bitişir: ـِي benim, ـُكَ senin (erkek), ـُكِ senin (kadın), ـُهُ onun (erkek), ـُهَا onun (kadın), ـُنَا bizim, ـُكُمْ sizin, ـُهُمْ onların. ة ile biten isimlerde ة, ت olur.",
  cogul: "İki tane için ـَانِ eklenir. Düzenli çoğul erkeklerde ـُونَ, dişilde ـَات ile yapılır. Kırık çoğulda kelimenin içi değişir ve ezberlenir: كِتَاب ← كُتُب.",
  mazi: "Mazi biten işi anlatır. Sözlükteki biçim “o (erkek) yaptı” anlamındadır; diğer şahıslar sona ek alarak çekilir: كَتَبْتُ yazdım, كَتَبْنَا yazdık, كَتَبُوا yazdılar.",
  muzari: "Muzari şimdiki ve geniş zamanı anlatır; başa أ، ت، ي، ن öneklerinden biri gelir. Başına سَـ ya da سَوْفَ gelince gelecek zaman olur: سَيَكْتُبُ yazacak.",
  olumsuz: "لَا + muzari: yapmıyor. لَمْ + cezimli muzari: yapmadı. مَا + mazi: yapmadı. لَنْ + nasblı muzari: yapmayacak.",
  emir: "Emir muzariden yapılır: önek düşer, son harf cezmlenir, gerekirse başa elif gelir: اُكْتُبْ yaz! Olumsuz emir لَا + cezimli muzari ile yapılır: لَا تَكْتُبْ yazma!",
  mevsul: "الَّذِي (eril) ve الَّتِي (dişil) Türkçedeki “-an, -en” anlamını verir. İlgi zamiri ve ardından gelen fiil, nitelenen ismin cinsine uyar: الطَّالِبُ الَّذِي كَتَبَ yazan öğrenci.",
  kane: "كَانَ ve kardeşleri (لَيْسَ، أَصْبَحَ، صَارَ) isim cümlesinin başına gelince özne ötreli kalır, haber üstün (-an) olur: كَانَ الْبَيْتُ كَبِيرًا ev büyüktü. Dişil özneyle fiil de dişil olur: كَانَتْ.",
  inne: "إِنَّ ve kardeşleri (أَنَّ، لٰكِنَّ، كَأَنَّ، لَيْتَ، لَعَلَّ) gelince özne üstün (-a) olur, haber ötreli kalır: إِنَّ الْبَيْتَ كَبِيرٌ şüphesiz ev büyük.",
  bab: "Bâblar kökten yeni anlamlar türetir: II ettirgen ya da yoğun, III karşılıklı, IV ettirgen, V ve VI dönüşlü ya da işteş, VII edilgen, VIII dönüşlü, X isteme ya da öyle sayma.",
  mechul: "Edilgen mazi: ilk harf ötre, sondan bir önceki esre olur: كُتِبَ yazıldı. Edilgen muzari: önek ötre, sondan bir önceki üstün olur: يُكْتَبُ yazılır.",
  failmeful: "Sağlam üç harfli fiillerde işi yapan فَاعِل kalıbında (كَاتِب yazan), işi yapılan مَفْعُول kalıbındadır (مَكْتُوب yazılmış). Diğer bâblarda fâil مُـ ile başlar.",
  masdar: "Masdar fiilin isim hâlidir. I. bâbda kalıpları çeşitlidir ve ezberlenir; diğer bâblarda düzenlidir: II تَفْعِيل، IV إِفْعَال، V تَفَعُّل، VIII اِفْتِعَال، X اِسْتِفْعَال.",
  sart: "إِذَا ve إِنْ “-se, -sa” anlamı verir. إذا ile genelde iki mazi gelir ama anlam geniş zamandır: إِذَا دَرَسْتَ نَجَحْتَ çalışırsan başarırsın. لَوْ gerçekleşmemiş şart içindir.",
  tafdil: "Üstünlük için أَفْعَل kalıbı kullanılır, “-den” için مِنْ gelir: أَكْبَرُ مِنْ daha büyük. Belirli hâli “en” anlamı verir: الْأَكْبَرُ en büyük.",
  sayi: "3–10 arası sayılar sayılanın cinsinin tersini alır: eril isimle ة’li (ثَلَاثَةُ كُتُبٍ), dişil isimle ة’siz (ثَلَاثُ سَيَّارَاتٍ). Sayılan çoğul ve esreli olur.",
  hal: "Hâl işin hangi durumda yapıldığını anlatır; belirsiz ve üstün (tenvinli) olur. Türkçede “-arak, -erek” ile karşılanır: جَاءَ الطَّالِبُ ضَاحِكًا öğrenci gülerek geldi.",
  istisna: "Olumlu ve tam cümlede إِلَّا’dan sonraki isim üstün olur. Nidâda belirli tek isim tenvinsiz ötreli okunur: يَا طَالِبُ ey öğrenci!"
};
const arWrap = t => esc(t).replace(/[\u0600-\u06FF\u064B-\u0652\u0670]+(?:[ \u060C][\u0600-\u06FF\u064B-\u0652\u0670]+)*/g, m => `<span class="ar" lang="ar">${m}</span>`);
function lessonSteps(L) {
  const tmp = document.createElement("div"); tmp.innerHTML = L.body();
  const steps = [];
  for (const el of [...tmp.children]) {
    const tab = el.classList.contains("ctab"), tiny = el.tagName === "SMALL" || (el.textContent.trim().length < 12 && !tab);
    if ((tab || tiny) && steps.length && !steps[steps.length - 1].tab) { steps[steps.length - 1].html += el.outerHTML; if (tab) steps[steps.length - 1].tab = true; }
    else steps.push({ html: el.outerHTML, tab });
  }
  return steps.length ? steps : [{ html: L.body() }];
}
function lessonPage(k) {
  const L = LESSONS[k];
  if (!pv.steps) pv.steps = lessonSteps(L);
  const steps = pv.steps, n = steps.length + 1, i = Math.min(pv.step || 0, n - 1), last = i === n - 1, done = S.gr[L.id] !== undefined;
  pv.step = i;
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backL">← Dersler</button><div class="streak">Ders ${k + 1}/${LESSONS.length} · ${L.lv || ""}</div></div>
  <section class="tile card" style="min-height:0;padding:16px"><div class="big ar" lang="ar" style="margin-top:0;font-size:2.4rem">${L.ar}</div><div class="mean">${esc(L.t)}</div></section>
  <div class="stepbar" aria-label="Adım ${i + 1}/${n}">${Array.from({ length: n }, (_, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</div>
  <div class="lesson step">${last ? `<p class="steplabel">Özet kural</p><p class="rulebox">${arWrap(SUMS[L.id] || "")}</p><p class="mut">Şimdi 8 soruluk alıştırmayla pekiştir. Yanlış yaparsan bu kural sana hatırlatılacak.</p>` : `<p class="steplabel">Öğren · adım ${i + 1}/${n - 1}</p>${steps[i].html}`}</div>
  <div class="row">${i > 0 ? `<button class="btn" id="stPrev">← Geri</button>` : ""}${last ? `<button class="btn primary" id="startL">Alıştırmaya başla</button>` : `<button class="btn primary" id="stNext">Devam →</button>`}</div>
  ${!last && done ? `<div class="links"><button class="linkbtn" id="skipL">Kuralı biliyorum, özete geç</button></div>` : ""}
  <div class="row">${k > 0 ? `<button class="btn" id="prevL">← Önceki ders</button>` : ""}${k < LESSONS.length - 1 ? `<button class="btn" id="nextL">Sonraki ders →</button>` : ""}</div>`;
  const go = st => { pv.step = st; practice(); window.scrollTo(0, 0); };
  $("#backL").onclick = () => { pv = { mode: "lessons" }; practice(); };
  const sp = $("#stPrev"); if (sp) sp.onclick = () => go(i - 1);
  const sn = $("#stNext"); if (sn) sn.onclick = () => go(i + 1);
  const sk = $("#skipL"); if (sk) sk.onclick = () => go(n - 1);
  const p = $("#prevL"); if (p) p.onclick = () => { pv = { mode: "lesson", k: k - 1 }; practice(); window.scrollTo(0, 0); };
  const nx = $("#nextL"); if (nx) nx.onclick = () => { pv = { mode: "lesson", k: k + 1 }; practice(); window.scrollTo(0, 0); };
  const st = $("#startL"); if (st) st.onclick = () => startQuiz({ mod: "les", lesson: L.id, gen: L.q, total: 8, need: L.needTxt, rule: arWrap(SUMS[L.id] || ""), backLabel: "Ders", back: () => { pv = { mode: "lesson", k, step: 99 }; practice(); } });
}

// --- KÖK AİLELERİ ---
function rootList() {
  const fams = {}; for (const i of learnedIds()) if (ROOT[i]) fams[ROOT[i]] = 1;
  const rs = Object.keys(fams).sort((a, b) => FAM[b].length - FAM[a].length);
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><h2>Kök aileleri</h2>
  <p class="sub">Arapça kelimelerin çoğu üç harfli bir kökten türer. Bir kökü tanımak, ailesindeki kelimeleri öğrenmeyi kolaylaştırır. Burada öğrendiğin kelimelerin kökleri var.</p>
  ${rs.length ? `<div class="list">${rs.map(r => { const m = FAM[r], l = m.filter(learned).length; return `<button class="vrow" data-r="${r}"><div><div class="m">${m.slice(0, 3).map(i => esc(t1(W[i][2]) || W[i][2].split(",")[0])).join(", ")}${m.length > 3 ? "…" : ""}</div><div class="t">${l}/${m.length} kelime öğrenildi</div></div><span class="ar" lang="ar">${rootTxt(r)}</span></button>`; }).join("")}</div>`
    : `<div class="empty">Öğrendiğin kelimelerin kökleri burada listelenecek.</div>`}`;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { pv = { mode: "root", r: b.dataset.r, from: "roots" }; practice(); window.scrollTo(0, 0); });
}
function rootPage(r) {
  const m = (FAM[r] || []).filter(i => !MAT.has(i)).sort((a, b) => a - b), news = m.filter(i => !S.p[i] && !OFF(i) && !S.prio.includes(i));
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backR">← ${pv.from === "roots" ? "Kök aileleri" : "Geri"}</button></div>
  <section class="tile card" style="min-height:0;padding:18px"><div class="big ar" lang="ar" style="margin-top:0">${rootTxt(r)}</div><div class="mean">Kök ailesi · ${m.length} kelime</div></section>
  <div class="list" style="margin-top:12px">${m.map(i => { const s = S.p[i]; return `<div class="vrow"><div><div class="m">${esc(W[i][2])}</div><div class="t">${esc(W[i][1])} · ${s ? (s[0] >= 3 ? "öğrenildi" : "öğreniliyor") : "henüz yeni"}</div></div><button class="cf" data-say="${esc(W[i][0])}" style="width:auto"><span class="ar" lang="ar" style="${s ? "" : "opacity:.6"}">${W[i][0]}</span></button></div>`; }).join("")}</div>
  ${news.length ? `<div class="row"><button class="btn primary" id="prioR">Bu ailenin ${news.length} yeni kelimesini öne al</button></div>` : ""}
  <p class="sub" style="margin-top:12px">Kökler Kur’an morfoloji verisinden ve Arapça kalıplardan çıkarıldı; nadiren yanlış eşleşme olabilir.</p>`;
  $("#backR").onclick = () => { if (pv.from === "roots") { pv = { mode: "roots" }; practice(); return; } const f = pv.from; pv = { mode: "hub" }; if (f === "pratik") practice(); else location.hash = "#" + f; };
  const b = $("#prioR"); if (b) b.onclick = () => { S.prio = S.prio.concat(news.slice(0, 15)); save(); cur = null; toast(Math.min(15, news.length) + " kelime öne alındı. Çalış sekmesinde sıradaki yeni kelimeler bunlar."); practice(); };
}
const rootLine = id => ROOT[id] && FAM[ROOT[id]].length > 1 ? `<button class="cog rootbtn" data-root="${ROOT[id]}">Kök: <span class="ar" lang="ar">${rootTxt(ROOT[id])}</span> · ailede ${FAM[ROOT[id]].length} kelime</button>` : "";
document.addEventListener("click", e => { const b = e.target.closest("[data-root]"); if (!b) return; e.preventDefault(); clearTimeout(advTimer); if (cur && cur.picked !== undefined && cur.picked !== null) cur.paused = true; pv = { mode: "root", r: b.dataset.root, from: view }; if (view === "pratik") practice(); else location.hash = "#pratik"; });

// ================= GELİŞİM, SEVİYE TESPİT, AYET VE HADİSLER =================
const COV = DATA("cover"); // {s:{id:n}, q:{id:n}, ts, tq}
const TX = DATA("texts");
const COVS = Object.values(COV.s).reduce((a, b) => a + b, 0), COVQ = Object.values(COV.q).reduce((a, b) => a + b, 0);
let POOLX = null;
const LV = [["A1", 0], ["A2", 500], ["B1", 1000], ["B2", 2000], ["C1", 4000], ["C2", 8000]];
const LVDESC = { A1: "Başlangıç", A2: "Temel", B1: "Orta", B2: "Orta üstü", C1: "İleri", C2: "Ustalık" };
const vocLevel = n => { let k = 0; for (let i = 0; i < LV.length; i++) if (n >= LV[i][1]) k = i; return k; };
const GLV = { A1: ["zamir", "soru", "tarif", "cins", "isaret"], A2: ["isimcumle", "sifat", "izafet", "iyelik", "cogul", "mazi", "muzari"], B1: ["olumsuz", "emir"] };
function gramLevel() { let lv = "—"; for (const k of ["A1", "A2", "B1", "B2", "C1", "C2"]) { if (GLV[k].every(id => (S.gr[id] || 0) >= 6)) lv = k; else break; } return lv; }
function coverage() {
  let s = 0, q = 0; for (const k in S.p) { if (OFF(k) || S.p[k][0] < 3) continue; s += COV.s[k] || 0; q += COV.q[k] || 0; }
  return { s: COVS ? s / COVS : 0, q: COVQ ? q / COVQ : 0 };
}
const pct = x => "%" + Math.round(x * 100);
const acc = o => o && (o.r + o.w) ? Math.round(100 * o.r / (o.r + o.w)) : null;
function understand(c) {
  if (c < 0.6) return ["Tek tek kelimeleri ve kalıplaşmış ifadeleri tanırsın.", "Resimli çocuk kitapları, kısa sureler (meal yardımıyla), çocuk şarkıları"];
  if (c < 0.8) return ["Yavaş ve basit konuşmaların bir kısmını takip edersin.", "Çocuk programları (ör. İftah Yâ Simsim), basitleştirilmiş hikâyeler, kısa hadisler"];
  if (c < 0.9) return ["Günlük konuşmaların ana fikrini yakalarsın.", "Arapça altyazılı çizgi filmler ve diziler, çocuk ve gençlik kitapları"];
  if (c < 0.96) return ["Haberleri ve sade metinleri sözlük yardımıyla anlarsın.", "El Cezire, BBC Arabic haberleri; Tevfik el-Hakîm’in hikâyeleri; Kelîle ve Dimne"];
  return ["Romanları ve belgeselleri rahatça takip edebilirsin.", "Necîb Mahfûz’un romanları, Tâhâ Hüseyin’in el-Eyyâm’ı, belgeseller, tefsir metinleri"];
}
let gv = { mode: "main" }, pt = null;
function growth() {
  if (gv.mode === "test") return placement();
  const c = counts(), learnedN = learnedIds().length, k = vocLevel(learnedN), cov = coverage(), [u1, u2] = understand(cov.s);
  const next = LV[k + 1], prev = LV[k][1];
  const ds = S.ds || {}, rows = [
    ["Okuyarak tanıma (Arapça → Türkçe)", acc(ds.ar)], ["Hatırlama (Türkçe → Arapça)", acc(ds.tr)], ["Dinleyerek anlama", acc(ds.listen)],
    ["Fiil çekimi", acc(S.cj)], ["Harf dizme", acc(S.sp)], ["Cümle pratiği", acc(S.md.sent)], ["Dil bilgisi alıştırmaları", acc(S.md.les)], ["Üçlü çeviri", acc(S.md.tri)], ["Ayet ve hadisler", acc(S.md.txt)]];
  // bilinen kelime eğrisi (son 30 gün)
  const L = S.log || {}, pts = []; let last = null;
  const keys = Object.keys(L).sort(); for (const kk of keys) if (kk < dayStr(new Date(Date.now() - 30 * 864e5)) && L[kk].k !== undefined) last = L[kk].k;
  for (let i = 29; i >= 0; i--) { const d = dayStr(new Date(Date.now() - i * 864e5)); if (L[d] && L[d].k !== undefined) last = L[d].k; pts.push(i === 0 ? c.known : (last ?? 0)); }
  const mx = Math.max(10, ...pts), path = pts.map((v, i) => `${i ? "L" : "M"}${(6 + i * 10.3).toFixed(1)},${(92 - 82 * v / mx).toFixed(1)}`).join(" ");
  app.innerHTML = `<h2>Gelişim</h2>${planCard(true)}
  <section class="tile lvl-hero"><div><div class="lvbig">${LV[k][0]}</div><div class="lvsub">${LVDESC[LV[k][0]]}</div></div>
    <div class="lvinfo"><b>${fmt(learnedN)}</b> öğrenilmiş kelime${next ? `<div class="meter dark"><i style="width:${Math.min(100, 100 * (learnedN - prev) / (next[1] - prev))}%"></i></div><small>${next[0]} için ${fmt(next[1] - learnedN)} kelime daha</small>` : `<small>En üst seviyedesin</small>`}</div></section>
  <div class="gcards">
    <div class="gcard"><span>Kelime</span><b>${LV[k][0]}</b><small>${fmt(learnedN)} kelime</small></div>
    <div class="gcard"><span>Dil bilgisi</span><b>${gramLevel()}</b><small>${Object.keys(S.gr).length}/${LESSONS.length} ders</small></div>
    <div class="gcard"><span>İyi bildiğin</span><b>${fmt(c.known)}</b><small>kelime</small></div>
  </div>
  ${xpBlock()}
  <div class="statsbox"><div class="sh"><b>Neyi anlayabilirsin?</b><span>tahmini</span></div>
    <div class="covrow"><span>Film ve dizi diyalogları</span><b>${pct(cov.s)}</b></div><div class="meter"><i style="width:${cov.s * 100}%"></i></div>
    <div class="covrow"><span>Kur’an-ı Kerim kelimeleri</span><b>${pct(cov.q)}</b></div><div class="meter"><i style="width:${cov.q * 100}%"></i></div>
    <p class="note">${u1}</p><p class="note"><b>Sana uygun:</b> ${u2}</p>
    <p class="note mut">Oran, bildiğin kelimelerin altyazılarda ve Kur’an’da ne sıklıkla geçtiğinden hesaplanır. Bir metni rahat anlamak için kelimelerinin yaklaşık %95’ini bilmek gerekir.</p></div>
  <div class="statsbox"><div class="sh"><b>İyi bildiğin kelimeler</b><span>son 30 gün</span></div>
    <svg viewBox="0 0 310 100" role="img" aria-label="İyi bilinen kelime sayısının gelişimi"><path d="${path}" style="fill:none;stroke:var(--tile);stroke-width:2.5"/><text x="6" y="12" style="fill:var(--muted);font-size:10px">${fmt(mx)}</text></svg></div>
  <div class="statsbox"><div class="sh"><b>Becerilere göre doğru oranı</b></div>
    ${rows.map(([t, v]) => `<div class="covrow"><span>${t}</span><b>${v === null ? "—" : "%" + v}</b></div>`).join("")}</div>
  ${calBlock()}
  <div class="statsbox"><div class="sh"><b>Seviye ilerlemesi</b><span>kelime · dil bilgisi</span></div>
    ${LV.map(([l, n], i) => { const lo = n, hi = LV[i + 1] ? LV[i + 1][1] : null, w = hi === null ? (learnedN >= lo ? 100 : 0) : Math.max(0, Math.min(100, 100 * (learnedN - lo) / (hi - lo)));
      const g = GLV[l] || [], gd = g.filter(id => (S.gr[id] || 0) >= 6).length;
      return `<div class="covrow${i === k ? " cur" : ""}"><span>${l} · ${LVDESC[l]}</span><b>${hi === null ? fmt(lo) + "+" : fmt(lo) + "–" + fmt(hi)}</b></div>
      <div class="lvbars"><div class="meter" title="Kelime"><i style="width:${w}%"></i></div><div class="meter gram" title="Dil bilgisi"><i style="width:${g.length ? 100 * gd / g.length : 0}%"></i></div><small>${g.length ? gd + "/" + g.length + " ders" : ""}</small></div>`; }).join("")}
    <p class="note mut"><span class="key"><i></i>kelime</span> <span class="key gram"><i></i>dil bilgisi (6/8 ile geçilen dersler)</span></p>
    <p class="note mut">Eşikler Modern Standart Arapça için yaklaşık değerlerdir. Dil bilgisi seviyesi, o seviyenin bütün derslerini 8 sorudan en az 6 doğruyla geçince yükselir.</p></div>
  <button class="hub" id="goTest"><span class="ar" lang="ar">اِخْتِبَار</span><div><strong>Seviye tespit sınavı</strong><span>${S.place ? `Son sonuç: ${S.place.lvl}, ~${fmt(S.place.est)} kelime` : "Arapça biliyorsan seviyeni ölç, uygun yerden başla"}</span></div></button>`;
  bindPlan();
  $("#goTest").onclick = () => { gv = { mode: "test" }; pt = null; growth(); window.scrollTo(0, 0); };
}

// --- Aylık çalışma takvimi ---
let calM = null; // [yıl, ay] (0 tabanlı ay); null = bu ay
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
function calBlock() {
  const now = new Date(), [y, m] = calM || [now.getFullYear(), now.getMonth()];
  const L = S.log || {}, goal = +S.set.goal || 100, days = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // pazartesiyle başla
  const today = dayStr();
  let act = 0, xp = 0, nw = 0, hit = 0, cells = "";
  for (let i = 0; i < lead; i++) cells += `<i class="cd pad"></i>`;
  for (let d = 1; d <= days; d++) {
    const k = dayStr(new Date(y, m, d)), e = L[k] || {}, x = e.xp || 0, done = (e.r || 0) + (e.x || 0);
    if (done || x) act++; xp += x; nw += e.n || 0; if (x >= goal) hit++;
    const lv = !done && !x ? 0 : x >= goal ? 3 : x >= goal / 2 ? 2 : 1;
    cells += `<i class="cd l${lv}${k === today ? " today" : ""}${k > today ? " fut" : ""}" title="${d} ${MONTHS[m]}: ${x} XP, ${done} cevap">${d}</i>`;
  }
  const first = Object.keys(L).sort()[0], minKey = first ? first.slice(0, 7) : today.slice(0, 7);
  const thisKey = `${y}-${String(m + 1).padStart(2, "0")}`, canPrev = thisKey > minKey, canNext = thisKey < today.slice(0, 7);
  return `<div class="statsbox cal"><div class="sh"><b>Çalışma takvimi</b><span class="calnav"><button class="linkbtn" data-cal="-1" ${canPrev ? "" : "disabled"} aria-label="Önceki ay">‹</button>${MONTHS[m]} ${y}<button class="linkbtn" data-cal="1" ${canNext ? "" : "disabled"} aria-label="Sonraki ay">›</button></span></div>
    <div class="calgrid">${["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map(t => `<b>${t}</b>`).join("")}${cells}</div>
    <div class="sf"><span><b>${act}</b> gün çalıştın</span><span><b>${hit}</b> gün hedef</span><span><b>${fmt(xp)}</b> XP</span><span><b>${fmt(nw)}</b> yeni</span></div>
    <p class="note mut"><span class="key l1"><i></i>çalıştın</span> <span class="key l2"><i></i>hedefin yarısı</span> <span class="key l3"><i></i>günlük hedef</span></p></div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-cal]"); if (!b || b.disabled) return;
  const now = new Date(), [y, m] = calM || [now.getFullYear(), now.getMonth()], d = new Date(y, m + +b.dataset.cal, 1);
  calM = [d.getFullYear(), d.getMonth()]; if (view === "gelisim") growth();
});

// --- Seviye tespit sınavı ---
const BANDS = [[0, 300], [300, 700], [700, 1200], [1200, 2000], [2000, 3000], [3000, 4500], [4500, 6500], [6500, 100000]];
const PQ = 5, GTEST = ["zamir", "isaret", "isimcumle", "izafet", "iyelik", "mazi", "muzari", "olumsuz"];
const firstM = i => (W[i][2] || "").split(/[,;]/)[0].trim();
function ptVocabQ(b) {
  const [a, z] = BANDS[b], hi = Math.min(z, N);
  let i; for (let t = 0; t < 50; t++) { i = ORDER[a + Math.floor(Math.random() * (hi - a))]; if (!OFF(i) && !pt.seen.includes(i) && firstM(i)) break; }
  pt.seen.push(i);
  const used = new Set([firstM(i)]), opts = [i];
  for (let t = 0; t < 80 && opts.length < 4; t++) { const j = ORDER[a + Math.floor(Math.random() * (hi - a))]; if (used.has(firstM(j)) || OFF(j) || !firstM(j)) continue; used.add(firstM(j)); opts.push(j); }
  return { i, opts: shuffle(opts) };
}
function placement() {
  if (!pt) {
    app.innerHTML = `<div class="top"><button class="linkbtn" id="ptBack">← Gelişim</button></div>
    <section class="tile done"><div class="ar" lang="ar">اِخْتِبَار</div><p><b>Seviye tespit sınavı</b></p>
    <p>Önce kolaydan zora kelime soruları, sonra kısa bir dil bilgisi bölümü gelir. Bilmediğin soruda tahmin yürütme, “Bilmiyorum”a bas; sonuç daha doğru çıkar. Yaklaşık 5–10 dakika sürer.</p></section>
    <div class="row"><button class="btn primary" id="ptStart">Sınava başla</button></div>`;
    $("#ptBack").onclick = () => { gv = { mode: "main" }; growth(); };
    $("#ptStart").onclick = () => { pt = { stage: "v", b: 0, n: 0, res: BANDS.map(() => [0, 0]), seen: [], q: null, ans: null, g: [], gi: 0 }; placement(); };
    return;
  }
  const top = `<div class="top"><button class="linkbtn" id="ptBack">← Sınavdan çık</button><div class="streak">${pt.stage === "v" ? `Kelime · bölüm ${pt.b + 1}/${BANDS.length}` : pt.stage === "g" ? `Dil bilgisi ${pt.gi + 1}/${GTEST.length}` : "Sonuç"}</div></div>`;
  const bindBack = () => { $("#ptBack").onclick = () => { pt = null; POOLX = null; gv = { mode: "main" }; growth(); }; };
  if (pt.stage === "v") {
    if (!pt.q) pt.q = ptVocabQ(pt.b);
    const q = pt.q, w = W[q.i];
    app.innerHTML = top + `<div class="meter"><i style="width:${100 * (pt.b * PQ + pt.n) / (BANDS.length * PQ)}%"></i></div>
    <section class="tile card"><span class="badge">Anlamı ne?</span><div class="big ar" lang="ar">${w[0]}</div></section>
    <div class="opts">${q.opts.map(j => `<button data-o="${j}">${esc(firstM(j))}</button>`).join("")}</div>
    <div class="row"><button class="btn" id="idk">Bilmiyorum</button></div>`;
    bindBack();
    const answer = ok => {
      pt.res[pt.b][1]++; if (ok) { pt.res[pt.b][0]++; (pt.okIds = pt.okIds || []).push(q.i); }
      pt.n++; pt.q = null;
      if (pt.n >= PQ) {
        const r = pt.res[pt.b][0], prevR = pt.b > 0 ? pt.res[pt.b - 1][0] : PQ;
        pt.b++; pt.n = 0;
        if (pt.b >= BANDS.length || (r <= 1 && prevR <= 2) || r === 0) { pt.stage = "g"; }
      }
      placement();
    };
    app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => answer(+b.dataset.o === q.i));
    $("#idk").onclick = () => answer(false);
    return;
  }
  if (pt.stage === "g") {
    if (!pt.q) { const L = LESSONS.find(x => x.id === GTEST[pt.gi]); let q = null; POOLX = [...Array(710).keys()]; try { for (let t = 0; t < 8 && !q; t++) q = L.q(); } catch (e) { q = null; } POOLX = null; pt.q = q || { skip: true }; pt.ans = null; }
    const q = pt.q;
    if (q.skip) { pt.g.push(false); pt.gi++; pt.q = null; if (pt.gi >= GTEST.length) { pt.stage = "r"; POOLX = null; } return placement(); }
    app.innerHTML = top + `<div class="meter"><i style="width:${100 * pt.gi / GTEST.length}%"></i></div>
    <section class="tile card"><span class="badge">${q.badge}</span>${q.prompt}</section>
    <div class="opts${q.one ? " one" : ""}">${q.opts.map((o, k) => `<button data-o="${k}">${o.h}</button>`).join("")}</div>
    <div class="row"><button class="btn" id="idk">Bilmiyorum</button></div>`;
    bindBack();
    const go = ok => { pt.g.push(ok); pt.gi++; pt.q = null; if (pt.gi >= GTEST.length) { pt.stage = "r"; POOLX = null; } placement(); };
    app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => go(q.opts[+b.dataset.o].ok));
    $("#idk").onclick = () => go(false);
    return;
  }
  // sonuç
  let est = 0, start = 0, cont = true;
  BANDS.forEach(([a, z], b) => { const [ok, n] = pt.res[b]; const p = n ? ok / n : 0; est += p * (Math.min(z, N) - a); if (cont && n && p >= 0.8) start = Math.min(z, N); else cont = false; });
  est = Math.round(est / 50) * 50; const vl = LV[vocLevel(est)][0];
  const g = pt.g, a1 = g[0] && g[1], a2 = a1 && g.slice(2, 7).filter(Boolean).length >= 4, b1 = a2 && g[7], b2 = b1 && g[8] && g[9], c1 = b2 && g[10] && g[11];
  const gl = c1 ? "C1" : b2 ? "B2" : b1 ? "B1" : a2 ? "A2" : a1 ? "A1" : "A1 öncesi";
  const already = start ? ORDER.slice(0, start).filter(i => S.p[i]).length : 0;
  app.innerHTML = top + `<section class="tile lvl-hero"><div><div class="lvbig">${vl}</div><div class="lvsub">${LVDESC[vl]}</div></div>
    <div class="lvinfo">Tahmini kelime bilgisi: <b>~${fmt(est)}</b><br>Dil bilgisi: <b>${gl}</b> <small>(${g.filter(Boolean).length}/${g.length} doğru)</small></div></section>
    <div class="statsbox">${pt.res.map(([ok, n], b) => n ? `<div class="covrow"><span>${fmt(BANDS[b][0] + 1)}–${fmt(Math.min(BANDS[b][1], N))}. kelimeler</span><b>${ok}/${n}</b></div>` : "").join("")}</div>
    ${start ? `<div class="statsbox"><p class="note"><b>Önerim:</b> ilk ${fmt(start)} kelimeyi bildiklerine ekleyip öğrenmeye ${fmt(start + 1)}. kelimeden başlamak. Eklenen kelimeler önümüzdeki haftalarda ara ara tekrar olarak sorulur; bilemediklerin otomatik olarak yeniden öğrenme listesine düşer.${already ? ` Daha önce çalıştığın ${fmt(already)} kelimenin durumu değişmez.` : ""}</p></div>
    <div class="row"><button class="btn" id="ptNo">Şimdilik değiştirme</button><button class="btn primary" id="ptYes">Bu seviyeden başla</button></div>`
    : `<div class="statsbox"><p class="note">Sonuca göre en baştan başlamak en verimlisi. Doğru bildiğin ${fmt((pt.okIds || []).length)} kelime bildiklerine eklenebilir.</p></div>
    <div class="row"><button class="btn" id="ptNo">Değiştirme</button><button class="btn primary" id="ptYes">Doğru bildiklerimi ekle</button></div>`}`;
  bindBack();
  const done = () => { S.place = { d: dayStr(), est, lvl: vl, g: gl }; save(); pt = null; gv = { mode: "main" }; cur = null; growth(); window.scrollTo(0, 0); };
  $("#ptNo").onclick = done;
  $("#ptYes").onclick = () => {
    const nm = nowMin(); let added = 0;
    for (const i of ORDER.slice(0, start)) if (!S.p[i] && !OFF(i)) { S.p[i] = [5, nm + 1440 + Math.floor(Math.random() * 90 * 1440), 1, 0]; added++; }
    for (const i of (pt.okIds || [])) if (!S.p[i]) { S.p[i] = [5, nm + 1440 + Math.floor(Math.random() * 30 * 1440), 1, 0]; added++; }
    toast(fmt(added) + " kelime bildiklerine eklendi."); recent = []; done();
  };
}

// --- Ayet ve hadisler ---
function textKnown(o) { let t = 0, k = 0; for (const [, it] of o.v) for (const [, , id] of it) { t++; if (id >= 0 && learned(id)) k++; } return [k, t]; }
function textList() {
  const row = (o, k) => { const [kn, t] = textKnown(o); return `<button class="vrow" data-x="${k}"><div><div class="m">${esc(o.t)}</div><div class="t">${esc(o.ref)} · ${t} kelime · bildiğin ${kn}${S.tb && S.tb[k] !== undefined ? " · en iyi " + S.tb[k] : ""}</div></div><span class="ar" lang="ar" style="font-size:1.25rem">${o.v[0][1].slice(0, 2).map(x => x[0]).join(" ")}…</span></button>`; };
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><h2>Ayet ve hadisler</h2>
  <p class="sub">Meşhur ayet ve hadislerden seçmeler, kelime kelime anlamlarıyla. Metne dokunarak anlamları gör, sonra alıştırmayla pekiştir. Türkçe çeviriler anlamaya yardım için sadeleştirilmiştir.</p>
  <h3 class="sec">Ayetler</h3><div class="list">${TX.map((o, k) => o.k === "a" ? row(o, k) : "").join("")}</div>
  <h3 class="sec">Hadisler</h3><div class="list">${TX.map((o, k) => o.k === "h" ? row(o, k) : "").join("")}</div>`;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  app.querySelectorAll("[data-x]").forEach(b => b.onclick = () => { pv = { mode: "text", k: +b.dataset.x, hide: false }; practice(); window.scrollTo(0, 0); });
}
function textPage(k) {
  const o = TX[k], [kn, t] = textKnown(o), full = o.v.map(([, it]) => it.map(x => x[0]).join(" ")).join(" ");
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backX">← Ayet ve hadisler</button><div class="streak">bildiğin ${kn}/${t}</div></div>
  <section class="tile card" style="min-height:0;padding:16px"><div class="mean">${esc(o.t)}</div><div class="tl">${esc(o.ref)}</div>${listenBtn(full, "Tamamını dinle")}</section>
  <div class="pills small" style="margin-top:12px"><button data-h="0" aria-pressed="${!pv.hide}">Anlamları göster</button><button data-h="1" aria-pressed="${!!pv.hide}">Gizle, dokununca göster</button></div>
  <div class="interlin">${o.v.map(([vn, it]) => it.map((x, j) => `<button class="wchip${x[2] >= 0 && learned(x[2]) ? " known" : ""}${pv.hide ? " hid" : ""}" data-w="${esc(x[0])}"><span class="ar" lang="ar">${x[0]}</span><small>${esc(x[1])}</small></button>`).join("") + (o.k === "a" ? `<span class="vend ar" lang="ar">﴿${String(vn).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d])}﴾</span>` : "")).join("")}</div>
  <p class="note mut" style="margin:6px 2px">Yeşil çerçeveli kelimeleri zaten öğrendin.</p>
  <details class="meal"><summary>Türkçe anlamı</summary><p>${esc(o.tr)}</p></details>
  <div class="row"><button class="btn primary" id="txQ">Kelime alıştırması</button></div>`;
  $("#backX").onclick = () => { pv = { mode: "texts" }; practice(); };
  app.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { pv.hide = b.dataset.h === "1"; practice(); });
  app.querySelectorAll(".wchip").forEach(b => b.onclick = () => { b.classList.remove("hid"); speak(b.dataset.w); });
  $("#txQ").onclick = () => {
    const items = []; const seen = new Set();
    for (const [, it] of o.v) for (const x of it) { const key = x[0] + "|" + x[1]; if (!seen.has(key) && !/^\(/.test(x[1])) { seen.add(key); items.push(x); } }
    const queue = shuffle(items).slice(0, Math.min(10, items.length));
    const allG = TX.flatMap(oo => oo.v.flatMap(([, it]) => it.map(x => x[1]))).filter(g => !/^\(/.test(g));
    const gen = () => { const x = queue[gq ? gq.n % queue.length : 0]; const wr = shuffle(items.map(y => y[1]).concat(shuffle(allG).slice(0, 10))).filter(g => g !== x[1]).map(g => ({ k: g, h: esc(g) }));
      const ctx = o.v.flatMap(([, it]) => it.map(y => y[0])); const pos = ctx.indexOf(x[0]); const snip = ctx.slice(Math.max(0, pos - 2), pos + 3).map(y => y === x[0] ? `<mark>${y}</mark>` : y).join(" ");
      return { badge: o.k === "a" ? "Ayetteki kelime" : "Hadisteki kelime", prompt: `<div class="big ar" lang="ar">${x[0]}</div><div class="ar ctxline" lang="ar">${snip}</div>`, sayFirst: x[0], one: true,
        opts: opts4({ k: x[1], h: esc(x[1]) }, wr), fb: `${arS(x[0])} = ${esc(x[1])}${x[2] >= 0 ? ` <small class="mut">(sözlük: ${esc(W[x[2]][2])})</small>` : ""}`, say: x[0] }; };
    startQuiz({ mod: "txt", gen, total: queue.length, lesson: "tx" + k, store: "tb", key: k, backLabel: "Metin", back: () => { pv = { mode: "text", k, hide: pv.hide }; practice(); } });
  };
}

// ================= İLERİ DİL BİLGİSİ (B2–C2) =================
const VINFO = DATA("vinfo"); // id -> {f: bab, m: masdar}
const WEAK = "وياءأإؤئى";
const accTan = w => /ة$/.test(w) ? w + "ً" : /اء$/.test(w) ? w + "ً" : w + "ًا";
const isCons = c => !VOW.includes(c) && !"âîû".includes(c);
const copPast = a => { const l = a[a.length - 1], v = h4(nv(a)); return isVowEnd(a) ? a + "yd" + v : a + ("fstkçşhp".includes(l) ? "t" : "d") + v; };
const ablT = n => { const l = n[n.length - 1], back = isBack(nv(n)); return n + (isVowEnd(n) ? "d" : "fstkçşhp".includes(l) ? "t" : "d") + (back ? "an" : "en"); };
function trPart(id) { const b = trVerb(W[id][2]); if (!b) return null; const st = b.st, back = isBack(lastV(st)); return b.pre + (isVowEnd(st) ? st + "y" : soften(st)) + (back ? "an" : "en"); }
function pasSt(st) { if (isVowEnd(st)) return st + "n"; if (st.endsWith("l")) return st + h4(lastV(st)) + "n"; const s = soften(st); return s + h4(lastV(s)) + "l"; }
function trPass(id, kind) { const b = trVerb(W[id][2]); if (!b) return null; const ps = pasSt(b.st); return b.pre + (kind === "past" ? trPast(ps, 2) : trPres(ps, 2)); }
function trPassPart(id) { const b = trVerb(W[id][2]); if (!b) return null; const ps = pasSt(b.st); return b.pre + ps + (isBack(lastV(ps)) ? "an" : "en"); }
const AOR_IR = new Set("al bil bul dur gel gör kal ol öl san var ver vur".split(" "));
function aorSt(st) {
  if (isVowEnd(st)) return st + "r";
  const s = soften(st), nvw = (st.match(/[aeıioöuü]/g) || []).length;
  if (nvw <= 1 && !AOR_IR.has(st)) return s + (isBack(lastV(st)) ? "a" : "e") + "r";
  if (s !== st && /et$/.test(st)) return s + "er";
  return s + h4(lastV(st)) + "r";
}
function trAor(id, p) { const b = trVerb(W[id][2]); if (!b) return null; const a = aorSt(b.st), v = h4(lastV(a)), back = isBack(lastV(a)); return b.pre + a + ["" + v + "m", "s" + v + "n", "", v + "z", "s" + v + "n" + v + "z", back ? "lar" : "ler"][p]; }
function trCond(id, p) { const b = trVerb(W[id][2]); if (!b) return null; const a = aorSt(b.st), back = isBack(lastV(a)), A = back ? "a" : "e"; return b.pre + a + "s" + A + ["m", "n", "", "k", back ? "nız" : "niz", back ? "lar" : "ler"][p]; }
function trGer(id) { const b = trVerb(W[id][2]); if (!b) return null; const st = b.st; return b.pre + (isVowEnd(st) ? st + "y" : soften(st)) + (isBack(lastV(st)) ? "arak" : "erek"); }
const trInf = id => { const b = trVerb(W[id][2]); return b ? b.pre + b.st + (isBack(lastV(b.st)) ? "ma" : "me") : null; };
// sağlam üç harfli (I. bab) fiillerden ism-i fâil, ism-i mef’ûl
function soundRoot(id) { if (!VINFO[id] || VINFO[id].f !== "I") return null; const b = bare(W[id][0]); if (b.length !== 3 || [...b].some(c => WEAK.includes(c)) || b[1] === b[2]) return null; return b; }
const failOf = r => r[0] + "َا" + r[1] + "ِ" + r[2];
const mefulOf = r => "مَ" + r[0] + "ْ" + r[1] + "ُو" + r[2];
function elOf(i) { const r = ROOT[i]; if (!r || r.length !== 3 || [...r].some(c => WEAK.includes(c) || c === "ء") || r[1] === r[2]) return null; const b = bare(W[i][0]); if (!/^(.)(.)ي(.)$/.test(b) && !/^(.)ا(.)(.)$/.test(b) && b.length !== 3) return null; return "أَ" + r[0] + "ْ" + r[1] + "َ" + r[2]; }
const poolAel = () => poolA().filter(i => elOf(i));
const poolVp = () => gramIds().filter(i => CJ[i] && trVerb(W[i][2]) && CJ[i][5] && CJ[i][5][0] && CJ[i][5][1]);
const poolVf = () => gramIds().filter(i => CJ[i] && trVerb(W[i][2]) && soundRoot(i));
const poolVbab = () => gramIds().filter(i => VINFO[i] && ["II", "III", "IV", "V", "VI", "VII", "VIII", "X"].includes(VINFO[i].f));
const poolVm = () => gramIds().filter(i => VINFO[i] && VINFO[i].m && trVerb(W[i][2]));
const poolNpl = () => gramIds().filter(i => W[i][4] === "noun" && W[i][5] && genderOf(i) && t1(W[i][2]) && !EXW.has(W[i][0]));
const BABS = { II: ["فَعَّلَ", "ettirgen, yoğunlaştırma"], III: ["فَاعَلَ", "birine yönelik, karşılıklı"], IV: ["أَفْعَلَ", "ettirgen"], V: ["تَفَعَّلَ", "II. babın dönüşlüsü"], VI: ["تَفَاعَلَ", "karşılıklı, işteşlik"], VII: ["اِنْفَعَلَ", "edilgen, dönüşlü"], VIII: ["اِفْتَعَلَ", "dönüşlü, kendi için"], X: ["اِسْتَفْعَلَ", "isteme, öyle sayma"] };
const NUMS = [["ثَلَاثَة", "ثَلَاث", 3], ["أَرْبَعَة", "أَرْبَع", 4], ["خَمْسَة", "خَمْس", 5], ["سِتَّة", "سِتّ", 6], ["سَبْعَة", "سَبْع", 7], ["ثَمَانِيَة", "ثَمَانِي", 8], ["تِسْعَة", "تِسْع", 9], ["عَشَرَة", "عَشْر", 10]];
const KANE = { kane: [["كَانَ", "كَانَتْ"], a => copPast(a)], leyse: [["لَيْسَ", "لَيْسَتْ"], a => a + " değil"], asbaha: [["أَصْبَحَ", "أَصْبَحَتْ"], a => a + " oldu"] };
const INNE = [["إِنَّ", (n, a) => `Şüphesiz ${n} ${a}.`], ["كَأَنَّ", (n, a) => `Sanki ${n} ${a}.`], ["لَيْتَ", (n, a) => `Keşke ${n} ${a} olsa.`], ["لَعَلَّ", (n, a) => `Belki ${n} ${a}.`]];
const HUMAN = new Set("رَجُل اِمْرَأَة وَلَد بِنْت طِفْل طَالِب مُعَلِّم صَدِيق طَبِيب أَب أُمّ أَخ أُخْت جَار ضَيْف مُدِير مُوَظَّف رَئِيس مَلِك شُرْطِيّ مُهَنْدِس جُنْدِيّ شَخْص إِنْسَان زَوْج زَوْجَة جَدّ جَدَّة عَمّ خَال مُسْلِم لَاعِب سَائِق فَلَّاح تَاجِر كَاتِب".split(" "));
const poolH = () => poolN(true).filter(i => HUMAN.has(W[i][0]));
const jv = (v, n) => (/تْ$/.test(v) && /^ال/.test(n)) ? v.slice(0, -1) + "ِ" + " " + n : v + " " + n;
const adjG = (n, a) => (genderOf(n) === "f" ? femOf(a) : W[a][0]);
const TN = i => t1(W[i][2]);
LESSONS.push(
 { id: "mevsul", t: "İsm-i mevsûl: الَّذِي، الَّتِي", ar: "الَّذِي", lv: "B2",
   body: () => `<p>İsm-i mevsûl Türkçedeki “-an, -en” sıfat-fiiline karşılık gelir ve ismin cinsine, sayısına uyar.</p>
   <div class="ctab"><table><tbody>${[["الَّذِي", "eril tekil"], ["الَّتِي", "dişil tekil"], ["اللَّذَانِ", "eril ikil"], ["اللَّتَانِ", "dişil ikil"], ["الَّذِينَ", "eril çoğul"], ["اللَّاتِي", "dişil çoğul"]].map(([a, t]) => `<tr><td>${arS(a, 1)}</td><td>${t}</td></tr>`).join("")}</tbody></table></div>
   <p>${arS("الطَّالِبُ الَّذِي كَتَبَ", 1)} yazan öğrenci · ${arS("الطَّالِبَةُ الَّتِي كَتَبَتْ", 1)} yazan kız öğrenci</p>`,
   q: () => { const ph = poolH(), pn = ph.length >= 2 ? ph : poolN(true), pv2 = poolV(); if (pn.length < 2 || pv2.length < 2) return null; const n = pick1(pn), v = pick1(pv2), f = genderOf(n) === "f", c = CJ[v];
     const N = defArt(W[n][0]) + "ُ", ok = N + " " + (f ? "الَّتِي " + c[0][4] : "الَّذِي " + c[0][3]), b1 = N + " " + (f ? "الَّذِي " + c[0][3] : "الَّتِي " + c[0][4]), b2 = N + " " + (f ? "الَّذِي " + c[0][4] : "الَّتِي " + c[0][3]);
     return { badge: "Doğru ilgi zamiri", prompt: `<div class="trbig">${cap(trPart(v) + " " + TN(n))}</div>`, one: true, opts: shuffle([{ h: arS(ok), ok: true }, { h: arS(b1), ok: false }, { h: arS(b2), ok: false }]), fb: `${arS(ok)}: ${arS(W[n][0])} ${f ? "dişil" : "eril"}; zamir ve fiil ona uyar.`, say: ok }; } },
 { id: "kane", t: "Kâne ve kardeşleri", ar: "كَانَ", lv: "B2",
   body: () => `<p>${arS("كَانَ", 1)} (idi), ${arS("لَيْسَ", 1)} (değil), ${arS("أَصْبَحَ", 1)} / ${arS("صَارَ", 1)} (oldu), ${arS("مَا زَالَ", 1)} (hâlâ) isim cümlesinin başına gelir. Özne ötreli kalır, <b>haber üstün (nasb)</b> olur.</p>
   <p>${arS("الْبَيْتُ كَبِيرٌ", 1)} Ev büyük. → ${arS("كَانَ الْبَيْتُ كَبِيرًا", 1)} Ev büyüktü.</p><p>Dişil özneyle fiil de dişil olur: ${arS("كَانَتِ الْمَدْرَسَةُ كَبِيرَةً", 1)}</p>`,
   q: () => { const pn = poolN(true), pa = poolA(); if (pn.length < 3 || pa.length < 2) return null; const n = pick1(pn), a = pick1(pa), f = genderOf(n) === "f", k = pick1(Object.keys(KANE)), [vs, tf] = KANE[k];
     const V = vs[f ? 1 : 0], A = adjG(n, a), S1 = jv(V, defArt(W[n][0]) + "ُ ") , ok = S1 + accTan(A), bad = S1 + A + "ٌ", tr = cap(TN(n) + " " + tf(TN(a))) + ".";
     return { badge: "Haber hangi hâlde?", prompt: `<div class="trbig">${tr}</div>`, one: true, opts: shuffle([{ h: arS(ok), ok: true }, { h: arS(bad), ok: false }]), fb: `${arS(ok)}: ${arS(vs[0])}’den sonra haber üstün olur (-an).`, say: ok }; } },
 { id: "inne", t: "İnne ve kardeşleri", ar: "إِنَّ", lv: "B2",
   body: () => `<p>${arS("إِنَّ", 1)} şüphesiz, ${arS("أَنَّ", 1)} ki, ${arS("لٰكِنَّ", 1)} fakat, ${arS("كَأَنَّ", 1)} sanki, ${arS("لَيْتَ", 1)} keşke, ${arS("لَعَلَّ", 1)} belki.</p>
   <p>Bunlar kâne’nin tersine çalışır: <b>özne üstün</b> olur, haber ötreli kalır: ${arS("إِنَّ الْبَيْتَ كَبِيرٌ", 1)} Şüphesiz ev büyük.</p>`,
   q: () => { const pn = poolN(true), pa = poolA(); if (pn.length < 3 || pa.length < 2) return null; const n = pick1(pn), a = pick1(pa), A = adjG(n, a) + "ٌ", [p, tf] = pick1(INNE);
     const ok = p + " " + defArt(W[n][0]) + "َ " + A;
     if (Math.random() < .5) return { badge: "Doğru biçim", prompt: `<div class="trbig">${tf(TN(n), TN(a))}</div>`, one: true, opts: shuffle([{ h: arS(ok), ok: true }, { h: arS(p + " " + defArt(W[n][0]) + "ُ " + A), ok: false }]), fb: `${arS(ok)}: ${arS(p)}’den sonra özne üstün olur (-a).`, say: ok };
     return { badge: "Anlamı ne?", prompt: `<div class="big ar" lang="ar" style="font-size:2.2rem">${ok}</div>`, sayFirst: ok, one: true, opts: shuffle(INNE.map(([pp, ff]) => ({ h: ff(TN(n), TN(a)), ok: pp === p }))), fb: `${arS(ok)} = ${tf(TN(n), TN(a))}`, say: ok }; } },
 { id: "bab", t: "Fiil kalıpları (bâblar II–X)", ar: "بَاب", lv: "B2",
   body: () => `<p>Üç harfli kökler kalıplara dökülerek yeni anlamlar kazanır. Kalıbı tanımak, bilinmeyen fiilin anlamını tahmin etmeyi kolaylaştırır.</p>
   <div class="ctab"><table><tbody>${Object.entries(BABS).map(([k, [p, t]]) => `<tr><td>${k}</td><td>${arS(p, 1)}</td><td>${t}</td></tr>`).join("")}</tbody></table></div>
   <p>Örnek: ${arS("عَلِمَ")} bildi → ${arS("عَلَّمَ")} öğretti (II) → ${arS("تَعَلَّمَ")} öğrendi (V) → ${arS("اِسْتَعْلَمَ")} bilgi istedi (X).</p>`,
   q: () => { const pv2 = poolVbab(); if (pv2.length < 3) return null; const i = pick1(pv2), f = VINFO[i].f, others = shuffle(Object.keys(BABS).filter(k => k !== f)).slice(0, 3);
     return { badge: "Hangi bâb?", prompt: `<div class="big ar" lang="ar">${W[i][0]}</div><div class="tl">${esc(W[i][2])}</div>`, sayFirst: W[i][0], opts: shuffle([f, ...others].map(k => ({ h: `${k} ${arS(BABS[k][0])}`, ok: k === f }))), fb: `${arS(W[i][0])} ${f}. bâb: ${arS(BABS[f][0])} (${BABS[f][1]})`, say: W[i][0] }; } },
 { id: "mechul", t: "Edilgen (meçhul) fiil", ar: "فُعِلَ", lv: "B2",
   body: () => `<p>Mazi edilgen: ilk harf ötre, sondan bir önceki esre: ${arS("كَتَبَ")} yazdı → ${arS("كُتِبَ", 1)} yazıldı.</p><p>Muzari edilgen: önek ötre, sondan bir önceki üstün: ${arS("يَكْتُبُ")} yazar → ${arS("يُكْتَبُ", 1)} yazılır.</p><p>Edilgen cümlede fail söylenmez; nesne özne yerine geçer ve ötreli olur.</p>`,
   q: () => { const pv2 = poolVp(); if (pv2.length < 3) return null; const i = pick1(pv2), c = CJ[i], P = c[5], k = pick1(["past", "pres"]);
     const ok = k === "past" ? P[0] : P[1], tr = trPass(i, k); if (!tr) return null;
     return { badge: "Edilgen", prompt: `<div class="trbig">${cap(tr)}</div><div class="tl">(o, erkek / o şey)</div>`, opts: shuffle([{ h: arS(P[0]), ok: P[0] === ok }, { h: arS(P[1]), ok: P[1] === ok }, { h: arS(c[0][3]), ok: false }, { h: arS(c[1][3]), ok: false }]), fb: `${arS(ok)} = ${tr}`, say: ok }; } },
 { id: "failmeful", t: "İsm-i fâil ve ism-i mef’ûl", ar: "فَاعِل", lv: "B2",
   body: () => { const i = poolVf()[0] ?? IDX["كَتَبَ"], r = soundRoot(i) || "كتب"; return `<p>Sağlam üç harfli fiillerden:</p><p><b>İsm-i fâil</b> (yapan) فَاعِل: ${arS(failOf(r), 1)} ${esc(trPart(i) || "")}</p><p><b>İsm-i mef’ûl</b> (yapılan) مَفْعُول: ${arS(mefulOf(r), 1)} ${esc(trPassPart(i) || "")}${mark(i)}</p><p>Diğer bâblarda fâil مُـ ile başlar ve sondan bir önceki esreli, mef’ûl üstünlüdür: مُعَلِّم öğretmen, مُعَلَّم öğretilmiş.</p>`; },
   q: () => { const pv2 = poolVf(); if (pv2.length < 3) return null; const i = pick1(pv2), r = soundRoot(i), fa = failOf(r), me = mefulOf(r), askF = Math.random() < .5;
     return { badge: askF ? "İsm-i fâil" : "İsm-i mef’ûl", prompt: `<div class="trbig">${cap(askF ? trPart(i) : trPassPart(i))}</div><div class="tl">${arS(W[i][0])}</div>`, opts: shuffle([{ h: arS(fa), ok: askF }, { h: arS(me), ok: !askF }, { h: arS(W[i][0]), ok: false }, { h: arS(CJ[i][1][3]), ok: false }]), fb: `${arS(fa)} ${esc(trPart(i))} · ${arS(me)} ${esc(trPassPart(i))}`, say: askF ? fa : me }; } },
 { id: "masdar", t: "Masdar (fiil ismi)", ar: "مَصْدَر", lv: "C1",
   body: () => `<p>Masdar, fiilin isim hâlidir (yazma, yazmak). I. babda kalıpları çeşitlidir ve ezberlenir; diğer bâblarda düzenlidir:</p>
   <div class="ctab"><table><tbody>${[["II", "تَفْعِيل"], ["III", "مُفَاعَلَة"], ["IV", "إِفْعَال"], ["V", "تَفَعُّل"], ["VI", "تَفَاعُل"], ["VII", "اِنْفِعَال"], ["VIII", "اِفْتِعَال"], ["X", "اِسْتِفْعَال"]].map(([k, p]) => `<tr><td>${k}</td><td>${arS(p, 1)}</td></tr>`).join("")}</tbody></table></div>`,
   q: () => { const pv2 = poolVm(); if (pv2.length < 4) return null; const i = pick1(pv2), m = VINFO[i].m; const wr = shuffle(pv2.filter(j => j !== i && VINFO[j].m !== m)).slice(0, 5).map(j => ({ k: VINFO[j].m, h: arS(VINFO[j].m) }));
     return { badge: "Masdarı hangisi?", prompt: `<div class="big ar" lang="ar">${W[i][0]}</div><div class="tl">${esc(W[i][2])}</div>`, sayFirst: W[i][0], opts: opts4({ k: m, h: arS(m) }, wr), fb: `${arS(W[i][0])} → ${arS(m)} ${esc(trInf(i) || "")}`, say: m }; } },
 { id: "sart", t: "Şart cümleleri: إِذَا، إِنْ، لَوْ", ar: "إِذَا", lv: "C1",
   body: () => `<p>${arS("إِذَا", 1)} ve ${arS("إِنْ", 1)} “-se, -sa” demektir. إذا ile genelde iki mazi kullanılır ama anlam geniş zamandır: ${arS("إِذَا دَرَسْتَ نَجَحْتَ", 1)} Çalışırsan başarırsın.</p><p>${arS("إِنْ", 1)} ile iki cezimli muzari de gelir: ${arS("إِنْ تَدْرُسْ تَنْجَحْ", 1)}</p><p>${arS("لَوْ", 1)} gerçekleşmemiş şartı anlatır: “… olsaydı”.</p>`,
   q: () => { const pv2 = poolV().filter(i => trCond(i, 0)); if (pv2.length < 3) return null; const [v1, v2] = shuffle(pv2).slice(0, 2), a = pick1([1, 3, 8, 9]), p = TP[a][0], c1 = CJ[v1], c2 = CJ[v2];
     const ar = "إِذَا " + c1[0][a] + " " + c2[0][a], ok = cap(trCond(v1, p) + " " + trAor(v2, p)) + ".", bad = cap(trCond(v2, p) + " " + trAor(v1, p)) + ".", bad2 = cap(trV(v1, "past", p) + " ve " + trAor(v2, p)) + ".";
     return { badge: "Şart cümlesi", prompt: `<div class="big ar" lang="ar" style="font-size:2.1rem">${ar}</div><div class="tl">(${TP[a][1]})</div>`, sayFirst: ar, one: true, opts: opts4({ k: ok, h: ok }, [{ k: bad, h: bad }, { k: bad2, h: bad2 }]), fb: `${arS(ar)} = ${ok}`, say: ar }; } },
 { id: "tafdil", t: "Karşılaştırma: ism-i tafdîl", ar: "أَفْعَل", lv: "C1",
   body: () => `<p>Üstünlük için أَفْعَل kalıbı kullanılır: ${arS("كَبِير")} büyük → ${arS("أَكْبَر", 1)} daha büyük. “-den” için ${arS("مِنْ")} gelir.</p><p>${arS("الْبَيْتُ أَكْبَرُ مِنَ الْمَدْرَسَةِ", 1)} Ev okuldan daha büyük.</p><p>Belirli hâli “en” anlamı verir: ${arS("الْأَكْبَرُ", 1)} en büyük. Hayret ifadesi: ${arS("مَا أَكْبَرَ الْبَيْتَ!", 1)} Ev ne kadar büyük!</p>`,
   q: () => { const pn = poolN(), pa = poolAel(); if (pn.length < 3 || pa.length < 1) return null; const [n1, n2] = shuffle(pn).slice(0, 2), a = pick1(pa), el = elOf(a);
     const ar = defArt(W[n1][0]) + "ُ " + el + "ُ مِنَ " + defArt(W[n2][0]) + "ِ", ok = cap(`${TN(n1)} ${ablT(TN(n2))} daha ${TN(a)}`) + ".", bad = cap(`${TN(n2)} ${ablT(TN(n1))} daha ${TN(a)}`) + ".", bad2 = cap(`${TN(n1)} en ${TN(a)}`) + ".";
     return { badge: "Karşılaştırma", prompt: `<div class="big ar" lang="ar" style="font-size:2.1rem">${ar}</div>`, sayFirst: ar, one: true, opts: shuffle([{ h: ok, ok: true }, { h: bad, ok: false }, { h: bad2, ok: false }]), fb: `${arS(ar)} = ${ok}`, say: ar }; } },
 { id: "sayi", t: "Sayılar 3–10 ve sayılan", ar: "ثَلَاثَة", lv: "C1",
   body: () => `<p>3–10 arası sayılar sayılan şeyin cinsinin <b>tersini</b> alır: eril isimle ة’li, dişil isimle ة’siz. Sayılan çoğul ve esreli olur.</p>
   <p>${arS("ثَلَاثَةُ كُتُبٍ", 1)} üç kitap (كِتَاب eril) · ${arS("ثَلَاثُ سَيَّارَاتٍ", 1)} üç araba (سَيَّارَة dişil)</p>`,
   q: () => { const pn = poolNpl(); if (pn.length < 3) return null; const i = pick1(pn), [m, f, n] = pick1(NUMS), g = genderOf(i), pl = W[i][5];
     const ok = (g === "m" ? m : f) + " " + pl, bad = (g === "m" ? f : m) + " " + pl;
     return { badge: "Doğru sayı", prompt: `<div class="trbig">${n} ${TN(i)}</div>`, one: true, opts: shuffle([{ h: arS(ok), ok: true }, { h: arS(bad), ok: false }]), fb: `${arS(ok)}: ${arS(W[i][0])} ${g === "m" ? "eril, sayı ة alır" : "dişil, sayı ة almaz"}.`, say: ok }; } },
 { id: "hal", t: "Hâl (durum bildiren isim)", ar: "حَال", lv: "C2",
   body: () => `<p>Hâl, işin hangi durumda yapıldığını anlatır; belirsiz ve üstün (tenvinli) olur. Türkçede “-arak, -erek” ile karşılanır.</p><p>${arS("جَاءَ الطَّالِبُ ضَاحِكًا", 1)} Öğrenci gülerek geldi.</p>`,
   q: () => { const pn = poolH(), pv2 = poolV(), pf = poolVf(); if (pn.length < 1 || pv2.length < 2 || pf.length < 2) return null; const n = pick1(pn), v = pick1(pv2), h = pick1(pf.filter(x => x !== v).concat(pf)), f = genderOf(n) === "f";
     const hal = failOf(soundRoot(h)) + (f ? "َةً" : "ًا"), halBad = failOf(soundRoot(h)) + (f ? "َةٌ" : "ٌ"), V = CJ[v][0][f ? 4 : 3], S1 = jv(V, defArt(W[n][0]) + "ُ ");
     const tr = cap(`${TN(n)} ${trGer(h)} ${trV(v, "past", 2)}`) + ".";
     return { badge: "Hâl", prompt: `<div class="trbig">${tr}</div>`, one: true, opts: shuffle([{ h: arS(S1 + hal), ok: true }, { h: arS(S1 + halBad), ok: false }]), fb: `${arS(S1 + hal)}: hâl üstün ve tenvinli olur.`, say: S1 + hal }; } },
 { id: "istisna", t: "İstisna ve nidâ", ar: "إِلَّا", lv: "C2",
   body: () => `<p><b>İstisna:</b> ${arS("إِلَّا", 1)} “-den başka, hariç”. Olumlu ve tam cümlede istisna edilen üstün olur: ${arS("حَضَرَ الطُّلَّابُ إِلَّا طَالِبًا", 1)} Bir öğrenci hariç öğrenciler geldi. ${arS("غَيْر")} ve ${arS("سِوَى")} da aynı anlamdadır, kendilerinden sonraki isim esreli olur.</p>
   <p><b>Nidâ (seslenme):</b> ${arS("يَا", 1)} ey. Belirli tek isim tenvinsiz ötreli olur: ${arS("يَا طَالِبُ", 1)} Ey öğrenci! İsim tamlamasında ilk isim üstün olur: ${arS("يَا عَبْدَ اللّٰهِ", 1)}</p>`,
   q: () => { const ph = poolH(), pn = ph.length >= 2 ? ph : poolN(); if (pn.length < 2) return null; const i = pick1(pn), w = W[i][0];
     if (Math.random() < .5) return { badge: "Nidâ", prompt: `<div class="trbig">Ey ${TN(i)}!</div>`, one: true, opts: shuffle([{ h: arS("يَا " + w + "ُ"), ok: true }, { h: arS("يَا " + w + "ٌ"), ok: false }, { h: arS("يَا " + defArt(w) + "ُ"), ok: false }]), fb: `${arS("يَا " + w + "ُ")}: tenvinsiz ötre.`, say: "يَا " + w + "ُ" };
     const ok = "الْجَمِيعُ هُنَا إِلَّا " + accTan(w), bad = "الْجَمِيعُ هُنَا إِلَّا " + w + "ٌ";
     return { badge: "İstisna", prompt: `<div class="trbig">Bir ${TN(i)} hariç herkes burada.</div>`, one: true, opts: shuffle([{ h: arS(ok), ok: true }, { h: arS(bad), ok: false }]), fb: `${arS(ok)}: olumlu tam cümlede istisna edilen üstün olur.`, say: ok }; } }
);
Object.assign(GLV, { B2: ["mevsul", "kane", "inne", "bab", "mechul", "failmeful"], C1: ["masdar", "sart", "tafdil", "sayi"], C2: ["hal", "istisna"] });
LESSONS.forEach(L => { if (!L.lv) for (const k in GLV) if (GLV[k].includes(L.id)) L.lv = k; });
GTEST.push("kane", "mechul", "tafdil", "sart");

// ileri seviye cümle kalıpları (yalnızca öğrenilmiş kelimelerle)
function sentGen2() {
  const pn = poolN(true), pa = poolA(), pv2 = poolV(), pvp = poolVp(), pae = poolAel(), make = [];
  if (pn.length >= 2 && pa.length >= 2) {
    make.push(() => { const n = pick1(pn), a = pick1(pa), f = genderOf(n) === "f", [vs, tf] = KANE[pick1(Object.keys(KANE))]; return { ar: jv(vs[f ? 1 : 0], defArt(W[n][0]) + "ُ ") + accTan(adjG(n, a)), tr: cap(TN(n) + " " + tf(TN(a))) + "." }; });
    make.push(() => { const n = pick1(pn), a = pick1(pa), [p, tf] = pick1(INNE); return { ar: p + " " + defArt(W[n][0]) + "َ " + adjG(n, a) + "ٌ", tr: tf(TN(n), TN(a)) }; });
  }
  const ph2 = poolH(); if (ph2.length >= 1 && pv2.length >= 2 && pa.length >= 2) make.push(() => { const n = pick1(ph2), v = pick1(pv2), a = pick1(pa), f = genderOf(n) === "f", c = CJ[v]; if (!trPart(v)) return null;
    return { ar: defArt(W[n][0]) + "ُ " + (f ? "الَّتِي " + c[0][4] : "الَّذِي " + c[0][3]) + " " + adjG(n, a) + "ٌ", tr: cap(`${trPart(v)} ${TN(n)} ${TN(a)}`) + "." }; });
  if (pvp.length >= 2) make.push(() => { const v = pick1(pvp), k = pick1(["past", "pres"]), P = CJ[v][5]; return { ar: k === "past" ? P[0] : P[1], tr: cap(trPass(v, k)) + "." }; });
  if (pn.length >= 3 && pae.length) make.push(() => { const [n1, n2] = shuffle(pn).slice(0, 2), a = pick1(pae); return { ar: defArt(W[n1][0]) + "ُ " + elOf(a) + "ُ مِنَ " + defArt(W[n2][0]) + "ِ", tr: cap(`${TN(n1)} ${ablT(TN(n2))} daha ${TN(a)}`) + "." }; });
  if (pv2.length >= 3) make.push(() => { const [v1, v2] = shuffle(pv2).slice(0, 2), a = pick1([1, 3, 8, 9]), p = TP[a][0]; if (!trCond(v1, p) || !trAor(v2, p)) return null; return { ar: "إِذَا " + CJ[v1][0][a] + " " + CJ[v2][0][a], tr: cap(trCond(v1, p) + " " + trAor(v2, p)) + "." }; });
  return make;
}

// ================= ÇALIŞMA PLANI VE ÖNERİ =================
function weekStats() {
  const L = S.log || {}; let days = 0, n = 0, les = 0; const marks = [];
  for (let i = 6; i >= 0; i--) { const d = dayStr(new Date(Date.now() - i * 864e5)), e = L[d] || {}; const on = (e.r || 0) + (e.x || 0) > 0; if (on) days++; n += e.n || 0; les += e.L || 0; marks.push(on); }
  return { days, n, les, marks };
}
function planItems() {
  ensureDay(); const c = counts(), e = (S.log || {})[dayStr()] || {}, limit = S.set.daily + S.day.bonus, w = weekStats();
  return {
    day: [
      { t: c.due ? `Bekleyen ${c.due} tekrarı bitir` : "Bekleyen tekrar yok", ok: c.due === 0 },
      { t: `${limit} yeni kelime öğren (${Math.min(S.day.n, limit)}/${limit})`, ok: S.day.n >= limit || nextNewId() === null },
      { t: `Pratikte 15 soru çöz (${Math.min(e.x || 0, 15)}/15)`, ok: (e.x || 0) >= 15 },
    ],
    week: [
      { t: `Haftada 5 gün çalış (${w.days}/5)`, ok: w.days >= 5 },
      { t: `Bir dil bilgisi dersini 6/8 ile geç (${w.les}/1)`, ok: w.les >= 1 },
      { t: `Haftada ${S.set.daily * 5} yeni kelime (${w.n}/${S.set.daily * 5})`, ok: w.n >= S.set.daily * 5 },
    ], marks: w.marks
  };
}
function suggest() {
  ensureDay(); const c = counts(), limit = S.set.daily + S.day.bonus;
  if (c.due > 0) return { why: `${c.due} kelime tekrar bekliyor; önce onları bitirmek hafızayı en çok güçlendirir.`, go: () => { location.hash = "#calis"; } };
  if (S.day.n < limit && nextNewId() !== null) return { why: "Bugünkü yeni kelimelerin tamamlanmadı.", go: () => { location.hash = "#calis"; } };
  for (let k = 0; k < LESSONS.length; k++) { const L = LESSONS[k]; if ((S.gr[L.id] || 0) >= 6) continue; let q = null; try { q = L.q(); } catch (e) { q = null; } if (q) return { why: `Sıradaki dil bilgisi konun: “${L.t}”. Öğrendiğin kelimeler bu ders için yeterli.`, go: () => { pv = { mode: "lesson", k }; location.hash = "#pratik"; if (view === "pratik") practice(); } }; break; }
  const mods = [["Cümle pratiği", S.md.sent, () => startQuiz({ mod: "sent", gen: sentQ, need: "birkaç öğrenilmiş isim, sıfat ve fiil", backLabel: "Pratik", back: () => { pv = { mode: "hub" }; practice(); } }), () => sentGen().length > 0],
    ["Fiil çekimi", S.cj, () => { pv = { mode: "conj" }; cq = null; practice(); }, () => verbPool().length >= 3],
    ["Harf dizme", S.sp, () => { pv = { mode: "spell" }; sq = null; practice(); }, () => spellPool().length >= 3],
    ["Üçlü çeviri", S.md.tri, () => startQuiz({ mod: "tri", gen: triQ, need: "4 öğrenilmiş kelime", backLabel: "Pratik", back: () => { pv = { mode: "hub" }; practice(); } }), () => learnedIds().length >= 4],
    ["Ayet ve hadisler", S.md.txt, () => { pv = { mode: "texts" }; practice(); }, () => true]];
  const avail = mods.filter(m => m[3]());
  if (!avail.length) return { why: "Şimdilik en verimlisi kelime çalışmak; pratik bölümleri öğrendikçe açılacak.", go: () => { location.hash = "#calis"; } };
  const score = m => { const o = m[1] || { r: 0, w: 0 }, n = o.r + o.w; return n < 20 ? n / 20 - 1 : o.r / n; };
  avail.sort((a, b) => score(a) - score(b)); const m = avail[0], o = m[1] || { r: 0, w: 0 }, n = o.r + o.w;
  return { why: n < 20 ? `“${m[0]}” bölümünü az çalıştın; biraz pratik iyi gelir.` : `En düşük başarı oranın “${m[0]}” bölümünde (%${Math.round(100 * o.r / n)}).`, go: () => { if (view !== "pratik") { location.hash = "#pratik"; setTimeout(m[2], 0); } else m[2](); } };
}
function planCard(open) {
  const P = planItems(), done = P.day.filter(x => x.ok).length, names = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const li = x => `<li class="${x.ok ? "ok" : ""}">${x.ok ? "✓" : "○"} ${esc(x.t)}</li>`;
  return `<details class="plan"${open ? " open" : ""}><summary><span>Bugünün planı · ${done}/${P.day.length}</span><button class="btn primary sm" id="suggest">Ne çalışayım?</button></summary>
    <ul>${P.day.map(li).join("")}</ul><div class="wk">${P.marks.map((m, i) => `<span class="${m ? "on" : ""}" title="${names[new Date(Date.now() - (6 - i) * 864e5).getDay()]}">${names[new Date(Date.now() - (6 - i) * 864e5).getDay()][0]}</span>`).join("")}</div>
    <b class="wkt">Bu hafta</b><ul>${P.week.map(li).join("")}</ul></details>`;
}
function bindPlan() { const b = $("#suggest"); if (b) b.onclick = e => { e.preventDefault(); e.stopPropagation(); const s = suggest(); toast(s.why); s.go(); }; }

// ---------- Google Play Billing (yalnızca Play Store sürümünde, Digital Goods API ile) ----------
const PLAY = "https://play.google.com/billing";
const TIP_SKUS = ["kahve_30", "destek_100", "destek_250"];
const TIP_LABEL = { kahve_30: "Geliştiriciye bir kahve ısmarla", destek_100: "Projeye destek ol", destek_250: "Cömert destekçi ol" };
let gate = null;
let dgs = null, tipItems = [];
const fmtPrice = pr => { try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: pr.currency, maximumFractionDigits: 2 }).format(+pr.value); } catch (e) { return pr.value + " " + pr.currency; } };
async function initBilling() {
  try {
    if (!("getDigitalGoodsService" in window) || !window.PaymentRequest) return;
    dgs = await window.getDigitalGoodsService(PLAY);
    if (!dgs) return;
    const det = await dgs.getDetails(TIP_SKUS);
    tipItems = TIP_SKUS.map(id => det.find(d => d.itemId === id)).filter(Boolean);
    // yarım kalmış satın almaları tamamla (tüketilebilir ürünler)
    try { for (const pu of await dgs.listPurchases()) { if (TIP_SKUS.includes(pu.itemId)) { try { await dgs.consume(pu.purchaseToken); } catch (e) {} } } } catch (e) {}
    if (view === "ayarlar") render();
  } catch (e) { dgs = null; tipItems = []; }
}
async function buyTip(sku) {
  if (!dgs) return;
  try {
    const req = new PaymentRequest([{ supportedMethods: PLAY, data: { sku } }], { total: { label: "Destek", amount: { currency: "TRY", value: "0" } } });
    const resp = await req.show();
    const token = resp.details && resp.details.purchaseToken;
    if (token) { try { await dgs.consume(token); } catch (e) {} }
    await resp.complete("success");
    S.tips = (S.tips || 0) + 1; save();
    toast("Desteğin için çok teşekkürler! 🌙");
    if (view === "ayarlar") render();
  } catch (e) {
    if (e && e.name === "AbortError") return;
    toast("Ödeme tamamlanamadı. Tekrar deneyebilirsin.");
  }
}

// ================= ELİFBÂ (ALFABE), KONUŞMA PRATİĞİ, XP VE ROZETLER =================
// [harf, ad, Arapça adı, ses, Türkçe okunuş ünsüzü, kalın mı, örnek kelime, okunuş, anlam, sonrakine bitişir mi]
const LETTERS = [
 ["ا","Elif","ألف","a / e; uzatma harfi","’",0,"أَسَد","esed","aslan",0],["ب","Be","باء","b","b",0,"بَاب","bâb","kapı",1],
 ["ت","Te","تاء","t","t",0,"تُفَّاح","tuffâh","elma",1],["ث","Se","ثاء","peltek s (İngilizce “think”)","s",0,"ثَعْلَب","sa‘leb","tilki",1],
 ["ج","Cim","جيم","c","c",0,"جَمَل","cemel","deve",1],["ح","Ha","حاء","boğazdan nefesli h","h",1,"حَلِيب","halîb","süt",1],
 ["خ","Hı","خاء","gırtlaktan hırıltılı h","h",1,"خُبْز","hubz","ekmek",1],["د","Dal","دال","d","d",0,"دَار","dâr","ev, yurt",0],
 ["ذ","Zel","ذال","peltek z (İngilizce “this”)","z",0,"ذَهَب","zeheb","altın",0],["ر","Ra","راء","r","r",1,"رَجُل","racul","adam",0],
 ["ز","Ze","زاي","z","z",0,"زَيْت","zeyt","yağ",0],["س","Sin","سين","s","s",0,"سَمَك","semek","balık",1],
 ["ش","Şın","شين","ş","ş",0,"شَمْس","şems","güneş",1],["ص","Sad","صاد","kalın s","s",1,"صَبَاح","sabâh","sabah",1],
 ["ض","Dad","ضاد","kalın d","d",1,"ضَوْء","dav’","ışık",1],["ط","Tı","طاء","kalın t","t",1,"طَائِر","tâir","kuş",1],
 ["ظ","Zı","ظاء","kalın peltek z","z",1,"ظِلّ","zıll","gölge",1],["ع","Ayn","عين","gırtlak sıkıştırılarak çıkan ses","‘",1,"عَيْن","ayn","göz",1],
 ["غ","Ğayn","غين","gırtlaktan ğ","ğ",1,"غَيْم","ğaym","bulut",1],["ف","Fe","فاء","f","f",0,"فِيل","fîl","fil",1],
 ["ق","Kaf","قاف","kalın, gırtlaktan k","k",1,"قَلَم","kalem","kalem",1],["ك","Kef","كاف","ince k","k",0,"كِتَاب","kitâb","kitap",1],
 ["ل","Lam","لام","l","l",0,"لَيْل","leyl","gece",1],["م","Mim","ميم","m","m",0,"مَاء","mâ’","su",1],
 ["ن","Nun","نون","n","n",0,"نَار","nâr","ateş",1],["ه","He","هاء","yumuşak h","h",0,"هِلَال","hilâl","hilal",1],
 ["و","Vav","واو","v; uzun u","v",0,"وَرْدَة","verde","gül",0],["ي","Ye","ياء","y; uzun i","y",0,"يَد","yed","el",1]];
const TATW = "\u0640";
const lForms = L => L[9] ? [L[0], L[0] + TATW, TATW + L[0] + TATW, TATW + L[0]] : [L[0], L[0], TATW + L[0], TATW + L[0]];
const HAREKE = [["َ", "üstün (fetha)", "e / a"], ["ِ", "esre (kesra)", "i / ı"], ["ُ", "ötre (damme)", "u"]];
function syl(L, h, long) { // hece ve Türkçe okunuşu
  const c = L[0] === "ا" ? (h === 1 ? "إ" : "أ") : L[0], v = h === 0 ? (L[5] ? "a" : "e") : h === 1 ? (L[5] ? "ı" : "i") : "u";
  const cons = L[4] === "’" ? "" : L[4];
  if (!long) return [c + HAREKE[h][0], cons + v];
  if (L[0] === "ا") return [["آ", "إِي", "أُو"][h], ["â", "î", "û"][h]];
  const lv = h === 0 ? "ا" : h === 1 ? "ي" : "و", lr = h === 0 ? "â" : h === 1 ? "î" : "û";
  return [c + HAREKE[h][0] + lv, cons + lr];
}
const ALF_EX = ["tani", "ses", "hece", "kelime"];
const ALF_NAME = { tani: "Harfi tanı", ses: "Sesten harfe", hece: "Hece oku", kelime: "Kelime oku" };
function alfQ(kind) {
  const L = pick1(LETTERS), others = shuffle(LETTERS.filter(x => x !== L));
  if (kind === "tani") { const f = pick1(lForms(L)); const seen = new Set([L[1]]); const wr = others.filter(x => !seen.has(x[1]) && seen.add(x[1])).slice(0, 3);
    return { badge: "Bu hangi harf?", prompt: `<div class="big ar" lang="ar">${f}</div><div class="tl">harfin ${["tek başına", "başta", "ortada", "sonda"][lForms(L).indexOf(f)]} yazılışı</div>`, sayFirst: L[2], opts: shuffle([L, ...wr].map(x => ({ h: x[1], ok: x === L }))), fb: `${arS(L[0])} ${L[1]}: ${esc(L[3])}`, say: L[2] }; }
  if (kind === "ses") { const seen = new Set([L[4] + L[5]]); const wr = others.filter(x => !seen.has(x[4] + x[5]) && seen.add(x[4] + x[5])).slice(0, 3);
    return { badge: "Bu sesi hangi harf verir?", prompt: `<div class="trbig">${L[1]}</div><div class="tl">${esc(L[3])}</div>`, opts: shuffle([L, ...wr].map(x => ({ h: arS(x[0]), ok: x === L }))), fb: `${arS(L[0])} ${L[1]}: ${esc(L[3])}`, say: L[2] }; }
  if (kind === "hece") { const h = Math.floor(Math.random() * 3), long = Math.random() < .35, [s, r] = syl(L, h, long);
    const pool = []; for (const x of LETTERS) for (let hh = 0; hh < 3; hh++) { const [s2, r2] = syl(x, hh, long); if (r2 !== r) pool.push({ k: r2, h: r2 }); }
    return { badge: long ? "Uzun hece oku" : "Hece oku", prompt: `<div class="big ar" lang="ar">${s}</div>`, sayFirst: s, opts: opts4({ k: r, h: r }, shuffle(pool)), fb: `${arS(s)} = ${r}`, say: s }; }
  const ws = []; for (let i = 0; i < 710; i++) { const b = bare(W[i][0]); if (!MAT.has(i) && !/\s/.test(W[i][0]) && b.length >= 2 && b.length <= 4 && W[i][1]) ws.push(i); }
  const i = pick1(ws); const wr = shuffle(ws).filter(j => W[j][1] !== W[i][1]).slice(0, 6).map(j => ({ k: W[j][1], h: W[j][1] }));
  return { badge: "Nasıl okunur?", prompt: `<div class="big ar" lang="ar">${W[i][0]}</div>`, sayFirst: W[i][0], opts: opts4({ k: W[i][1], h: W[i][1] }, wr), fb: `${arS(W[i][0])} = ${esc(W[i][1])} (${esc(W[i][2])})`, say: W[i][0] };
}
let alfSel = null;
function alfPage() {
  const L = alfSel !== null ? LETTERS[alfSel] : null, al = S.alf || {};
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><h2>Elifbâ: Arap harfleri</h2>
  <p class="sub">Arapça sağdan sola yazılır. Harflerin çoğu kelimenin başında, ortasında ve sonunda farklı görünür. Bir harfe dokun, yazılışlarını ve sesini gör.</p>
  <div class="agrid">${LETTERS.map((x, k) => `<button class="lt${alfSel === k ? " sel" : ""}" data-a="${k}" aria-label="${x[1]}"><span class="ar" lang="ar">${x[0]}</span><small>${x[1]}</small></button>`).join("")}</div>
  ${L ? `<div class="statsbox adet"><div class="sh"><b>${L[1]} <span class="ar" lang="ar" style="font-size:1.4rem">${L[0]}</span></b><span>${esc(L[3])}</span></div>
    <div class="forms">${lForms(L).map((f, k) => `<div><span class="ar" lang="ar">${f}</span><small>${["Tek", "Başta", "Ortada", "Sonda"][k]}</small></div>`).join("")}</div>
    ${L[9] ? "" : `<p class="note mut">Bu harf kendinden sonraki harfe bitişmez.</p>`}
    <p class="note">Örnek: ${arS(L[6], 1)} ${esc(L[7])}, ${esc(L[8])}</p>
    <div class="row">${listenBtn(L[2], "Harfin adı")}${listenBtn(L[6], "Örneği dinle")}</div></div>` : ""}
  <div class="lesson"><p><b>Harekeler</b> kısa sesli harfleri gösterir:</p>
    <div class="ctab"><table><tbody>${HAREKE.map(([m, n, r], h) => `<tr><td>${arS("بـ".replace("ـ", "") + m, 1)}</td><td>${n}</td><td>${["be", "bi", "bu"][h]} (${r})</td></tr>`).join("")}
    <tr><td>${arS("بْ", 1)}</td><td>cezm (sükûn)</td><td>sessiz: “b”</td></tr><tr><td>${arS("بّ", 1)}</td><td>şedde</td><td>harf iki kez: “bb”</td></tr>
    <tr><td>${arS("بٌ بٍ بً", 1)}</td><td>tenvin</td><td>-un, -in, -en</td></tr><tr><td>${arS("بَا بِي بُو", 1)}</td><td>uzatma</td><td>bâ, bî, bû</td></tr></tbody></table></div>
    <p class="mut">Kalın harflerde (ح خ ر ص ض ط ظ ع غ ق) üstün “a”, esre “ı” gibi okunur: ${arS("قَ")} ka, ${arS("صِ")} sı.</p></div>
  <h3 class="sec">Alıştırmalar</h3>
  <div class="list">${ALF_EX.map(k => `<button class="vrow" data-ex="${k}"><div><div class="m">${ALF_NAME[k]}</div><div class="t">${al[k] !== undefined ? "En iyi: " + al[k] + "/8" : "Başlanmadı"}</div></div><span class="ar" lang="ar">${{ tani: "ب", ses: "ش", hece: "بَ", kelime: "كِتَاب" }[k]}</span></button>`).join("")}</div>`;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { alfSel = +b.dataset.a === alfSel ? null : +b.dataset.a; practice(); speak(LETTERS[+b.dataset.a][2]); });
  app.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { const k = b.dataset.ex; startQuiz({ mod: "alf", gen: () => alfQ(k), total: 8, store: "alf", key: k, backLabel: "Elifbâ", back: () => { pv = { mode: "alf" }; practice(); } }); });
}

// --- Konuşma pratiği (günlük diyaloglar) ---
const DLG = DATA("dialogs"); // [başlık, [[arapça, türkçe], ...]]
const ALL_LINES = DLG.flatMap(([, ls]) => ls);
function dlgQ(d) {
  const ls = DLG[d][1], i = Math.floor(Math.random() * (ls.length - 1));
  if (Math.random() < .55) { const ok = ls[i + 1], wr = shuffle(ALL_LINES.filter(l => !ls.includes(l))).slice(0, 3);
    return { badge: "Uygun cevap hangisi?", prompt: `<div class="big ar" lang="ar" style="font-size:2rem">${ls[i][0]}</div><div class="tl">${esc(ls[i][1])}</div>`, sayFirst: ls[i][0], one: true,
      opts: shuffle([ok, ...wr].map(l => ({ h: `${arS(l[0])}<br><small class="mut">${esc(l[1])}</small>`, ok: l === ok }))), fb: `${arS(ok[0])} = ${esc(ok[1])}`, say: ok[0] }; }
  const l = pick1(ls), wr = shuffle(ALL_LINES.filter(x => x[1] !== l[1])).slice(0, 6).map(x => ({ k: x[1], h: esc(x[1]) }));
  return { badge: "Anlamı ne?", prompt: `<div class="big ar" lang="ar" style="font-size:2rem">${l[0]}</div>`, sayFirst: l[0], one: true, opts: opts4({ k: l[1], h: esc(l[1]) }, wr), fb: `${arS(l[0])} = ${esc(l[1])}`, say: l[0] };
}
function dlgList() {
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><h2>Konuşma pratiği</h2>
  <p class="sub">Günlük hayattan kısa diyaloglar. Her cümleye dokunup dinle, sonra alıştırmayla doğru cevabı seçmeyi öğren.</p>
  <div class="list">${DLG.map(([t, ls], k) => `<button class="vrow" data-d="${k}"><div><div class="m">${esc(t)}</div><div class="t">${ls.length} cümle${S.dl && S.dl[k] !== undefined ? " · en iyi " + S.dl[k] + "/6" : ""}</div></div><span class="ar" lang="ar" style="font-size:1.2rem">${ls[0][0].split(" ").slice(0, 2).join(" ")}</span></button>`).join("")}</div>`;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  app.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { pv = { mode: "dlg", k: +b.dataset.d }; practice(); window.scrollTo(0, 0); });
}
function dlgPage(k) {
  const [t, ls] = DLG[k];
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backD">← Diyaloglar</button></div><h2>${esc(t)}</h2>
  <div class="chat">${ls.map((l, i) => `<button class="bub ${i % 2 ? "b" : "a"}" data-say="${esc(l[0])}"><span class="ar" lang="ar">${l[0]}</span><small>${esc(l[1])}</small></button>`).join("")}</div>
  <p class="note mut" style="margin:8px 2px">Bir cümleye dokununca okunur.</p>
  <div class="row"><button class="btn primary" id="dQ">Alıştırma (6 soru)</button></div>`;
  $("#backD").onclick = () => { pv = { mode: "dlgs" }; practice(); };
  $("#dQ").onclick = () => startQuiz({ mod: "dlg", gen: () => dlgQ(k), total: 6, store: "dl", key: k, backLabel: "Diyalog", back: () => { pv = { mode: "dlg", k }; practice(); } });
}

// --- XP, günlük hedef ve rozetler ---
const XPW = { r: 2, ok: 8, x: 2, xo: 8, n: 5, L: 50 };
const BADGES = [
 ["ilk", "İlk adım", "İlk kelimene başla", () => Object.keys(S.p).length >= 1],
 ["k10", "10 kelime", "10 kelime öğren", () => learnedIds().length >= 10],
 ["k100", "100 kelime", "100 kelime öğren", () => learnedIds().length >= 100],
 ["k500", "500 kelime", "500 kelime öğren", () => learnedIds().length >= 500],
 ["k1000", "1.000 kelime", "1.000 kelime öğren", () => learnedIds().length >= 1000],
 ["k3000", "3.000 kelime", "3.000 kelime öğren", () => learnedIds().length >= 3000],
 ["k6000", "6.000 kelime", "6.000 kelime öğren", () => learnedIds().length >= 6000],
 ["s3", "3 gün seri", "3 gün üst üste çalış", () => streakNow() >= 3],
 ["s7", "1 hafta seri", "7 gün üst üste çalış", () => streakNow() >= 7],
 ["s30", "1 ay seri", "30 gün üst üste çalış", () => streakNow() >= 30],
 ["elif", "Elifbâ", "Alfabe alıştırmalarının hepsini 6/8 ile geç", () => ALF_EX.every(k => ((S.alf || {})[k] || 0) >= 6)],
 ["d1", "İlk ders", "Bir dil bilgisi dersini 6/8 ile geç", () => Object.values(S.gr).some(v => v >= 6)],
 ["gA2", "Dil bilgisi A2", "A1 ve A2 derslerini geç", () => ["A2", "B1", "B2", "C1", "C2"].includes(gramLevel())],
 ["gB2", "Dil bilgisi B2", "B2’ye kadar bütün dersleri geç", () => ["B2", "C1", "C2"].includes(gramLevel())],
 ["gC2", "Dil bilgisi C2", "Bütün dersleri geç", () => gramLevel() === "C2"],
 ["oku", "Okuyucu", "5 ayet veya hadis alıştırması bitir", () => Object.keys(S.tb || {}).length >= 5],
 ["soh", "Sohbet", "Bütün diyalog alıştırmalarını bitir", () => DLG.every((d, i) => (S.dl || {})[i] !== undefined)],
 ["xp1k", "1.000 XP", "Toplam 1.000 XP topla", () => (S.xp || 0) >= 1000],
 ["xp10k", "10.000 XP", "Toplam 10.000 XP topla", () => (S.xp || 0) >= 10000],
 ["destek", "Destekçi", "Uygulamaya destek ol", () => (S.tips || 0) > 0]];
function checkBadges() {
  if (POOLX) return;
  const first = !S.bd; S.bd = S.bd || {}; const won = [];
  for (const [id, t, , c] of BADGES) { if (S.bd[id]) continue; let ok = false; try { ok = c(); } catch (e) {} if (ok) { S.bd[id] = dayStr(); won.push(t); } }
  if (won.length && !first) setTimeout(() => toast("🏅 Yeni rozet: " + won.join(", ")), 400);
  return won.length;
}
const todayXP = () => ((S.log || {})[dayStr()] || {}).xp || 0;
function xpBlock() {
  const g = +S.set.goal || 100, t = todayXP(), earned = Object.keys(S.bd || {}).length;
  return `<div class="statsbox"><div class="sh"><b>⭐ ${fmt(S.xp || 0)} XP</b><span>bugün ${fmt(t)}/${fmt(g)} XP</span></div>
    <div class="meter"><i style="width:${Math.min(100, 100 * t / g)}%"></i></div>
    <div class="sh" style="margin-top:8px"><b>Rozetler</b><span>${earned}/${BADGES.length}</span></div>
    <div class="badges">${BADGES.map(([id, t2, d]) => `<div class="bdg${S.bd && S.bd[id] ? " on" : ""}" title="${esc(d)}"><span>${S.bd && S.bd[id] ? "🏅" : "🔒"}</span><b>${esc(t2)}</b><small>${esc(d)}</small></div>`).join("")}</div></div>`;
}

// ---------- router ----------
let hasGesture = false;
document.addEventListener("pointerdown", () => { hasGesture = true; }, { once: true, capture: true });
document.addEventListener("keydown", () => { hasGesture = true; }, { once: true, capture: true });
const VIEWS = { calis: study, pratik: practice, gelisim: growth, kelimelerim: lists, ayarlar: settings };
function render() { VIEWS[view](); }
function route(keep) {
  clearTimeout(advTimer);
  const h = location.hash.slice(1); view = VIEWS[h] ? h : "calis";
  document.querySelectorAll("nav.tabs a").forEach(a => { if (a.dataset.v === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (view === "calis" && cur && cur.type === "done") cur = null;
  render(); if (!keep) window.scrollTo(0, 0);
}
addEventListener("hashchange", () => route());
route(true);
// Site sürümünde geç yüklenen veri geldiğinde: yalnızca etkilenen sakin ekranları yenile
window.__elifbaLate = (k, v) => { if (k === "conj") { CJ = v; if ((view === "pratik" && !gq && ["hub", "verbs", "lessons"].includes(pv.mode))) render(); } };
try { performance.mark("elifba-ready"); } catch (e) {}
initSync();
initBilling();
