// ---------- Telaffuz dersleri: Türkçe konuşanların karıştırdığı ses çiftleri ----------
// Her derste kısa anlatım, çift kelimeleri dinleme ve "duyduğunu seç" alıştırması (cihazın metin okuma sesiyle).
// Konuşma tanıma yalnızca tarayıcı cihaz içi Arapça tanımayı destekliyorsa görünür (processLocally: ses cihazdan çıkmaz).
const PRON = [
  { id: "h", a: "ح", b: "ه", t: "ح ile ه", tip: "ه Türkçedeki hafif “h”dir. ح ise boğazın ortasından, gırtlak hafifçe daraltılarak çıkan, nefesli ve daha sert bir “h”dir; hırıltı yoktur.", p: [["حَرَم", "هَرَم"], ["سَحَرَ", "سَهَر"]] },
  { id: "ayn", a: "ع", b: "ء", t: "ع ile ء", tip: "ء (hemze) Türkçedeki “saat” kelimesinin ortasındaki kısa kesintidir. ع Türkçede yoktur: gırtlak sıkılarak, boğazdan sesli olarak çıkarılır; “a” sesine boğuk bir renk verir.", p: [["عَمَل", "أَمَل"], ["عَيْن", "أَيْنَ"], ["سَعَلَ", "سَأَلَ"]] },
  { id: "q", a: "ق", b: "ك", t: "ق ile ك", tip: "ك Türkçedeki ince “k”dir (kedi). ق dilin en arkası küçük dile değdirilerek çıkarılan kalın, derin bir “k”dir; arkasındaki ünlü de kalınlaşır.", p: [["قَلْب", "كَلْب"], ["قَلَم", "كَلْم"], ["قَاسٍ", "كَأْس"]] },
  { id: "s", a: "ص", b: "س", t: "ص ile س", tip: "س Türkçedeki “s”dir. ص kalın bir “s”dir: dilin arkası damağa doğru yükselir, ağız dolgun açılır; yanındaki “a” sesi “o”ya yakın duyulur.", p: [["صَيْف", "سَيْف"], ["صُورَة", "سُورَة"], ["صَارَ", "سَارَ"]] },
  { id: "d", a: "ض", b: "د", t: "ض ile د", tip: "د Türkçedeki “d”dir. ض aynı yerde ama dilin arkası yükseltilerek, kalın ve dolgun söylenir.", p: [["ضَرْب", "دَرْب"], ["ضَلَّ", "دَلَّ"]] },
  { id: "t", a: "ط", b: "ت", t: "ط ile ت", tip: "ت Türkçedeki “t”dir. ط kalın bir “t”dir: dil ucu aynı yerde, dilin arkası yükselir; nefes patlaması zayıftır.", p: [["طَابَ", "تَابَ"]] },
  { id: "z", a: "ظ", b: "ذ", t: "ظ ile ذ", tip: "İkisinde de dil ucu üst dişlerin ucuna değer (İngilizce “this”teki ses). ذ ince, ظ ise dilin arkası yükseltilerek kalın söylenir. İkisini de Türkçe “z” gibi okumamaya dikkat et.", p: [["ظِلّ", "ذِلّ"]] },
  { id: "th", a: "ث", b: "س", t: "ث ile س", tip: "ث peltek bir “s”dir: dil ucu üst dişlerin ucuna değer (İngilizce “think”teki ses). س ise dil dişlerin arkasında kalarak çıkan Türkçe “s”dir.", p: [["ثَارَ", "سَارَ"], ["ثَمَن", "سِمَن"]] },
  { id: "kh", a: "خ", b: "ح", t: "خ ile ح", tip: "خ, damağın arkasından hırıltılı çıkan bir “h”dir (Almanca “Bach”). ح boğazın ortasından gelir ve hırıltısızdır.", p: [["خَال", "حَال"]] },
  { id: "uzun", a: "ـَ", b: "ـَا", tt: "Kısa ve uzun ünlü", t: "Kısa ve uzun ünlü", tip: "Arapçada ünlünün uzunluğu anlamı değiştirir. Üstün, esre, ötre kısa okunur; ardından ا، ي، و gelince ünlü yaklaşık iki kat uzatılır: مَطَر matar (yağmur), مَطَار matâr (havalimanı). Türkçede olduğu gibi uzun ünlüyü kısaltma.", p: [["مَطَر", "مَطَار"], ["جَمَل", "جَمَال"], ["قَدَم", "قَدِيم"], ["شَهِدَ", "شَاهَدَ"]] },
  { id: "sedde", a: "ـ", b: "ـّ", tt: "Şedde (çift ünsüz)", t: "Şedde (çift ünsüz)", tip: "Şedde (ـّ) harfin iki kez, yani bastırılarak okunduğunu gösterir; Türkçedeki “anne, elli” gibi. Şedde çoğu zaman anlamı da değiştirir: دَرَسَ derese (ders çalıştı), دَرَّسَ derrese (ders verdi).", p: [["دَرَسَ", "دَرَّسَ"], ["عَلِمَ", "عَلَّمَ"], ["كَسَرَ", "كَسَّرَ"], ["جَمَعَ", "جَمَّعَ"]] },
  { id: "gh", a: "غ", b: "خ", t: "غ ile خ", tip: "İkisi de damağın arkasından çıkar. غ sesli, gargaraya benzeyen bir “ğ”dir; خ ise aynı yerden sessiz ve hırıltılı çıkar.", p: [["غَالٍ", "خَالٍ"]] },
];
const pronTitle = c => c.tt ? esc(c.tt) : `<span dir="ltr"><bdi class="ar" lang="ar">${c.a}</bdi> ile <bdi class="ar" lang="ar">${c.b}</bdi></span>`;
const pronWord = ar => { const i = W.findIndex(w => w[0] === ar); return i >= 0 ? { ar, i, tr: W[i][2], tl: W[i][1] } : { ar, i: -1, tr: "", tl: "" }; };

