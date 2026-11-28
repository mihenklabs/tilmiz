// Ses paketleri: indirme, paketten çalma, silme (sahte sunucu, Cache Storage ve Audio ile)
import { test } from "node:test";
import assert from "node:assert/strict";
import { openApp } from "./helpers.mjs";

const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
const BASE = "https://mihenklabs.github.io/tilmiz-ses/";
const p0 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const files = {
  "packs.json": JSON.stringify([{ id: "kelime", title: "Kelime sesleri", desc: "11.719 kelime", ver: "t1", size: 10 + 40, index: "kelime/index.t1.json", parts: ["kelime/p0.t1.bin"] }]),
  "kelime/index.t1.json": JSON.stringify({ "مَرْحَبًا": [0, 0, 4], "كِتَابٌ": [0, 4, 6] }),
  "kelime/p0.t1.bin": p0,
};
function env(window) {
  const store = new Map();
  window.caches = { open: async () => ({
    match: async u => store.has(u) ? store.get(u).clone() : undefined,
    put: async (u, r) => { store.set(u, new Response(await r.arrayBuffer(), { headers: r.headers })); },
    delete: async u => store.delete(u),
  }) };
  window.__store = store;
  window.Response = Response; window.Blob = Blob;
  window.fetch = async u => { const k = String(u).replace(BASE, ""); window.__fetched = (window.__fetched || 0) + 1; return k in files ? new Response(files[k]) : new Response("", { status: 404 }); };
  window.URL.createObjectURL = b => { window.__lastBlob = b; return "blob:test"; };
  window.URL.revokeObjectURL = () => {};
  window.Audio = class { constructor(src) { this.src = src; window.__played = (window.__played || 0) + 1; } play() { return Promise.resolve(); } pause() {} };
  window.speechSynthesis = { speak() { window.__tts = (window.__tts || 0) + 1; }, cancel() {}, getVoices: () => [] };
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
}

test("ses paketi: listelenir, indirilir, kelime paketten çalınır, silinince cihaz sesine döner", async () => {
  const a = openApp({ state: { v: 1, welcomed: true }, beforeParse: env, hash: "ayarlar" });
  await tick(); a.ev("route()"); await tick();
  assert.match(a.text(), /Ses paketleri/);
  assert.match(a.text(), /Kelime sesleri/);
  a.click('[data-sesget="kelime"]'); await tick(80);
  assert.ok(a.ev("!!S.set.ses.kelime"), "kurulu değil");
  assert.match(a.text(), /Sil/);
  // paketten çal: doğru dilim (bayt 4–10) ses olarak verilmeli
  assert.equal(a.ev(`sesSpeak("كِتَابٌ")`), true); await tick(60);
  assert.equal(a.window.__played, 1);
  assert.equal(a.window.__lastBlob.size, 6);
  assert.equal(a.ev(`sesSpeak("غَيْرُ مَوْجُود")`), false);
  // yeniden açılışta dizin önbellekten yüklenir (internetsiz)
  const st = a.ev("JSON.stringify(S)");
  a.window.fetch = async () => { throw new Error("çevrimdışı"); };
  a.ev(`S.set.ses = JSON.parse(${JSON.stringify(st)}).set.ses; Object.keys(sesIdx).forEach(k => delete sesIdx[k]); sesLoad("kelime")`); await tick(60);
  assert.equal(a.ev(`sesSpeak("مَرْحَبًا")`), true);
  a.window.confirm = () => true;
  a.ev(`sesRemove("kelime")`); await tick(60);
  assert.equal(a.ev(`sesSpeak("مَرْحَبًا")`), false);
  assert.deepEqual(a.errors, []);
  a.close();
});

test("ses paketi adresi yoksa ya da claude.ai'deyse bölüm görünmez", () => {
  const a = openApp({ state: { v: 1, welcomed: true }, hash: "ayarlar" }); // jsdom'da Cache Storage yok
  assert.doesNotMatch(a.text(), /Ses paketleri/);
  a.close();
});
