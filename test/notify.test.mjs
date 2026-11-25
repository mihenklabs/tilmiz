// Kişiye özel hatırlatmalar: alışkanlık saati, sıklık, sessiz saatler, mesajlar, iletim
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { openApp, learnedState, readData, root } from "./helpers.mjs";

const ORDER = readData("order");
const pad = n => String(n).padStart(2, "0");
const ds = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today10 = () => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; };
const daysAgo = n => { const d = today10(); d.setDate(d.getDate() - n); return d; };

// n gün boyunca her gün hh:mm'de çalışmış bir kullanıcı; son çalışma `lastAgo` gün önce
function stateWith({ hh = 20, mm = 0, days = 10, lastAgo = 1, n = [] } = {}) {
  const st = learnedState(ORDER.slice(0, 200), 3);
  const s = [];
  for (let k = days + lastAgo - 1; k >= lastAgo; k--) { const d = daysAgo(k); d.setHours(hh, mm + (k % 3) * 5); s.push([Math.floor(d.getTime() / 60000), d.getHours() * 60 + d.getMinutes(), d.getDay()]); }
  st.hab = { s, n };
  st.streak = { last: ds(daysAgo(lastAgo)), c: days };
  return st;
}
const plan = (a, now = today10()) => JSON.parse(a.ev(`JSON.stringify(buildPlan(new Date(${now.getTime()})))`));
const dayOf = (p, now = today10()) => Math.round((new Date(new Date(p.at).toDateString()) - new Date(now.toDateString())) / 864e5);
const minOf = p => { const d = new Date(p.at); return d.getHours() * 60 + d.getMinutes(); };

test("alışkanlık saati öğrenilir, hatırlatma 15 dk önce", () => {
  const a = openApp({ state: stateWith({ hh: 20, mm: 0 }) });
  const t = a.ev(`habitTime(false, new Date(${today10().getTime()})) ?? habitTime(true, new Date(${today10().getTime()}))`);
  assert.ok(Math.abs(t - 1205) <= 10, "beklenen ~20:05, bulunan " + t);
  const p = plan(a);
  // kullanıcı hiç gelmezse: ilk 3 gün her gün, sonra seyrekleşir
  assert.deepEqual(p.slice(0, 3).map(x => dayOf(x)), [0, 1, 2]);
  assert.equal(dayOf(p[0]), 0);
  assert.ok(Math.abs(minOf(p[0]) - (t - 15)) <= 1);
  for (const x of p) { assert.ok(x.title && x.body); assert.doesNotMatch(x.title + x.body, /undefined|null|NaN/); }
  a.close();
});

test("bugün çalıştıysa bugüne hatırlatma yok, yarından başlar", () => {
  const a = openApp({ state: stateWith({ lastAgo: 0 }) });
  const p = plan(a);
  assert.ok(p.length);
  assert.equal(dayOf(p[0]), 1);
  a.close();
});

test("ara uzadıkça seyrekleşir, 30 günde durur", () => {
  const gaps = g => { const a = openApp({ state: stateWith({ lastAgo: g }) }); const p = plan(a).map(x => dayOf(x)); a.close(); return p; };
  const g5 = gaps(5);
  for (let i = 1; i < g5.length; i++) assert.ok(g5[i] - g5[i - 1] >= 2, "4–7 gün arada iki günde bir: " + g5);
  const g20 = gaps(20);
  for (let i = 1; i < g20.length; i++) assert.ok(g20[i] - g20[i - 1] >= 7);
  assert.ok(g20.every(d => 20 + d <= 30));
  assert.deepEqual(gaps(31), []);
});

test("3 hatırlatma boşa gittiyse aralık iki katına çıkar ve saat kayar", () => {
  const n = [3, 2, 1].map(k => ({ tag: "rem-x" + k, t: Math.floor(daysAgo(k).getTime() / 60000), k: "genel", shown: 1 }));
  const a = openApp({ state: stateWith({ lastAgo: 2, n }) });
  const p = plan(a);
  for (let i = 1; i < p.length; i++) assert.ok(dayOf(p[i]) - dayOf(p[i - 1]) >= 2, "günlük yerine iki günde bir");
  assert.ok(Math.abs(minOf(p[0]) - (20 * 60 + 5 - 15)) >= 60, "saat denemesi kaymalı");
  a.close();
});

test("sessiz saatlere bildirim düşmez", () => {
  const a = openApp({ state: stateWith({ hh: 23, mm: 30 }) });
  for (const x of plan(a)) { const m = minOf(x); assert.ok(m >= 8 * 60 && m < 21 * 60, "sessiz saatte: " + m); }
  a.ev(`S.set.qS = "22:00"; S.set.qE = "07:00";`);
  for (const x of plan(a)) { const m = minOf(x); assert.ok(m >= 7 * 60 && m < 22 * 60); }
  a.close();
});

