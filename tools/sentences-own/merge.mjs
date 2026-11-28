// Kendi örnek cümlelerimizi (out/*.jsonl) data/sentences.json'a ekler. Tekrar çalıştırmak güvenlidir:
// önce eski kendi satırları (Tatoeba kimliği 0) çıkarılır, sonra yeniden eklenir. tatoeba.mjs sonunda da çağrılır.
// Satır biçimi: [ar, tr, 0, 0, alt?]  (0,0 = Tilmiz'in kendi cümlesi; Tatoeba'da 0 kimliği yok)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

export function mergeOwn(SN) {
  const keep = [], remap = {};
  SN.s.forEach((s, k) => { if (!(s[2] === 0 && s[3] === 0)) { remap[k] = keep.length; keep.push(s); } });
  const w = {};
  for (const [id, ks] of Object.entries(SN.w)) { const m = ks.map(k => remap[k]).filter(k => k !== undefined); if (m.length) w[id] = m; }
  const MAT = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/mat.json"), "utf8")));
  const outDir = path.join(here, "out");
  let added = 0;
  for (const f of fs.readdirSync(outDir).filter(f => f.endsWith(".jsonl")).sort()) {
    for (const line of fs.readFileSync(path.join(outDir, f), "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const o = JSON.parse(line);
      if (o.skip || !o.ar || !o.tr || MAT.has(o.id)) continue;
      const row = [o.ar.trim(), o.tr.trim(), 0, 0]; const alt = (o.alt || []).map(x => x.trim()).filter(x => x && x !== row[1]);
      if (alt.length) row.push(alt);
      (w[o.id] = w[o.id] || []).push(keep.length); keep.push(row); added++;
    }
  }
  return { out: { s: keep, w }, added };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const p = path.join(root, "data/sentences.json");
  const { out, added } = mergeOwn(JSON.parse(fs.readFileSync(p, "utf8")));
  const { fmtJSON } = await import("../jsonfmt.mjs");
  fs.writeFileSync(p, fmtJSON(out));
  console.log(`kendi cümle: ${added}, toplam cümle: ${out.s.length}, örnekli kelime: ${Object.keys(out.w).length}`);
}
