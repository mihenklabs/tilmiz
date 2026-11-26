// ================= SESLİ PRATİK: SÖYLE, DİNLE, KARŞILAŞTIR =================
// Konuşma tanıma yok (çevrimdışı güvenilir telaffuz notu mümkün değil, bkz. docs/arastirma/degerlendirme.md).
// Kullanıcı örneği dinler, kendi sesini kaydeder, ikisini art arda dinleyip kendisi değerlendirir.
// Kayıt yalnızca bellekte tutulur: hiçbir yere yazılmaz, gönderilmez; sonraki cümlede silinir.
const VOICE_OK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
const VSRC = [["dlg", "Diyalog cümleleri"], ["word", "Öğrendiğin kelimeler"], ["tx", "Ayet ve hadis parçaları"]];
let vp = null; // { src, item, url, rec, stream, peaks, n, good, t0 }

function voiceItems(src) {
  if (src === "word") return learnedIds().filter(id => !OFF(id)).map(id => ({ ar: W[id][0], tr: W[id][2], ro: W[id][1] }));
  if (src === "tx") {
    // her ayet/hadis satırından en fazla 6 kelimelik parçalar
    const out = [];
    TXV.forEach(k => TX[k].v.forEach(([, it]) => {
      for (let i = 0; i < it.length; i += 6) { const p = it.slice(i, i + 6); out.push({ ar: p.map(x => x[0]).join(" "), tr: p.map(x => x[1]).join(" · "), ref: TX[k].t }); }
    }));
    return out;
  }
  return ALL_LINES.map(([ar, tr]) => ({ ar, tr }));
}

function voiceNext() {
  voiceDrop();
  const items = voiceItems(vp.src);
  vp.item = items.length ? pick1(items) : null;
  vp.peaks = null;
  voicePage();
}
function voiceDrop() { // kaydı bellekten sil, mikrofonu kapat
  if (!vp) return;
  if (vp.rec && vp.rec.state === "recording") try { vp.rec.stop(); } catch (e) {}
  if (vp.stream) vp.stream.getTracks().forEach(t => t.stop());
  if (vp.url) URL.revokeObjectURL(vp.url);
  vp.url = null; vp.rec = null; vp.stream = null; vp.peaks = null;
}

async function voiceRecord() {
  if (vp.rec && vp.rec.state === "recording") { vp.rec.stop(); return; }
  voiceDrop();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { toast(e && e.name === "NotAllowedError" ? "Mikrofon izni verilmedi. Telefon ayarlarından izin verebilirsin." : "Mikrofon açılamadı."); return; }
  vp.stream = stream;
  const chunks = [], rec = new MediaRecorder(stream);
  vp.rec = rec; vp.t0 = Date.now();
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop()); vp.stream = null;
    clearInterval(vp.tick);
    const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
    vp.url = URL.createObjectURL(blob);
    vp.peaks = await voicePeaks(blob).catch(() => null);
    voicePage();
    voicePlay(); // kaydı hemen bir kez dinlet
  };
  rec.start();
  voiceMeter(stream);
  vp.tick = setInterval(() => { if (Date.now() - vp.t0 > 10000 && rec.state === "recording") rec.stop(); }, 250); // en fazla 10 sn
  voicePage();
}

// Kayıt sırasında ses düzeyi göstergesi
function voiceMeter(stream) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser();
    ac.createMediaStreamSource(stream).connect(an); an.fftSize = 512;
    const buf = new Uint8Array(an.fftSize);
    const loop = () => {
      const el = document.getElementById("vlev");
      if (!el || !vp || !vp.rec || vp.rec.state !== "recording") { ac.close(); return; }
      an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128));
      el.style.width = Math.min(100, m / 1.0) + "%";
      requestAnimationFrame(loop);
    };
    loop();
  } catch (e) {}
}

// Kaydın dalga biçimi (karşılaştırma için görsel ipucu: hece sayısı, uzunluk, vurgu)
async function voicePeaks(blob) {
  const AC = window.OfflineAudioContext || window.AudioContext;
  if (!AC) return null;
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const audio = await ac.decodeAudioData(await blob.arrayBuffer());
  ac.close();
  const d = audio.getChannelData(0), n = 120, step = Math.floor(d.length / n) || 1, out = [];
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < (i + 1) * step && j < d.length; j++) m = Math.max(m, Math.abs(d[j])); out.push(m); }
  const mx = Math.max(0.01, ...out);
  return { p: out.map(v => v / mx), sec: audio.duration };
}
function voiceWave(pk) {
  if (!pk) return "";
  const w = 240, h = 48, bw = w / pk.p.length;
  return `<svg class="vwave" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Kaydının dalga biçimi">${pk.p.map((v, i) => { const bh = Math.max(1.5, v * (h - 4)); return `<rect x="${(i * bw).toFixed(1)}" y="${((h - bh) / 2).toFixed(1)}" width="${Math.max(1, bw - 0.6).toFixed(1)}" height="${bh.toFixed(1)}" rx="0.8"/>`; }).join("")}</svg><div class="tl">${pk.sec.toFixed(1)} sn</div>`;
}

