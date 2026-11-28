// Veri dosyalarının bütünlüğü
import { test } from "node:test";
import assert from "node:assert/strict";
import { readData } from "./helpers.mjs";

const W = readData("words");
const N = W.length;

test("kelime sayısı ve alan yapısı", () => {
  assert.equal(N, 11719);
  const POS = new Set(["noun", "verb", "adj", "adv", "pron", "prep", "conj", "intj", "num", "phrase", "particle"]);
  W.forEach((w, i) => {
    assert.equal(w.length, 6, `kelime ${i} 6 alanlı olmalı`);
    assert.ok(w[0] && /[؀-ۿ]/.test(w[0]), `kelime ${i} Arapça yazım`);
    assert.ok(w[2] && w[2].trim(), `kelime ${i} Türkçe anlam boş`);
    assert.ok(POS.has(w[4]), `kelime ${i} bilinmeyen tür: ${w[4]}`);
  });
});

test("seyrek ve gizli kelime sayıları", () => {
  assert.equal(W.filter(w => /seyrek kullanılır/.test(w[2])).length, 836); // sözlük düzeltmeleriyle değişebilir (tools/dict-fixes)
  const mat = readData("mat");
  assert.equal(mat.length, 57);
  mat.forEach(i => assert.ok(Number.isInteger(i) && i >= 0 && i < N));
});

test("öğrenme sırası tüm kelimelerin bir permütasyonu", () => {
  const order = readData("order");
  assert.equal(order.length, N);
  assert.equal(new Set(order).size, N);
  order.forEach(i => assert.ok(i >= 0 && i < N));
});

test("ek veri dosyalarındaki kimlikler geçerli", () => {
  for (const name of ["roots", "cog", "conj", "vinfo"]) {
    for (const k of Object.keys(readData(name))) assert.ok(+k >= 0 && +k < N, `${name}: ${k}`);
  }
  const g = readData("gender");
  for (const k of [...Object.keys(g.g), ...Object.keys(g.f || {})]) assert.ok(+k >= 0 && +k < N);
  const conj = readData("conj");
  for (const [k, c] of Object.entries(conj)) {
    assert.equal(W[k][4], "verb", `çekim verisi fiil olmayan kelimede: ${k}`);
    assert.equal(c[0].length, 13, `${k} mazi 13 şahıs`);
    assert.equal(c[1].length, 13, `${k} muzari 13 şahıs`);
  }
});

test("ayet/hadis metinleri", () => {
  const tx = readData("texts");
  assert.equal(tx.length, 71);
});

test("kaynaklı ayet/hadis çevirileri", () => {
  const tx = readData("texts"), src = readData("texts-src");
  assert.ok(src.src.q.ver && src.src.h.name);
  assert.ok(src.t.length >= 60);
  for (const x of src.t) {
    assert.ok(tx[x.i], "geçersiz sıra " + x.i);
    assert.equal(x.s, tx[x.i].k === "a" ? "q" : "h", "kaynak türü: " + x.i);
    assert.ok(x.tr && !/\s{2}/.test(x.tr));
  }
  assert.equal(new Set(src.t.map(x => x.i)).size, src.t.length);
});
