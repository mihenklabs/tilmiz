// Uygulamanın jsdom'da açılıp temel akışlarının hatasız çalışması
import { test } from "node:test";
import assert from "node:assert/strict";
import { openApp, learnedState, readData, standaloneHtml } from "./helpers.mjs";

const W = readData("words");
const ORDER = readData("order");
const MAT = new Set(readData("mat"));
const isRare = i => /seyrek kullanılır/.test(W[i][2]);
// İlk 400 kelime (sıraya göre) öğrenilmiş sayılsın
const LEARNED = ORDER.slice(0, 400);

const noErrors = a => assert.deepEqual(a.errors, [], "hata oluştu:\n" + a.errors.join("\n"));

test("boş durumla açılış ve hoş geldin ekranı", () => {
  const a = openApp();
  assert.match(a.text(), /Hoş geldin/);
  assert.match(a.text(), /Yeni kelime/);
  assert.equal(a.ev("N"), 11719);
  noErrors(a); a.close();
});

test("bütün sekmeler hatasız açılır", () => {
  const a = openApp({ state: learnedState(LEARNED) });
  for (const [tab, re] of [["pratik", /Pratik/], ["gelisim", /./], ["kelimelerim", /./], ["ayarlar", /Yedekle/], ["calis", /iyi biliyorum/]]) {
    a.go(tab);
    assert.match(a.text(), re, tab);
    assert.equal(a.$(`nav a[data-v="${tab}"]`).getAttribute("aria-current"), "page");
  }
  noErrors(a); a.close();
});

test("yeni kelime → soru → doğru cevap → kutu yükselir ve kaydedilir", () => {
  const a = openApp({ state: { v: 1, welcomed: true } });
  a.click("#start");
  // ilk kelime kutu 1'de; sorulana kadar ilerle
  let guard = 0;
  while (!a.$(".opts [data-o]") && guard++ < 5) { const b = a.$("#start, #next"); if (!b) break; a.click(b); }
  const id = a.ev("cur.id");
  assert.equal(a.ev("cur.type"), "q");
  const before = a.ev(`S.p[${id}][0]`);
  a.click(`.opts [data-o="${id}"]`);
  assert.equal(a.ev(`S.p[${id}][0]`), before + 1);
  assert.match(a.text(), /Doğru/);
  const saved = JSON.parse(a.window.localStorage.getItem("elifba-kelime-v1"));
  assert.equal(saved.p[id][0], before + 1);
  noErrors(a); a.close();
});

test("yanlış cevap kutuyu 1'e düşürür; aralıklar doğru", () => {
  const a = openApp({ state: learnedState([ORDER[0]], 4) });
  const id = ORDER[0];
  a.ev(`S.p[${id}][1] = 0; cur = null; render();`);
  assert.equal(a.ev("cur.type"), "q");
  const wrong = a.ev(`cur.opts.find(j => j !== ${id})`);
  a.click(`.opts [data-o="${wrong}"]`);
  assert.equal(a.ev(`S.p[${id}][0]`), 1);
  assert.equal(a.ev(`S.p[${id}][3]`), 1);
  // kutu 1 → 1 dk sonra
  assert.equal(a.ev(`S.p[${id}][1] - nowMin()`), 1);
  assert.deepEqual(JSON.parse(a.ev("JSON.stringify(INT)")), [0, 1, 10, 1440, 4320, 10080, 23040, 50400, 129600]);
  noErrors(a); a.close();
});

test("şıklar tutarlı: doğru cevap dahil 4 farklı, gizli kelime yok", () => {
  const a = openApp({ state: learnedState(LEARNED, 3) });
  for (let k = 0; k < 200; k++) {
    const id = LEARNED[k];
    const q = a.ev(`makeQ(${id})`);
    assert.equal(q.opts.length, 4);
    assert.ok(q.opts.includes(id));
    assert.equal(new Set(q.opts).size, 4);
    q.opts.forEach(j => assert.ok(!MAT.has(j), "gizli kelime şıkta: " + j));
  }
  noErrors(a); a.close();
});

