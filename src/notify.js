// ================= HATIRLATMALAR (kişiye özel, sunucusuz) =================
// Hiçbir veri cihazdan çıkmaz. Uygulama, kullanıcının çalışma alışkanlığından önümüzdeki 14 günün
// bildirim planını hesaplar ve iletir:
//  - Android (Play/TWA): yerel uygulamaya postMessage kanalıyla → AlarmManager ile tam zamanında.
//  - Yüklü PWA: service worker'a (IndexedDB) → periyodik arka plan eşitlemesiyle, en iyi çabayla.
// Kullanıcı çalışınca plan yeniden hesaplanır; bugün çalıştıysa bugüne hatırlatma düşmez.

const HAB_GAP = 30;            // dk: bu kadar ara verilince yeni oturum sayılır
const HAB_KEEP = 90;           // son 90 oturum
const PLAN_DAYS = 14;
const SLOT = 30;               // dk: alışkanlık histogramı aralığı
const DEF_REM = 18 * 60 + 30;  // yeterli veri yokken: 18.30 (okul/iş sonrası)

const remSet = () => Object.assign({ rem: "auto", remT: "19:00", qS: "21:00", qE: "08:00", remStreak: true }, S.set);
const hm = t => { const [h, m] = String(t).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const hhmm = m => String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0") + ":" + String(((m % 60) + 60) % 60).padStart(2, "0");
const minOfDay = d => d.getHours() * 60 + d.getMinutes();
const dayOff = (a, b) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);

// Her etkinlikte çağrılır (logDay): yeni oturumun başlangıç saatini kaydeder
function habitPing(now = new Date()) {
  const H = S.hab = S.hab || { s: [], n: [] };
  const t = Math.floor(now.getTime() / 60000);
  if (H.last && t - H.last < HAB_GAP) { H.last = t; return; }
  H.last = t;
  H.s.push([t, minOfDay(now), now.getDay()]);
  if (H.s.length > HAB_KEEP) H.s.splice(0, H.s.length - HAB_KEEP);
  // son gönderilen hatırlatmadan sonraki 3 saat içinde geldiyse: hatırlatma işe yaradı
  const last = H.n[H.n.length - 1];
  if (last && last.o == null && t >= last.t && t - last.t <= 180) last.o = 1;
  schedulePlan();
}

// Alışkanlık saati: son oturumların başlangıç saatlerinden, yakın tarihlilere daha çok ağırlık vererek.
// Hafta içi / hafta sonu yeterli veri varsa ayrı hesaplanır. Dönen: gün içindeki dakika ya da null.
function habitTime(weekend, now = new Date()) {
  const H = S.hab || { s: [] }, t0 = Math.floor(now.getTime() / 60000);
  let ss = H.s;
  const same = ss.filter(s => (s[2] === 0 || s[2] === 6) === weekend);
  if (same.length >= 6) ss = same;
  if (ss.length < 3) return null;
  const n = 1440 / SLOT, hist = new Array(n).fill(0);
  for (const [t, m] of ss) {
    const w = Math.pow(0.95, (t0 - t) / 1440); // günlük %5 sönümleme
    const k = Math.floor(m / SLOT);
    hist[k] += w; hist[(k + 1) % n] += w * 0.5; hist[(k + n - 1) % n] += w * 0.5;
  }
  let best = 0; for (let k = 1; k < n; k++) if (hist[k] > hist[best]) best = k;
  // en yoğun dilimdeki gerçek başlangıçların ortalaması
  const inSlot = ss.filter(([, m]) => Math.abs(Math.floor(m / SLOT) - best) <= 1).map(s => s[1]);
  return Math.round(inSlot.reduce((a, b) => a + b, 0) / inSlot.length);
}

// Sessiz saatlerin dışına taşı (çocuklar için gece bildirim yok)
function clampQuiet(m, st = remSet()) {
  const qs = hm(st.qS), qe = hm(st.qE);
  const inQ = qs > qe ? (m >= qs || m < qe) : (m >= qs && m < qe);
  if (!inQ) return m;
  // sessiz saate düştüyse: akşamsa sessiz başlangıcından 30 dk önceye, sabahsa bitişine
  return m >= qe && m < 12 * 60 + qe ? qe : qs - 30;
}

// Tepkiye göre uyum: son 3 hatırlatma boşa gittiyse sıklığı düşür ve saati kaydır
function ignoredStreak() {
  const n = (S.hab && S.hab.n) || []; let c = 0;
  for (let i = n.length - 1; i >= 0 && n[i].o == null && n[i].shown; i--) c++;
  return c;
}

