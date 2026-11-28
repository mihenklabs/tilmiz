// Öğrenilen kelimelere göre bölümlerin açılması: hazırlık göstergeleri, eksik kelimeleri öne alma, "yeni açıldı" kartı
import { test } from "node:test";
import assert from "node:assert/strict";
import { openApp, learnedState, readData } from "./helpers.mjs";

const TX = readData("texts");
const MAT = new Set(readData("mat"));
const ORDER = readData("order");
const k0 = TX.findIndex(o => !o.hid); // Fâtiha
const ids = o => [...new Set(o.v.flatMap(([, it]) => it.map(x => x[2])).filter(i => i >= 0 && !MAT.has(i)))];

test("metin hazırlığı: sözlükte karşılığı olan kelimelerin %80'i öğrenilince 'okumaya hazır'", () => {
  const all = ids(TX[k0]);
  const a = openApp({ state: { ...learnedState(all.slice(0, Math.floor(all.length * 0.5))), welcomed: true } });
  let r = JSON.parse(a.ev(`JSON.stringify(textReady(TX[${k0}]))`));
  assert.equal(r.t, TX[k0].v.flatMap(([, it]) => it).filter(x => x[2] >= 0 && !MAT.has(x[2])).length); // tekrar edenler de sayılır
  assert.equal(r.ready, false);
  assert.ok(r.miss.length > 0);
  a.close();
  const b = openApp({ state: { ...learnedState(all), welcomed: true } });
  r = JSON.parse(b.ev(`JSON.stringify(textReady(TX[${k0}]))`));
  assert.equal(r.ready, true);
  b.ev(`pv = { mode: "texts" }; location.hash = "#pratik"; route();`);
  assert.match(b.text(), /Okumaya hazır/);
  assert.match(b.text(), /metin okumaya hazır/);
  b.close();
});

test("metin sayfası: eksik kelimeler Çalış'ta öne alınır", () => {
  const a = openApp({ state: { v: 1, welcomed: true } });
  a.ev(`pv = { mode: "text", k: ${k0}, hide: false }; location.hash = "#pratik"; route();`);
  assert.match(a.text(), /Okumaya hazırlık: %0/);
  a.click("#txPrio");
  const prio = JSON.parse(a.ev("JSON.stringify(S.prio)"));
  assert.deepEqual(new Set(prio), new Set(ids(TX[k0])));
  assert.equal(a.ev("nextNewId()"), prio[0]);
  assert.deepEqual(a.errors, []);
  a.close();
});

test("ana ekranda 'yeni açıldı' kartı; 'Sonra' bir daha göstermez, 'Metni aç' metne götürür", () => {
  const st = { ...learnedState(ids(TX[k0])), welcomed: true };
  const a = openApp({ state: st, hash: "calis" });
  assert.match(a.text(), /Yeni açıldı: Fâtiha/);
  a.click("#unLater");
  assert.doesNotMatch(a.text(), /Yeni açıldı: Fâtiha/);
  assert.ok(a.ev(`S.ann.t.includes(${k0})`));
  a.close();
  const b = openApp({ state: st, hash: "calis" });
  b.click("#unGo"); b.ev("route()");
  assert.equal(b.ev("pv.mode"), "text");
  assert.match(b.text(), /bildiğin/);
  assert.deepEqual(b.errors, []);
  b.close();
});

test("dil bilgisi: kelime yokken alıştırma 'daha fazla kelime' der, yeterince kelimeyle 'Hazır' görünür", () => {
  const a = openApp({ state: { v: 1, welcomed: true } });
  a.ev(`pv = { mode: "lessons" }; location.hash = "#pratik"; route();`);
  assert.match(a.text(), /Alıştırma için daha fazla kelime öğren/);
  a.close();
  const b = openApp({ state: { ...learnedState(ORDER.slice(0, 800)), welcomed: true } });
  b.ev(`pv = { mode: "lessons" }; location.hash = "#pratik"; route();`);
  assert.match(b.text(), /Hazır/);
  assert.deepEqual(b.errors, []);
  b.close();
});

test("pratik merkezi hazırlık sayıları hızlı hesaplanır", () => {
  const a = openApp({ state: { ...learnedState(ORDER.slice(0, 800)), welcomed: true } });
  const ms = a.ev(`(() => { const t = performance.now(); pv = { mode: "hub" }; location.hash = "#pratik"; route(); return performance.now() - t; })()`);
  assert.ok(ms < 800, "pratik merkezi " + Math.round(ms) + " ms");
  assert.match(a.text(), /yeni ders hazır|metin okumaya hazır/);
  a.close();
});