// --- Cihaz içi konuşma tanıma (yalnızca destekleniyorsa) ---
const SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
let srState = null; // "available" | "downloadable" | "downloading" | "unavailable"
async function srCheck(lang = "ar-SA") {
  if (!SRC || typeof SRC.available !== "function") return (srState = "unavailable");
  try { srState = await SRC.available({ langs: [lang], processLocally: true }); } catch (e) { srState = "unavailable"; }
  return srState;
}
async function srInstall(lang = "ar-SA") { try { const ok = await SRC.install({ langs: [lang], processLocally: true }); srState = ok ? "available" : "unavailable"; } catch (e) { srState = "unavailable"; } return srState; }
function srListen(lang = "ar-SA", ms = 5000) {
  return new Promise((resolve, reject) => {
    const r = new SRC(); r.lang = lang; r.processLocally = true; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    let done = false; const fin = v => { if (!done) { done = true; resolve(v); } };
    r.onresult = e => fin([...e.results[0]].map(a => a.transcript));
    r.onnomatch = () => fin([]); r.onend = () => fin([]);
    r.onerror = e => { if (!done) { done = true; reject(e.error || "error"); } };
    r.start(); setTimeout(() => { try { r.stop(); } catch (x) {} }, ms);
  });
}
const normAr = s => (s || "").replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^ء-ي ]/g, "").replace(/\s+/g, " ").trim();
// Söylenen kelimeyi kontrol et: hedef tanınan seçenekler arasında mı, yoksa çiftin öteki kelimesi mi anlaşıldı?
function pronJudge(target, other, alts) {
  const t = normAr(target), o = other ? normAr(other) : null, n = alts.map(normAr);
  if (n.includes(t)) return { ok: true, heard: alts[n.indexOf(t)] };
  if (o && n.includes(o)) return { ok: false, confused: true, heard: alts[n.indexOf(o)] };
  return { ok: false, heard: alts[0] || "" };
}

