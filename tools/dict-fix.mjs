// Sözlük düzeltmelerini uygular: tools/dict-fixes/*.json → data/words.json
// Her dosya: [{ "id": 123, "from": "<şu anki harekeli Arapça>", "set": { "ar"?, "okunus"?, "tr"?, "en"?, "tur"?, "ek"? }, "why": "kısa gerekçe" }]
// Güvenlik: kayıt "from" ile birebir eşleşmiyorsa (zaten düzeltilmiş ya da kaymış) atlanır. Yeni Arapça biçim sözlükte başka bir
// kayıtta zaten varsa ar değişikliği yapılmaz (tekrar kelime oluşmasın) ve uyarı verilir. Tekrar çalıştırmak güvenlidir.
// Kullanım: node tools/dict-fix.mjs [--dry]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");
const wp = path.join(root, "data/words.json");
const W = JSON.parse(fs.readFileSync(wp, "utf8"));
const F = ["ar", "okunus", "tr", "en", "tur", "ek"];
const dir = path.join(root, "tools/dict-fixes");
let ok = 0, already = 0, skip = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
  for (const x of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
    const w = W[x.id];
    if (!w) { console.log(`${f}: ${x.id} yok`); skip++; continue; }
    const target = F.map((k, i) => (x.set && k in x.set) ? x.set[k] : w[i]);
    if (JSON.stringify(target) === JSON.stringify(w)) { already++; continue; }
    if (w[0] !== x.from) { console.log(`${f}: ${x.id} eşleşmiyor (şu an ${w[0]}, beklenen ${x.from})`); skip++; continue; }
    if (x.set && x.set.ar && x.set.ar !== w[0] && W.some((v, i) => i !== x.id && v[0] === x.set.ar)) { console.log(`${f}: ${x.id} ${x.set.ar} zaten başka kayıtta; ar değiştirilmedi`); target[0] = w[0]; }
    W[x.id] = target; ok++;
  }
}
console.log(`uygulanan ${ok}, zaten uygulanmış ${already}, atlanan ${skip}`);
const { fmtJSON } = await import("./jsonfmt.mjs");
if (!dry && ok) fs.writeFileSync(wp, fmtJSON(W));