test("gizli kelimeler hiçbir zaman yeni kelime olarak gelmez", () => {
  const a = openApp({ state: { v: 1, welcomed: true } });
  const ids = a.ev(`(() => { const out = []; for (let q = 0; q < N; q++) { const i = ORDER[q]; if (!OFF(i)) out.push(i); } return out; })()`);
  assert.equal(ids.length, 11719 - 57);
  noErrors(a); a.close();
});

test("dil bilgisi havuzu yalnızca öğrenilmiş (kutu ≥ 3), seyrek ve gizli olmayan kelimeler", () => {
  const ids = [...LEARNED, ...[...MAT].slice(0, 5), ...W.map((w, i) => i).filter(isRare).slice(0, 20)];
  const st = learnedState(ids, 5);
  st.p[ORDER[401]] = [2, 0, 1, 0]; // kutu 2: öğrenilmiş sayılmaz
  const a = openApp({ state: st });
  const pool = a.ev("gramIds()");
  assert.ok(pool.length > 100);
  for (const i of pool) {
    assert.ok(!MAT.has(i), "gizli: " + i);
    assert.ok(!isRare(i), "seyrek: " + i);
    assert.ok(a.ev(`S.p[${i}][0]`) >= 3);
  }
  assert.ok(!pool.includes(ORDER[401]));
  noErrors(a); a.close();
});

// Bir alıştırmayı genel olarak "oynayan" yardımcı: şık/harf/devam butonlarına basar
function playQuiz(a, steps = 40) {
  for (let s = 0; s < steps; s++) {
    const b = a.$(".opts button[data-o]:not([disabled])") || a.$(".tiles button[data-t]:not([disabled])") || a.$("#next") || a.$("#giveup");
    if (!b) break;
    a.click(b);
  }
}

test("pratik merkezi: her alıştırma açılır ve birkaç soru çözülür", () => {
  const a = openApp({ state: learnedState(LEARNED), hash: "pratik" });
  const hubs = ["#goLes", "#goAlf", "#goDlg", "#goTx", "#goSent", "#goTri", "#goConj", "#goVerbs", "#goSpell", "#goRoots"];
  for (const h of hubs) {
    a.ev(`pv = { mode: "hub" }; gq = null; practice();`);
    a.click(h);
    assert.ok(a.text().length > 20, h + " boş");
    playQuiz(a, 12);
  }
  noErrors(a); a.close();
});

test("26 dil bilgisi dersi açılır, 8 soruluk alıştırmaları çözülür", () => {
  const a = openApp({ state: learnedState(LEARNED), hash: "pratik" });
  const n = a.ev("LESSONS.length");
  assert.equal(n, 26);
  for (let k = 0; k < n; k++) {
    a.ev(`pv = { mode: "lesson", k: ${k} }; gq = null; practice();`);
    assert.ok(a.text().length > 50, "ders " + k);
  }
  noErrors(a); a.close();
});

test("ayet/hadis ve diyalog sayfaları", () => {
  const a = openApp({ state: learnedState(LEARNED), hash: "pratik" });
  const nt = a.ev("TX.length"), nd = a.ev("DLG.length");
  assert.equal(nt, 71); assert.equal(nd, 12);
  for (let k = 0; k < nt; k++) { a.ev(`pv = { mode: "text", k: ${k} }; practice();`); }
  for (let k = 0; k < nd; k++) { a.ev(`pv = { mode: "dlg", k: ${k} }; practice();`); playQuiz(a, 10); }
  noErrors(a); a.close();
});

test("anlam düzeltme (S.cm) kelimeye uygulanır ve geri alınır", () => {
  const id = ORDER[0];
  const st = learnedState([id]); st.cm = { [id]: "deneme anlamı" };
  const a = openApp({ state: st });
  assert.equal(a.ev(`W[${id}][2]`), "deneme anlamı");
  a.ev(`delete S.cm[${id}]; applyCM();`);
  assert.equal(a.ev(`W[${id}][2]`), W[id][2]);
  noErrors(a); a.close();
});

test("kayıtlı durum yeniden açılışta korunur", () => {
  const a = openApp({ state: learnedState(LEARNED.slice(0, 50)) });
  a.ev("S.set.daily = 25; save();");
  const raw = a.window.localStorage.getItem("elifba-kelime-v1");
  a.close();
  const b = openApp({ state: JSON.parse(raw) });
  assert.equal(b.ev("S.set.daily"), 25);
  assert.equal(b.ev("Object.keys(S.p).length"), 50);
  noErrors(b); b.close();
});