test("sabit saat ve kapalı ayarı", () => {
  const a = openApp({ state: stateWith({}) });
  a.ev(`S.set.rem = "fixed"; S.set.remT = "17:40";`);
  for (const x of plan(a)) if (!/seri/.test(x.tag)) assert.equal(minOf(x), 17 * 60 + 40);
  a.ev(`S.set.rem = "off";`);
  assert.deepEqual(plan(a), []);
  a.close();
});

test("seri tehlikedeyse akşam ikinci nazik hatırlatma", () => {
  const a = openApp({ state: stateWith({ hh: 12, mm: 0, days: 6, lastAgo: 1 }) });
  const p = plan(a).filter(x => dayOf(x) === 0);
  assert.equal(p.length, 2, JSON.stringify(p.map(x => x.title)));
  assert.equal(p[0].kind, "seri", "dün çalışıp bugün çalışmayana önce seri mesajı");
  assert.match(p[1].title, /seri/);
  assert.equal(minOf(p[1]), 21 * 60 - 45);
  a.close();
});

test("mesajlar kişiye özel ve çeşitli", () => {
  const st = stateWith({});
  const due = Math.floor(today10().getTime() / 60000);
  for (const id of ORDER.slice(0, 30)) st.p[id][1] = due; // 30 kelime tekrar bekliyor
  const a = openApp({ state: st });
  const p = plan(a);
  const all = p.map(x => x.title + " " + x.body).join("\n");
  assert.match(all, /30 kelime|kelime tekrar/);
  assert.ok(new Set(p.slice(0, 4).map(x => x.kind)).size >= 3, "ilk dört hatırlatma farklı türde olmalı: " + p.slice(0, 4).map(x => x.kind));
  a.close();
});

test("oturum kaydı: 30 dk içindeki etkinlik aynı oturum, hatırlatmadan sonra gelmek 'işe yaradı' sayılır", () => {
  const a = openApp({ state: learnedState(ORDER.slice(0, 5)) });
  const t = Date.now();
  a.ev(`S.hab = { s: [], n: [{ tag: "rem-a", t: ${Math.floor(t / 60000) - 60}, k: "genel", shown: 1 }] };
    habitPing(new Date(${t})); habitPing(new Date(${t + 10 * 60000})); habitPing(new Date(${t + 50 * 60000}));`);
  assert.equal(a.ev("S.hab.s.length"), 2);
  assert.equal(a.ev("S.hab.n[0].o"), 1);
  a.close();
});

test("Android köprüsü: yerel uygulamanın gönderdiği porta plan iletilir", async () => {
  const a = openApp({ state: stateWith({}) });
  // yerel taraftaki MessagePort yerine sahte port
  let resolve; const got = new Promise(r => { resolve = r; });
  const port = { onmessage: null, postMessage: d => resolve(JSON.parse(d)) };
  const ev = new a.window.Event("message");
  Object.defineProperty(ev, "data", { value: "tilmiz-native-hello" });
  Object.defineProperty(ev, "ports", { value: [port] });
  a.window.dispatchEvent(ev);
  const m = await got;
  assert.equal(m.type, "tilmiz-plan");
  assert.ok(m.plan.length >= 5);
  assert.match(m.plan[0].url, /\?n=rem-/);
  port.onmessage({ data: JSON.stringify({ type: "shown", tag: m.plan[0].tag, at: m.plan[0].at }) });
  assert.equal(a.ev("S.hab.n[S.hab.n.length - 1].tag"), m.plan[0].tag);
  a.close();
});

test("Ayarlar'da hatırlatma kartı; claude.ai'de gizli", () => {
  const a = openApp({ state: stateWith({}), hash: "ayarlar" });
  assert.match(a.text(), /Hatırlatmalar/);
  assert.match(a.text(), /Sıradaki:/);
  a.click('[data-k="rem"][data-v="fixed"]');
  assert.ok(a.$("#remT"));
  assert.deepEqual(a.errors, []);
  a.close();
  const b = openApp({ hash: "ayarlar", beforeParse(w) { w.claude = { use: async () => null }; } });
  assert.doesNotMatch(b.text(), /Hatırlatmalar/);
  b.close();
});

test("service worker: plan saklama, periyodik eşitleme, bildirime dokunma", () => {
  const sw = fs.readFileSync(path.join(root, "dist/site/sw.js"), "utf8");
  for (const s of ["tilmiz-plan", "periodicsync", "showNotification", "notificationclick"]) assert.ok(sw.includes(s), s);
});