function pronList() {
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button></div><h2>Telaffuz</h2>
  <p class="sub">Türkçede olmayan ya da Türkçedeki bir sese benzeyen Arap harfleri. Her derste farkı anlatan kısa bir açıklama, çift kelimeleri dinleme ve “duyduğunu seç” alıştırması var.</p>
  <div class="list">${PRON.map((c, k) => `<button class="vrow" data-pk="${k}"><div><div class="m">${pronTitle(c)}</div><div class="t">${c.p.length} kelime çifti${S.pr && S.pr[c.id] !== undefined ? " · en iyi " + S.pr[c.id] + "/8" : ""}</div></div><span class="ar" lang="ar" style="font-size:1.6rem">${c.a} · ${c.b}</span></button>`).join("")}</div>`;
  $("#backHub").onclick = () => { pv = { mode: "hub" }; practice(); };
  app.querySelectorAll("[data-pk]").forEach(b => b.onclick = () => { pv = { mode: "pronx", k: +b.dataset.pk }; practice(); window.scrollTo(0, 0); });
}
function pronPage(k) {
  const c = PRON[k];
  const pairs = c.p.map(([x, y]) => [pronWord(x), pronWord(y)]);
  const cell = (w, o) => `<div class="pw"><button class="cf" data-say="${esc(w.ar)}"><span class="ar" lang="ar">${w.ar}</span></button><small>${esc(w.tl)}${w.tr ? " · " + esc(w.tr) : ""}</small>${srState === "available" ? `<button class="btn sm" data-sr="${esc(w.ar)}" data-other="${esc(o.ar)}">🎤 Söyle</button>` : ""}</div>`;
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backP">← Telaffuz</button></div>
  <section class="tile card" style="min-height:0;padding:16px"><div class="big ar" lang="ar">${c.a} · ${c.b}</div><div class="mean">${pronTitle(c)}</div></section>
  <p class="lesson-tip" dir="ltr">${esc(c.tip).replace(/[؀-ۿ]/g, m => `<bdi class="ar" lang="ar">${m}</bdi>`)}</p>
  <div class="pairs">${pairs.map(([x, y]) => `<div class="pair">${cell(x, y)}<span class="vs">↔</span>${cell(y, x)}</div>`).join("")}</div>
  <p class="note mut">Kelimeye dokununca dinlersin. Ses telefonunun metin okuma motorundan gelir; farkı duymakta zorlanırsan Ayarlar’dan hızı “Yavaş” yap.</p>
  <div id="srBox">${srState === "downloadable" ? `<p class="note">Bu cihaz Arapça konuşmayı internete göndermeden, cihazın içinde tanıyabilir. Dil paketini bir kez indirmen gerekir.</p><button class="btn" id="srIns">Arapça konuşma tanımayı indir</button>` : srState === "available" ? `<p class="note">🎤 düğmesiyle kelimeyi söyle; telefonun nasıl anladığını gösteririm. Tanıma cihazın içinde yapılır, ses hiçbir yere gönderilmez. Harekeleri ayırt edemez; yalnızca harfleri doğru seçip seçmediğini gösterir.</p>` : ""}<p id="srOut" class="note" aria-live="polite"></p></div>
  <div class="row"><button class="btn primary" id="prQ">Duyduğunu seç (8 soru)</button></div>`;
  $("#backP").onclick = () => { pv = { mode: "pron" }; practice(); };
  const ins = $("#srIns"); if (ins) ins.onclick = async () => { ins.disabled = true; ins.textContent = "İndiriliyor…"; await srInstall(); practice(); };
  app.querySelectorAll("[data-sr]").forEach(b => b.onclick = async () => {
    const out = $("#srOut"); b.disabled = true; out.textContent = "Dinliyorum… kelimeyi söyle.";
    try {
      const r = pronJudge(b.dataset.sr, b.dataset.other, await srListen());
      out.innerHTML = r.ok ? `✓ Doğru anlaşıldı: <span class="ar" lang="ar">${esc(r.heard)}</span>` : r.confused ? `✗ <span class="ar" lang="ar">${esc(r.heard)}</span> olarak anlaşıldı: çiftin öteki kelimesi. Açıklamayı okuyup tekrar dene.` : r.heard ? `Şöyle anlaşıldı: <span class="ar" lang="ar">${esc(r.heard)}</span>. Tekrar dene.` : "Anlaşılamadı; biraz daha yüksek sesle tekrar dene.";
      if (r.ok) logDay("v", 1);
    } catch (e) { out.textContent = e === "not-allowed" ? "Mikrofon izni verilmedi." : "Konuşma tanınamadı; tekrar dene."; }
    b.disabled = false;
  });
  $("#prQ").onclick = () => {
    const all = pairs.flatMap(([x, y]) => [[x, y], [y, x]]);
    const gen = () => { const [t, o] = all[Math.floor(Math.random() * all.length)];
      const lab = w => `<span class="ar" lang="ar">${w.ar}</span> <small>${esc(w.tr)}</small>`;
      return { badge: "Duyduğunu seç", prompt: `<p class="mut">Dinle: hangi kelime söylendi?</p>${listenBtn(t.ar, "Tekrar dinle")}`, sayFirst: t.ar, one: true,
        opts: shuffle([{ h: lab(t), ok: true }, { h: lab(o), ok: false }]), fb: `${arS(t.ar)} = ${esc(t.tr)} · ${pronTitle(c)}`, say: t.ar }; };
    startQuiz({ mod: "pron", gen, total: 8, store: "pr", key: c.id, backLabel: c.t, back: () => { pv = { mode: "pronx", k }; practice(); } });
  };
}
// Sözlükte sesle arama: cihaz içi tanıma hazırsa arama kutusunun yanında mikrofon düğmesi
async function dictVoice() {
  const q = $("#dq"); if (!q) return;
  try { const alts = await srListen(); if (alts[0]) { q.value = alts[0]; q.dispatchEvent(new Event("input")); } else toast("Anlaşılamadı; tekrar dene."); }
  catch (e) { toast(e === "not-allowed" ? "Mikrofon izni verilmedi." : "Konuşma tanınamadı."); }
}
srCheck().then(() => { if (srState !== "unavailable" && typeof view !== "undefined" && (view === "pratik" || view === "kelimelerim")) render(); });
