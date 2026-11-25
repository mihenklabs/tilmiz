// Hocanın doldurduğu içerik kontrol tablosundaki düzeltmeleri data/ dosyalarına uygular.
// Ayet-hadis çevirileri, kelime anlamları ve diyaloglar otomatik; ders önerileri ve tüm notlar
// docs/icerik-notlari.md dosyasına yazılır (kod içindeki ders metinleri elle düzenlenir).
// Kullanım: node tools/content-import.mjs doldurulmus.xlsx [--dry]
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import { fmtJSON } from "./jsonfmt.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2], dry = process.argv.includes("--dry");
if (!file) { console.error("kullanım: node tools/content-import.mjs dosya.xlsx [--dry]"); process.exit(1); }
const dp = n => path.join(root, "data", n + ".json");
const TX = JSON.parse(fs.readFileSync(dp("texts"), "utf8")), DLG = JSON.parse(fs.readFileSync(dp("dialogs"), "utf8"));

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const val = c => { const v = c && c.value; if (v == null) return ""; if (typeof v === "object" && v.richText) return v.richText.map(r => r.text).join(""); if (typeof v === "object" && v.text) return v.text; return String(v); };
function rows(name) {
  const ws = wb.getWorksheet(name); if (!ws) return [];
  const head = []; ws.getRow(1).eachCell((c, i) => { head[i] = val(c); });
  const out = [];
  ws.eachRow((r, i) => { if (i === 1) return; const o = {}; head.forEach((h, j) => { if (h) o[h] = val(r.getCell(j)).trim(); }); out.push(o); });
  return out;
}

const changes = [], notes = [];
const note = (sheet, r, extra) => { if (r["Not"] || extra) notes.push(`- **${sheet} ${r["Kimlik"]}** (${r["Başlık"] || r["Metin"] || r["Diyalog"] || r["Ders"] || ""})${extra ? ": " + extra : ""}${r["Not"] ? " — Not: " + r["Not"] : ""}`); };

for (const r of rows("Ayet-Hadis")) {
  const [, i] = r["Kimlik"].split(":"), t = TX[+i]; if (!t) continue;
  const fix = r["Düzeltme (yeni çeviri)"];
  if (fix && fix !== t.tr) { changes.push(`çeviri ${r["Kimlik"]}: "${t.tr}" → "${fix}"`); t.tr = fix; }
  note("Ayet-Hadis", r);
}
for (const r of rows("Kelimeler")) {
  const [, i, vi, wi] = r["Kimlik"].split(":").map(Number), w = TX[i] && TX[i].v[vi] && TX[i].v[vi][1][wi]; if (!w) continue;
  const fix = r["Düzeltme (yeni anlam)"];
  if (fix && fix !== w[1]) { changes.push(`kelime ${r["Kimlik"]} ${w[0]}: "${w[1]}" → "${fix}"`); w[1] = fix; }
  note("Kelimeler", r);
}
for (const r of rows("Diyaloglar")) {
  const [, di, li] = r["Kimlik"].split(":").map(Number), l = DLG[di] && DLG[di][1][li]; if (!l) continue;
  const fa = r["Düzeltme: Arapça"], ft = r["Düzeltme: Türkçe"];
  if (fa && fa !== l[0]) { changes.push(`diyalog ${r["Kimlik"]} Arapça: "${l[0]}" → "${fa}"`); l[0] = fa; }
  if (ft && ft !== l[1]) { changes.push(`diyalog ${r["Kimlik"]} Türkçe: "${l[1]}" → "${ft}"`); l[1] = ft; }
  note("Diyaloglar", r);
}
const blockedF = dp("sentences-blocked"), blocked = new Set(JSON.parse(fs.readFileSync(blockedF, "utf8")));
for (const r of rows("Örnek cümleler")) {
  const id = +r["Kimlik"].split(":")[1];
  if (/x/i.test(r["Kaldır (x)"] || "") && !blocked.has(id)) { blocked.add(id); changes.push("örnek cümle kaldırıldı: " + r["Arapça"]); }
  note("Örnek cümleler", r);
}
for (const r of rows("Dersler")) { if (r["Düzeltme önerisi"] || r["Not"]) note("Dersler", r, r["Düzeltme önerisi"] ? "Öneri: " + r["Düzeltme önerisi"] : ""); }

console.log(changes.length ? changes.join("\n") : "Otomatik uygulanacak düzeltme yok.");
console.log(`\n${changes.length} düzeltme, ${notes.length} not/öneri.`);
if (dry) process.exit(0);
fs.writeFileSync(dp("texts"), fmtJSON(TX));
fs.writeFileSync(dp("dialogs"), fmtJSON(DLG));
fs.writeFileSync(blockedF, JSON.stringify([...blocked].sort((a, b) => a - b)) + "\n");
if (blocked.size) console.log("Kaldırılan cümleler data/sentences-blocked.json'a yazıldı; uygulamak için: node tools/tatoeba.mjs <tatoeba klasörü>");
if (notes.length) {
  const f = path.join(root, "docs/icerik-notlari.md");
  const head = fs.existsSync(f) ? "" : "# Hoca notları ve ders önerileri\n\nDers metinleri kodda (src/app.js, LESSONS ve SUMS) olduğu için bu öneriler elle uygulanır.\n";
  fs.appendFileSync(f, head + `\n## ${new Date().toISOString().slice(0, 10)} – ${path.basename(file)}\n\n${notes.join("\n")}\n`);
  console.log("Notlar: docs/icerik-notlari.md");
}