// Hangi günler hatırlatılacak (bugün = 0). Ara uzadıkça aralık büyür: 1–3 gün ara → her gün,
// 4–7 → iki günde bir, 8–14 → üç günde bir, 15–30 → haftada bir, 30 günden sonra hiç.
// Son 3 hatırlatma işe yaramadıysa aralık iki katına çıkar. lastOff: son gösterilen hatırlatmanın gün farkı (≤ 0).
function remindDays(gapNow, ign, lastOff = -Infinity) {
  const step = g => (g <= 3 ? 1 : g <= 7 ? 2 : g <= 14 ? 3 : 7) * (ign >= 3 ? 2 : 1);
  const out = [];
  for (let d = 0; d < PLAN_DAYS; d++) {
    const g = gapNow + d;
    if (g > 30) break;
    if (d - lastOff >= step(g)) { out.push(d); lastOff = d; }
  }
  return out;
}

// Mesajlar: o anki duruma göre seçilir, son kullanılanlar tekrar edilmez
function remMessage(at, gap, ctx) {
  const name = "{{APP_NAME}}";
  const due = ctx.dueAt(at), st = ctx.streak, w = ctx.word, left = ctx.toLevel;
  const C = [];
  if (gap === 1 && st >= 3 && ctx.streakRisk) C.push(["seri", `🔥 ${st} günlük serin devam etsin`, `Bugün birkaç dakika yeter. ${due ? fmt(due) + " kelime tekrarını bekliyor." : "Yeni kelimeler hazır."}`]);
  if (due >= 5) C.push(["tekrar", `${fmt(due)} kelime tekrar zamanı`, "Unutmaya başlamadan kısa bir tekrar: birkaç dakika sürer."]);
  if (w) C.push(["kelime", `Bugünün kelimesi: ${w.ar}`, `${w.tr}${w.known ? " · bunu biliyordun, hatırlıyor musun?" : " · birlikte öğrenelim mi?"}`]);
  if (left && left.n <= 60) C.push(["seviye", `${left.lv} seviyesine ${fmt(left.n)} kelime kaldı`, "Az kaldı! Bugünkü kelimelerle yaklaş."]);
  if (ctx.lesson) C.push(["ders", `Yeni ders: ${ctx.lesson}`, "Kısa bir dil bilgisi dersi seni bekliyor."]);
  if (gap >= 4 && gap <= 10) C.push(["ozledik", "Arapçan seni bekliyor", `Kaldığın yerden devam et; ${due ? fmt(due) + " kelimeyi tazelemek" : "birkaç kelime"} yeter.`]);
  if (gap > 10) C.push(["donus", "Yeniden başlamak kolay", "Bugün sadece 5 kelime: geri dönmek için güzel bir gün."]);
  C.push(["genel", `${name} ile 5 dakika`, ctx.goal ? `Günlük hedefin ${ctx.goal} XP. Hadi başlayalım!` : "Hadi birkaç kelime çalışalım!"]);
  const recent = ctx.recent || [];
  const pick = C.find(c => !recent.includes(c[0])) || C[0];
  return { kind: pick[0], title: pick[1], body: pick[2] };
}

function remContext() {
  const st = streakNow(), learned = learnedIds(), k = vocLevel(learned.length), next = LV[k + 1];
  const pool = learned.filter(i => !OFF(i) && !RARE(i));
  const nid = nextNewId();
  const pickWord = d => {
    if (pool.length && d % 2 === 0) { const i = pool[(d * 7919) % pool.length]; return { ar: W[i][0], tr: W[i][2].split(/[,;]/)[0], known: true }; }
    return nid !== null ? { ar: W[nid][0], tr: W[nid][2].split(/[,;]/)[0], known: false } : null;
  };
  const undone = LESSONS.find(L => S.gr[L.id] === undefined);
  const dues = Object.entries(S.p).filter(([k]) => !OFF(k)).map(([, s]) => s[1]);
  return {
    streak: st, goal: +S.set.goal || 100, toLevel: next ? { lv: next[0], n: next[1] - learned.length } : null,
    lesson: undone && learned.length >= (undone.need || 0) ? undone.t : null,
    dueAt: at => { const m = Math.floor(at / 60000); let c = 0; for (const d of dues) if (d <= m) c++; return c; },
    pickWord,
  };
}