function voicePlay() { if (!vp.url) return; const a = new Audio(vp.url); a.play().catch(() => {}); return a; }
// Önce örnek, sonra kendi sesin
function voiceBoth() {
  speak(vp.item.ar);
  const t0 = Date.now(), started = () => "speechSynthesis" in window && speechSynthesis.speaking;
  const wait = () => {
    const el = Date.now() - t0;
    if ((el > 400 && !started()) || el > 8000) { setTimeout(voicePlay, 250); return; }
    setTimeout(wait, 150);
  };
  setTimeout(wait, 300);
}

function voiceRate(good) {
  vp.n++; if (good) vp.good++;
  ensureDay(); markStudy(); logDay("v", 1); save();
  voiceNext();
}

function voicePage() {
  const it = vp.item, recOn = vp.rec && vp.rec.state === "recording";
  const empty = vp.src === "word" ? "Önce birkaç kelime öğren; burada öğrendiğin kelimeleri söyleyeceksin." : "Bu bölümde cümle yok.";
  app.innerHTML = `<div class="top"><button class="linkbtn" id="backHub">← Pratik</button><div class="streak">${vp.n ? `${vp.good}/${vp.n} benzer` : ""}</div></div>
  <h2>Sesli pratik</h2>
  <p class="sub">Örneği dinle, sonra kendin söyle ve kaydını örnekle karşılaştır. Kayıt yalnızca bu ekranda, telefonunun belleğinde durur; hiçbir yere kaydedilmez ya da gönderilmez.</p>
  <div class="pills small">${VSRC.map(([v, l]) => `<button data-vs="${v}" aria-pressed="${vp.src === v}">${l}</button>`).join("")}</div>
  ${it ? `<section class="tile card vcard">
    <div class="big ar" lang="ar" style="font-size:clamp(1.6rem,7vw,2.4rem)">${it.ar}</div>
    ${it.ro ? `<div class="tl">${esc(it.ro)}</div>` : ""}<div class="tl">${esc(it.tr)}</div>${it.ref ? `<div class="tl mut">${esc(it.ref)}</div>` : ""}
    <div class="vbtns">
      <button class="btn" id="vEx">🔊 Örneği dinle</button>
      <button class="btn ${recOn ? "rec" : "primary"}" id="vRec" aria-pressed="${!!recOn}">${recOn ? "■ Durdur" : vp.url ? "🎙 Yeniden kaydet" : "🎙 Söyle ve kaydet"}</button>
    </div>
    ${recOn ? `<div class="vmeter"><i id="vlev"></i></div><p class="note mut">Konuş, bitince Durdur'a bas (en fazla 10 sn).</p>` : ""}
    ${vp.url ? `<div class="vres">${voiceWave(vp.peaks)}
      <div class="vbtns"><button class="btn" id="vMe">▶ Kendi sesim</button><button class="btn" id="vBoth">🔁 Örnek, sonra ben</button></div>
      <p class="note mut">Uzunluk, hece sayısı ve vurgu benziyor mu? Harfler aynı yerden mi çıkıyor (ح, ع, ق gibi)? Kendin karar ver.</p>
      <div class="vbtns"><button class="btn primary" id="vGood">✓ Benzer söyledim</button><button class="btn" id="vAgain">↻ Sonrakine geç</button></div></div>` : ""}
  </section>` : `<p class="note">${empty}</p>`}`;
  $("#backHub").onclick = () => { voiceDrop(); vp = null; pv = { mode: "hub" }; practice(); };
  app.querySelectorAll("[data-vs]").forEach(b => b.onclick = () => { vp.src = b.dataset.vs; S.set.vsrc = vp.src; save(); voiceNext(); });
  if (!it) return;
  $("#vEx").onclick = () => speak(it.ar);
  $("#vRec").onclick = voiceRecord;
  if (vp.url) {
    $("#vMe").onclick = voicePlay;
    $("#vBoth").onclick = voiceBoth;
    $("#vGood").onclick = () => voiceRate(true);
    $("#vAgain").onclick = () => voiceRate(false);
  }
}
function voiceStart() {
  vp = { src: S.set.vsrc || "dlg", n: 0, good: 0 };
  pv = { mode: "voice" };
  voiceNext();
  window.scrollTo(0, 0);
}
// Başka sekmeye geçilince kaydı sil, mikrofonu kapat
window.addEventListener("hashchange", () => { if (vp && !/pratik/.test(location.hash)) { voiceDrop(); vp = null; if (pv.mode === "voice") pv = { mode: "hub" }; } });