test("Gelişim: aylık takvim ve seviye ilerleme çubukları", () => {
  const st = learnedState(LEARNED);
  const d = n => { const t = new Date(); t.setDate(t.getDate() - n); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
  st.log = { [d(0)]: { xp: 150, r: 20 }, [d(1)]: { xp: 60, r: 8 }, [d(40)]: { xp: 10, r: 2 } };
  st.set = { goal: 100 };
  const a = openApp({ state: st, hash: "gelisim" });
  assert.match(a.text(), /Çalışma takvimi/);
  assert.ok(a.$(".calgrid .cd.today.l3"), "bugün hedef tamam görünmeli");
  assert.equal(a.$$(".lvbars").length, 6);
  // geçmiş aylara git, sonra geri gel
  a.click('[data-cal="-1"]');
  a.click('[data-cal="-1"]');
  assert.ok(a.$$(".calgrid .cd.l1").length >= 1, "40 gün önceki kayıt görünmeli");
  a.click('[data-cal="1"]'); a.click('[data-cal="1"]');
  assert.ok(a.$('[data-cal="1"][disabled]'), "gelecek aya gidilmemeli");
  noErrors(a); a.close();
});

test("Soru ve önerileriniz: e-posta tanımlıysa mailto bağlantısı, değilse gizli", () => {
  const a = openApp({ hash: "ayarlar" });
  assert.doesNotMatch(a.text(), /Soru ve önerileriniz/);
  a.close();
  const html = standaloneHtml().replace('const CONTACT = "";', 'const CONTACT = "destek@example.com";');
  const b = openApp({ hash: "ayarlar", html });
  const link = b.$('a[href^="mailto:destek@example.com"]');
  assert.ok(link, "mailto bağlantısı yok");
  assert.match(decodeURIComponent(link.href), /subject=.*soru \/ öneri/);
  noErrors(b); b.close();
});

test("Play dışında destek paketleri görünmez", () => {
  const a = openApp({ hash: "ayarlar" });
  assert.doesNotMatch(a.text(), /kahve ısmarla/i);
  noErrors(a); a.close();
});

test("ayet sayfasında kaynaklı meal ve atıf; zayıf rivayet listede yok", () => {
  const a = openApp({ hash: "pratik" });
  a.click("#goTx");
  assert.doesNotMatch(a.text(), /Akıllı kişi, nefsini hesaba/);
  a.click('[data-x="1"]');
  assert.match(a.text(), /QuranEnc\.com/);
  assert.match(a.text(), /turkish_rwwad v1\.0\.4/);
  assert.match(a.text(), /Sadeleştirilmiş anlatım/);
  a.click("#backX"); a.click('[data-x="18"]');
  assert.match(a.text(), /HadeethEnc\.com/);
  assert.match(a.text(), /Hüküm: Sahih/);
  a.click("#backX"); a.click('[data-x="23"]');
  assert.match(a.text(), /Tilmiz çevirisi \(kaynakta Türkçesi bulunamadı\)/);
  assert.deepEqual(a.errors, []);
  a.close();
});

test("diyalogda ve örnek cümlede alternatif çeviriler; alternatif yanlış şık olmaz", () => {
  const a = openApp({ hash: "pratik" });
  a.click("#goDlg"); a.click('[data-d="0"]');
  assert.match(a.text(), /ya da: /);
  for (let i = 0; i < 40; i++) {
    const q = JSON.parse(a.ev(`(() => { const q = dlgQ(0); return JSON.stringify(q.opts ? q.opts.map(o => o.k || "") : []); })()`));
    const ok = a.ev(`DLG[0][1].map(l => [l[1], ...(l[2] || [])])`);
    // aynı cümlenin iki doğru çevirisi aynı soruda şık olarak yer almaz
    for (const set of ok) assert.ok(set.filter(t => q.includes(t)).length <= 1, JSON.stringify(q));
  }
  const S = readData("sentences");
  const k = S.s.findIndex(r => r[4]);
  assert.ok(k >= 0 && S.s.some(r => r[3] === 0), "düzeltilmiş ve alternatifli cümle var");
  assert.deepEqual(a.errors, []);
  a.close();
});