// 14 günlük plan: [{at (ms), title, body, kind, tag}]
function buildPlan(now = new Date()) {
  const st = remSet();
  if (st.rem === "off" || !Object.keys(S.p).length) return [];
  const H = S.hab || { s: [], n: [] };
  const lastStudy = S.streak.last ? new Date(S.streak.last + "T12:00") : null;
  const studiedToday = S.streak.last === dayStr(now);
  const gapNow = lastStudy ? dayOff(lastStudy, now) : 0;
  const ign = ignoredStreak();
  const ctx = remContext();
  const recent = (H.n || []).slice(-4).map(n => n.k);
  const plan = [];
  const lastN = (H.n || []).filter(n => n.shown).pop();
  const lastOff = lastN ? -dayOff(new Date(lastN.t * 60000), now) : -Infinity;
  // bugün çalıştıysa bugün hatırlatma yok (yarından itibaren her gün)
  const days = remindDays(gapNow, ign, studiedToday ? 0 : lastOff);
  for (const d of days) {
    if (d === 0 && studiedToday) continue;
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    let m = st.rem === "fixed" ? hm(st.remT) : (habitTime(weekend, now) ?? DEF_REM) - 15;
    if (st.rem !== "fixed" && ign >= 3) { // tutmuyorsa başka saat dene (sessiz saate düşmeyen yönde)
      const s = ign % 2 ? 90 : -90;
      m = clampQuiet(m + s, st) === m + s ? m + s : m - s;
    }
    m = clampQuiet(m, st);
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m).getTime();
    if (at <= now.getTime() + 5 * 60000) continue;
    const gap = gapNow + d;
    ctx.streakRisk = d === 0 && !studiedToday; ctx.streak = d === 0 ? streakNow() : 0;
    ctx.word = ctx.pickWord(Math.floor(at / 864e5)); ctx.recent = recent.concat(plan.map(p => p.kind));
    const msg = remMessage(at, gap, ctx);
    plan.push(Object.assign({ at, tag: "rem-" + dayStr(day) }, msg));
  }
  // Seri tehlikede: bugün çalışılmadıysa ve seri ≥ 3 ise, sessiz saatten önce ikinci bir nazik hatırlatma
  if (st.remStreak && !studiedToday && gapNow === 1 && streakNow() >= 3) {
    const late = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, hm(st.qS) - 45).getTime();
    if (late > now.getTime() + 5 * 60000 && !plan.some(p => Math.abs(p.at - late) < 2 * 3600e3)) {
      plan.push({ at: late, tag: "rem-seri-" + dayStr(now), kind: "seri", title: `🔥 ${streakNow()} günlük seri bugün bitmesin`, body: "Uyumadan önce tek bir tekrar turu yeter." });
    }
  }
  return plan.sort((a, b) => a.at - b.at);
}

// ---- Planın iletilmesi ----
let natPort = null, planTimer = null;
const remSupported = () => !IN_CLAUDE && ("serviceWorker" in navigator || !!natPort);
function schedulePlan() { clearTimeout(planTimer); planTimer = setTimeout(sendPlan, 1500); }
function sendPlan() {
  if (IN_CLAUDE) return;
  const plan = buildPlan();
  S.hab = S.hab || { s: [], n: [] };
  S.hab.pending = Object.fromEntries(plan.map(p => [p.tag, p.kind]));
  const msg = { type: "tilmiz-plan", v: 1, plan: plan.map(p => Object.assign({}, p, { url: "./?n=" + encodeURIComponent(p.tag) + "#calis" })), quiet: [remSet().qS, remSet().qE] };
  if (natPort) { try { natPort.postMessage(JSON.stringify(msg)); } catch (e) {} }
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg);
}
// Android uygulaması (TWA) bağlantıyı başlatır: ilk mesajla bir MessagePort gönderir
window.addEventListener("message", e => {
  if (e.data === "tilmiz-native-hello" && e.ports && e.ports[0]) {
    natPort = e.ports[0];
    natPort.onmessage = m => { // yerel taraf hangi bildirimlerin gösterildiğini bildirir
      try { const d = JSON.parse(m.data); if (d.type === "shown") remShown(d.tag, d.at); } catch (x) {}
    };
    sendPlan();
    if (view === "ayarlar") render();
  }
});
// Service worker gösterdiği bildirimleri bildirir
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.type === "shown") remShown(e.data.tag, e.data.at); });
function remShown(tag, at) {
  const H = S.hab = S.hab || { s: [], n: [] };
  if (H.n.some(n => n.tag === tag)) return;
  const kind = (/^rem-seri/.test(tag) ? "seri" : (H.pending && H.pending[tag]) || "genel");
  H.n.push({ tag, t: Math.floor((at || Date.now()) / 60000), k: kind, shown: 1 });
  if (H.n.length > 30) H.n.splice(0, H.n.length - 30);
  save();
}
// Bildirime dokunarak açıldıysa (?n=etiket): işe yaradı say
(function () {
  try {
    const q = new URLSearchParams(location.search), tag = q.get("n");
    if (!tag) return;
    remShown(tag, Date.now());
    const n = S.hab.n.find(x => x.tag === tag); if (n) n.o = 1;
    save();
    history.replaceState(null, "", location.pathname + location.hash);
  } catch (e) {}
})();

