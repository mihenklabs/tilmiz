// Sesli pratik: söyle, dinle, karşılaştır (kayıt yalnızca bellekte)
import { test } from "node:test";
import assert from "node:assert/strict";
import { openApp, learnedState, readData } from "./helpers.mjs";

const ORDER = readData("order");
const tick = () => new Promise(r => setTimeout(r, 30));

function fakeMic(w, log) {
  Object.defineProperty(w.navigator, "mediaDevices", { value: { getUserMedia: async () => { log.push("open"); return { getTracks: () => [{ stop: () => log.push("close") }] }; } }, configurable: true });
  w.MediaRecorder = class {
    constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; }
    start() { this.state = "recording"; log.push("rec"); }
    stop() { this.state = "inactive"; this.ondataavailable({ data: new w.Blob(["ses"]) }); this.onstop(); }
  };
  w.URL.createObjectURL = () => { log.push("url"); return "blob:x"; };
  w.URL.revokeObjectURL = () => log.push("revoke");
  w.HTMLMediaElement.prototype.play = function () { log.push("play"); return Promise.resolve(); };
}

test("mikrofon yoksa sesli pratik gösterilmez", () => {
  const a = openApp({ hash: "pratik" });
  assert.equal(a.$("#goVoice"), null);
  a.close();
});

test("kaydet → dinle → değerlendir; kayıt silinir, mikrofon kapanır, XP yazılır", async () => {
  const log = [];
  const a = openApp({ hash: "pratik", state: learnedState(ORDER.slice(0, 30), 3), beforeParse: w => fakeMic(w, log) });
  a.click("#goVoice");
  assert.match(a.text(), /Sesli pratik/);
  assert.match(a.text(), /hiçbir yere kaydedilmez/);
  a.click("#vRec"); await tick();
  assert.match(a.$("#vRec").textContent, /Durdur/);
  a.click("#vRec"); await tick();
  assert.deepEqual(log.slice(0, 5), ["open", "rec", "close", "url", "play"]);
  assert.ok(a.$("#vMe") && a.$("#vBoth"));
  a.click("#vGood"); await tick();
  assert.ok(log.includes("revoke"), "sonraki cümlede kayıt bellekten silinir");
  assert.match(a.text(), /1\/1 benzer/);
  assert.equal(a.ev("Object.values(S.log)[0].v"), 1);
  // kaynak değiştirme: öğrenilmiş kelimeler ve ayet parçaları
  a.click('[data-vs="word"]'); assert.ok(a.$(".vcard .big"));
  a.click('[data-vs="tx"]'); assert.ok(a.$(".vcard .big"));
  assert.equal(a.ev("S.set.vsrc"), "tx");
  assert.deepEqual(a.errors, []);
  a.close();
});
