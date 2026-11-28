// Telaffuz dersleri ve cihaz içi konuşma tanıma (sahte SpeechRecognition ile)
import { test } from "node:test";
import assert from "node:assert/strict";
import { openApp, readData } from "./helpers.mjs";

const W = readData("words");
const MAT = new Set(readData("mat"));
const tick = () => new Promise(r => setTimeout(r, 20));
const withSR = (state = "available") => window => {
  class SR { start() { setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: window.__say }]] }), 0); } stop() {} }
  SR.available = async () => state; SR.install = async () => true;
  window.SpeechRecognition = SR;
};

test("telaffuz çiftlerindeki bütün kelimeler sözlükte var ve gizli değil", () => {
  const a = openApp({ state: { v: 1, welcomed: true } });
  const words = JSON.parse(a.ev("JSON.stringify(PRON.flatMap(c => c.p.flat()))"));
  assert.ok(words.length >= 20);
  for (const ar of words) { const i = W.findIndex(w => w[0] === ar); assert.ok(i >= 0, "sözlükte yok: " + ar); assert.ok(!MAT.has(i)); }
  a.close();
});

test("telaffuz listesi, ders sayfası ve 'duyduğunu seç' alıştırması hatasız çalışır; tanıma yoksa mikrofon yok", () => {
  const a = openApp({ state: { v: 1, welcomed: true } });
  a.ev(`pv = { mode: "hub" }; location.hash = "#pratik"; route();`);
  a.click("#goPron");
  assert.match(a.text(), /ق · ك/);
  a.click('[data-pk="2"]');
  assert.match(a.text(), /قَلْب/); assert.match(a.text(), /köpek/);
  assert.equal(a.$("[data-sr]"), null);
  a.click("#prQ");
  for (let n = 0; n < 8; n++) { const k = a.ev("gq.q.opts.findIndex(o => o.ok)"); a.click(`.opts button[data-o="${k}"]`); const nx = a.$("#next") || a.$("#gnext"); if (nx) a.click(nx); }
  assert.match(a.text(), /\/8 doğru/);
  assert.ok(a.ev("S.pr && S.pr.q !== undefined"));
  a.ev(`location.hash = "#kelimelerim"; listTab = "dict"; route();`);
  assert.equal(a.$("#dqMic"), null);
  assert.deepEqual(a.errors, []);
  a.close();
});

test("cihaz içi tanıma varsa: söylenen kelime doğru ya da çiftin ötekisi olarak değerlendirilir", async () => {
  const a = openApp({ state: { v: 1, welcomed: true }, beforeParse: withSR("available") });
  await tick();
  assert.equal(a.ev("srState"), "available");
  a.ev(`pv = { mode: "pronx", k: 2 }; location.hash = "#pratik"; route();`); await tick();
  const btn = a.$('[data-sr="قَلْب"]'); assert.ok(btn, "mikrofon düğmesi yok");
  a.window.__say = "قلب"; a.click(btn); await tick(); await tick();
  assert.match(a.$("#srOut").textContent, /Doğru anlaşıldı/);
  a.window.__say = "كلب"; a.click(a.$('[data-sr="قَلْب"]')); await tick(); await tick();
  assert.match(a.$("#srOut").textContent, /öteki kelimesi/);
  a.ev(`location.hash = "#kelimelerim"; listTab = "dict"; route();`); await tick();
  a.window.__say = "كتاب"; a.click("#dqMic"); await tick(); await tick();
  assert.equal(a.ev("dictQ"), "كتاب");
  assert.deepEqual(a.errors, []);
  a.close();
});

test("dil paketi indirilebilir durumdaysa indirme düğmesi gösterilir", async () => {
  const a = openApp({ state: { v: 1, welcomed: true }, beforeParse: withSR("downloadable") });
  await tick();
  a.ev(`pv = { mode: "pronx", k: 0 }; location.hash = "#pratik"; route();`); await tick();
  assert.ok(a.$("#srIns"));
  a.click("#srIns"); await tick(); await tick();
  assert.equal(a.ev("srState"), "available");
  a.close();
});