async function askNotif() {
  if (!("Notification" in window)) { toast("Bu tarayıcı bildirimleri desteklemiyor."); return false; }
  let p = Notification.permission;
  if (p === "default") p = await Notification.requestPermission();
  if (p !== "granted") { toast("Bildirim izni verilmedi. Telefon ayarlarından açabilirsin."); return false; }
  try { const r = await navigator.serviceWorker.ready; if (r.periodicSync) await r.periodicSync.register("tilmiz-remind", { minInterval: 6 * 3600e3 }); } catch (e) {}
  sendPlan();
  return true;
}
async function testNotif() {
  if (!(await askNotif())) return;
  const p = buildPlan()[0] || { title: "{{APP_NAME}}", body: "Hatırlatmalar böyle görünecek." };
  try { const r = await navigator.serviceWorker.ready; r.showNotification(p.title, { body: p.body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "deneme", data: { url: "./?n=deneme#calis" } }); }
  catch (e) { try { new Notification(p.title, { body: p.body }); } catch (x) {} }
}

function remCard() {
  if (IN_CLAUDE) return "";
  const st = remSet(), wd = habitTime(false), we = habitTime(true);
  const plan = buildPlan(), next = plan[0];
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  const pill = (k, v, label) => `<button data-k="${k}" data-v="${v}" aria-pressed="${String(st[k]) === String(v)}">${label}</button>`;
  const when2 = t => { const d = new Date(t), dd = dayOff(new Date(), d); return (dd === 0 ? "bugün" : dd === 1 ? "yarın" : d.toLocaleDateString("tr-TR", { weekday: "long" })) + " " + hhmm(minOfDay(d)); };
  return `<div class="set" id="remSet"><h3>Hatırlatmalar</h3>
    <p>Çalışma alışkanlığına göre günde en fazla bir hatırlatma: genelde çalıştığın saatten biraz önce. Çalıştığın günlerde gelmez; ara verirsen seyrekleşir, bir ay sonra durur. Bilgilerin telefondan çıkmaz.</p>
    <div class="pills">${pill("rem", "auto", "Akıllı")}${pill("rem", "fixed", "Sabit saat")}${pill("rem", "off", "Kapalı")}</div>
    ${st.rem === "fixed" ? `<p style="margin:10px 0 4px;color:var(--ink)">Saat</p><input type="time" id="remT" value="${esc(st.remT)}" class="timein">` : ""}
    ${st.rem === "auto" ? `<p class="note">${wd !== null || we !== null ? `Genelde çalıştığın saat: ${wd !== null ? "hafta içi " + hhmm(wd) : ""}${wd !== null && we !== null ? ", " : ""}${we !== null ? "hafta sonu " + hhmm(we) : ""}.` : "Birkaç gün çalıştıktan sonra saatini öğrenirim; o zamana kadar 18.15 civarı."}</p>` : ""}
    ${st.rem !== "off" ? `<p style="margin:10px 0 4px;color:var(--ink)">Sessiz saatler</p><div class="row tight"><input type="time" id="qS" value="${esc(st.qS)}" class="timein" aria-label="Sessiz saat başlangıcı"> – <input type="time" id="qE" value="${esc(st.qE)}" class="timein" aria-label="Sessiz saat bitişi"></div>
    <p style="margin:10px 0 4px;color:var(--ink)">Serim tehlikedeyse akşam bir kez daha hatırlat</p><div class="pills">${pill("remStreak", true, "Evet")}${pill("remStreak", false, "Hayır")}</div>
    ${next ? `<p class="note">Sıradaki: <b>${when2(next.at)}</b> · “${esc(next.title)}”</p>` : `<p class="note">Şu an planlı hatırlatma yok.</p>`}
    ${perm === "granted" ? `<button class="btn" id="remTest">Örnek bildirim göster</button>` : perm === "denied" ? `<p class="note">Bildirim izni kapalı. Telefonun Ayarlar → Uygulamalar → {{APP_NAME}} → Bildirimler bölümünden açabilirsin.</p>` : perm === "unsupported" ? `<p class="note">Bu tarayıcı bildirimleri desteklemiyor.</p>` : `<button class="btn primary" id="remAsk">Bildirimlere izin ver</button>`}` : ""}
  </div>`;
}
function bindRemCard() {
  const b = $("#remAsk"); if (b) b.onclick = async () => { await askNotif(); render(); };
  const t = $("#remTest"); if (t) t.onclick = testNotif;
  for (const id of ["remT", "qS", "qE"]) { const el = $("#" + id); if (el) el.onchange = () => { if (/^\d\d:\d\d$/.test(el.value)) { S.set[id] = el.value; save(); schedulePlan(); render(); } }; }
}
