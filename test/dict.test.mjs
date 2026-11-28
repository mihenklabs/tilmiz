// Sözlük ekranı ve arama
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { openApp, readData } from "./helpers.mjs";

const W = readData("words");
const MAT = new Set(readData("mat"));
const ROOTS = readData("roots");
const a = openApp({ state: { v: 1, welcomed: true } });
const search = q => JSON.parse(a.ev(`JSON.stringify(dictSearch(${JSON.stringify(q)}))`));
after(() => a.close());
const idOf = ar => W.findIndex(w => w[0] === ar);

test("harekeli ve harekesiz Arapça arama aynı kelimeyi ilk sırada bulur", () => {
  const id = idOf("مَرْحَبًا");
  assert.ok(id >= 0);
  assert.equal(search("مَرْحَبًا")[0], id);
  assert.equal(search("مرحبا")[0], id);
});

test("elif/hemze farkı yok sayılır", () => {
  const id = W.findIndex(w => /^أ/.test(w[0]) && !MAT.has(W.indexOf(w)));
  const plain = W[id][0].replace(/^أ/, "ا").replace(/[ً-ْ]/g, "");
  assert.ok(search(plain).includes(id));
});

test("Türkçe arama: şapka ve büyük harf duyarsız, tam eşleşme önce", () => {
  const r = search("MERHABA");
  assert.equal(r[0], idOf("مَرْحَبًا"));
  const kitap = search("kitap");
  assert.ok(kitap.length > 0);
  assert.match(W[kitap[0]][2], /(^|[\s,;])kitap([\s,;]|$)/i);
});

test("kök araması: كتب ailesi gelir", () => {
  const fam = Object.keys(ROOTS).filter(k => ROOTS[k] === "كتب").map(Number).filter(i => !MAT.has(i));
  assert.ok(fam.length >= 3);
  const r = search("ك ت ب");
  for (const i of fam) assert.ok(r.includes(i), "eksik: " + W[i][0]);
});

test("örnek cümleler: kartta görünür, gizli kelime ve uygunsuz içerik yok", () => {
  const S = readData("sentences");
  assert.ok(S.s.length > 1000);
  const id = idOf("هُوَ");
  assert.ok(S.w[id] && S.w[id].length);
  assert.match(a.ev(`exampleBlock(${id})`), /Örnek cümleler/);
  for (const [, tr, , , alt] of S.s) for (const t of [tr, ...(alt || [])]) assert.doesNotMatch(t.toLocaleLowerCase("tr"), /(^|\s)(öldür|intihar|şarap|bira(?![a-zçğıöşü])|sarhoş|seks(?![a-zçğıöşü]))/, t);
  for (const i of MAT) assert.ok(!S.w[i], "gizli kelimeye örnek bağlanmış: " + i);
});

test("gizli kelimeler sözlükte yok", () => {
  for (const i of MAT) {
    const r = search(W[i][0]);
    assert.ok(!r.includes(i));
  }
  assert.equal(a.ev("dictIds().length"), 11719 - 65);
});

test("sözlük ekranı: ara, kartı aç, öğrenmeye ekle", () => {
  a.ev(`listTab = "dict"; dictQ = ""; location.hash = "#kelimelerim"; route();`);
  assert.match(a.text(), /Sözlük/);
  const q = a.$("#dq");
  q.value = "kitap"; q.dispatchEvent(new a.window.Event("input"));
  const first = a.$(".list details");
  assert.ok(first, "sonuç yok");
  first.open = true; first.dispatchEvent(new a.window.Event("toggle"));
  assert.ok(first.querySelector(".det"), "kart açılmadı");
  const id = +first.dataset.i;
  const add = first.querySelector('[data-dact="learn"]');
  assert.ok(add);
  a.click(add);
  assert.equal(a.ev("S.prio[0]"), id);
  assert.equal(a.ev("nextNewId()"), id);
  assert.deepEqual(a.errors, []);
});
