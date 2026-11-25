// jsdom ile uygulamayı açan yardımcılar
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalonePath = path.join(root, "dist/elifba-kelime.html");
let cachedHtml = null;
export const standaloneHtml = () => (cachedHtml ??= fs.readFileSync(standalonePath, "utf8"));

/**
 * Uygulamayı açar. state verilirse localStorage'a önceden yazılır.
 * Dönen nesne: { window, document, errors, $, ev(kod), click(seçici), go(sekme), close() }
 */
export function openApp({ state, hash = "", html = standaloneHtml(), url = "https://elifba.test/", beforeParse } = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => errors.push(String(e && (e.stack || e.message) || e)));
  vc.on("error", (...a) => errors.push(a.map(String).join(" ")));
  const dom = new JSDOM(html, {
    url: url + (hash ? "#" + hash : ""),
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      if (state) w.localStorage.setItem("elifba-kelime-v1", JSON.stringify(state));
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = function () {};
      w.addEventListener("error", e => errors.push(String(e.error && e.error.stack || e.message)));
      w.addEventListener("unhandledrejection", e => errors.push("unhandled: " + String(e.reason && e.reason.stack || e.reason)));
      if (beforeParse) beforeParse(w);
    },
  });
  const { window } = dom;
  const document = window.document;
  const api = {
    window, document, errors,
    $: s => document.querySelector(s),
    $$: s => [...document.querySelectorAll(s)],
    ev: code => window.eval(code),
    click(sel) {
      const el = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (!el) throw new Error("bulunamadı: " + sel);
      el.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
      el.click();
      return el;
    },
    go(tab) { window.location.hash = tab; window.dispatchEvent(new window.HashChangeEvent("hashchange")); },
    text: () => document.getElementById("app").textContent,
    close() { window.close(); },
  };
  return api;
}

/** Başlangıçta `n` kelimeyi belirtilen kutuda öğrenilmiş sayan bir durum üretir. */
export function learnedState(ids, box = 5) {
  const now = Math.floor(Date.now() / 60000);
  const p = {};
  for (const id of ids) p[id] = [box, now + 100000, 3, 0];
  return { v: 1, t: Date.now(), welcomed: true, p };
}

export const readData = name => JSON.parse(fs.readFileSync(path.join(root, "data", name + ".json"), "utf8"));
