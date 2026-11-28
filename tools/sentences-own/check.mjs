// Örnek cümle dilimlerini denetler: JSON, kimlik sırası, hareke oranı, kelimenin cümlede geçmesi, 7+ filtre.
// Kullanım: node tools/sentences-own/check.mjs [01 02 ...]   (boşsa out/ altındaki hepsi)
import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const strip = s => s.replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
const letters = s => strip(s).replace(/[^ء-ي]/g, "");
const BAD = /(^|\s)(öldür|intihar|şarap|bira(?![a-zçğıöşü])|sarhoş|seks|sevgili|silah|kan\s|savaş|tabanca|bomba|kumar|sigara|uyuşturucu)/i;
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(dir, "out")).filter(f => f.endsWith(".jsonl")).map(f => f.slice(0, 2));
let total = 0, skip = 0; const prob = [];
for (const id of ids) {
  const inp = JSON.parse(fs.readFileSync(path.join(dir, "in", id + ".json"), "utf8"));
  const lines = fs.readFileSync(path.join(dir, "out", id + ".jsonl"), "utf8").trim().split(/\r?\n/);
  if (lines.length !== inp.length) prob.push(`${id}: satır ${lines.length} ≠ ${inp.length}`);
  lines.forEach((l, k) => {
    let o; try { o = JSON.parse(l); } catch (e) { prob.push(`${id}:${k + 1} JSON hatası`); return; }
    const w = inp[k]; total++;
    if (!w || o.id !== w.id) { prob.push(`${id}:${k + 1} kimlik ${o.id} ≠ ${w && w.id}`); return; }
    if (o.skip) { skip++; return; }
    if (!o.ar || !o.tr) { prob.push(`${id}:${k + 1} eksik alan`); return; }
    const L = letters(o.ar).length, H = (o.ar.match(/[ً-ْ]/g) || []).length;
    if (L && H / L < 0.6) prob.push(`${id}:${k + 1} hareke az (${H}/${L}): ${o.ar}`);
    // kökün harflerinden en az 2'si sırayla geçmeli (çekimli biçimler için gevşek ölçüt)
    const root = letters(w.ar).replace(/^ال/, "").replace(/[اوي]/g, ""), sent = letters(o.ar);
    let j = 0; for (const ch of sent) if (ch === root[j]) j++;
    if (root.length >= 2 && j < Math.min(root.length, 3) && !sent.includes(letters(w.ar))) prob.push(`${id}:${k + 1} kelime geçmiyor olabilir: ${w.ar} → ${o.ar}`);
    for (const t of [o.tr, ...(o.alt || [])]) if (BAD.test(t.toLocaleLowerCase("tr"))) prob.push(`${id}:${k + 1} içerik: ${t}`);
    const wc = o.ar.trim().split(/\s+/).length; if (wc > 14) prob.push(`${id}:${k + 1} uzun (${wc} kelime)`);
  });
}
console.log(`toplam ${total}, atlanan ${skip}, sorun ${prob.length}`);
console.log(prob.slice(0, 60).join("\n"));
