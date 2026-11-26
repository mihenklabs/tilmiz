// Örnek cümlelere (Tatoeba) kendi çeviri düzeltmelerimizi ve alternatiflerimizi uygular, çıkarılan cümleleri atar.
//   data/sentences-tr.json      : { "<Tatoeba Arapça id>": { "tr": "düzeltilmiş çeviri"?, "alt": ["alternatif", ...]? } }
//   data/sentences-blocked.json : [Tatoeba Arapça id, ...]  (Arapçası hatalı ya da 7+ yaşa uygun olmayan)
// Düzeltilen çevirilerde Türkçe kimliği 0 olur (çeviri artık Tatoeba'nın değil, bizimdir).
// tools/tatoeba.mjs cümleleri yeniden üretirken bunu çağırır; tek başına da mevcut data/sentences.json'a uygulanabilir:
//   node tools/sentences-apply.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fmtJSON } from "./jsonfmt.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJ = (f, d) => { const p = path.join(root, "data", f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d; };

/** {src, s:[[ar,tr,arId,trId,alt?]], w:{kelimeId:[k]}} nesnesine uygular (yerinde değiştirmez, yenisini döndürür). */
export function applySentenceFixes(obj, { fixes = readJ("sentences-tr.json", {}), blocked = new Set(readJ("sentences-blocked.json", [])) } = {}) {
  const map = new Map(), s = [];
  obj.s.forEach((row, k) => {
    if (blocked.has(row[2])) return;
    const r = row.slice(0, 4), f = fixes[row[2]];
    if (f && f.tr && f.tr !== r[1]) { r[1] = f.tr; r[3] = 0; }
    const alt = f && f.alt ? f.alt.filter(a => a && a !== r[1]) : [];
    if (alt.length) r[4] = alt;
    map.set(k, s.length); s.push(r);
  });
  const w = {};
  for (const [id, ks] of Object.entries(obj.w)) { const n = ks.map(k => map.get(k)).filter(k => k !== undefined); if (n.length) w[id] = n; }
  return { ...obj, s, w };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const p = path.join(root, "data/sentences.json");
  const before = JSON.parse(fs.readFileSync(p, "utf8"));
  const after = applySentenceFixes(before);
  fs.writeFileSync(p, fmtJSON(after));
  console.log(`${before.s.length} → ${after.s.length} cümle, ${after.s.filter(r => r[3] === 0).length} kendi çevirimiz, ${after.s.filter(r => r[4]).length} alternatifli; ${Object.keys(after.w).length} kelimede örnek`);
}
