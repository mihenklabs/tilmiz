// İçerik kontrol tablosu: ayet/hadis çevirileri, kelime anlamları, diyaloglar ve dersler.
// Hoca "Düzeltme" ve "Not" sütunlarını doldurur; content-import.mjs düzeltmeleri data/ dosyalarına geri yazar.
// Kullanım: npm run build && node tools/content-export.mjs [çıktı.xlsx]
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import { openApp, learnedState } from "../test/helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || path.join(root, "icerik-kontrol.xlsx");
const read = n => JSON.parse(fs.readFileSync(path.join(root, "data", n + ".json"), "utf8"));
const TX = read("texts"), DLG = read("dialogs"), TXS = read("texts-src");
const TXSI = Object.fromEntries(TXS.t.map(x => [x.i, x]));

const wb = new ExcelJS.Workbook();
wb.creator = "Tilmiz";
const AR = { name: "Amiri", size: 14 };
const EDIT = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D6" } };
function sheet(name, cols, rows, arCols, editCols) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map(([header, key, width]) => ({ header, key, width }));
  ws.getRow(1).font = { bold: true };
  rows.forEach(r => ws.addRow(r));
  ws.eachRow((row, i) => {
    if (i === 1) return;
    row.alignment = { wrapText: true, vertical: "top" };
    for (const k of arCols) { const c = row.getCell(k); c.font = AR; c.alignment = { wrapText: true, vertical: "top", horizontal: "right", readingOrder: "rtl" }; }
    for (const k of editCols) row.getCell(k).fill = EDIT;
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  return ws;
}

// Açıklama sayfası
const info = wb.addWorksheet("Okuyun");
[
  "Tilmiz içerik kontrol tablosu",
  "",
  "Sarı sütunlar size ait: yalnızca yanlış ya da daha iyi olabilecek yerlere yazın; doğru olanları boş bırakın.",
  "• “Düzeltme” sütunu: yerine geçmesini istediğiniz metnin tamamı (ör. yeni çeviri).",
  "• “Not” sütunu: açıklama, soru, kaynak.",
  "Gri sütunları ve “Kimlik” sütununu değiştirmeyin; düzeltmeler bu kimliklerle uygulamaya geri aktarılır.",
  "",
  "Sayfalar: Ayet-Hadis (kaynak çeviriler QuranEnc/HadeethEnc’den aynen alınır ve değiştirilemez; hatalı görürseniz Not sütununa yazın. Düzeltme sütunu sadeleştirilmiş anlatım içindir), Kelimeler (ayet/hadislerdeki kelime anlamları), Diyaloglar, Örnek cümleler (Tatoeba; uygunsuz ya da hatalı olanların “Kaldır” sütununa x koyun), Dersler (dil bilgisi anlatımı; örnek kelimeler rastgele seçildiği için yalnızca açıklama metinlerine bakın).",
].forEach(t => info.addRow([t]));
info.getColumn(1).width = 120; info.getRow(1).font = { bold: true, size: 14 };

// Ayet ve hadisler: metin düzeyi
const tRows = TX.map((t, i) => ({
  id: `tx:${i}`, kind: t.k === "a" ? "Ayet" : "Hadis", title: t.t, ref: t.ref,
  ar: t.v.map(([n, ws]) => ws.map(w => w[0]).join(" ") + (t.k === "a" && n ? ` (${n})` : "")).join(" "),
  src: TXSI[i] ? TXSI[i].tr + ` [${TXS.src[TXSI[i].s].name.split(" –")[0]}${TXSI[i].g ? "; " + TXSI[i].g : ""}]` : "(kaynakta yok)",
  tr: t.tr || "", sn: t.sn || "", fix: "", note: "",
}));
sheet("Ayet-Hadis", [["Kimlik", "id", 9], ["Tür", "kind", 7], ["Başlık", "title", 22], ["Kaynak", "ref", 22], ["Arapça", "ar", 60], ["Kaynak çeviri (değiştirilemez)", "src", 50], ["Sadeleştirilmiş anlatım", "tr", 50], ["Sıhhat notu", "sn", 25], ["Düzeltme (sadeleştirilmiş anlatım)", "fix", 45], ["Not", "note", 30]], tRows, ["ar"], ["fix", "note"]);

// Ayet ve hadislerdeki kelime kelime anlamlar
const wRows = [];
TX.forEach((t, i) => t.v.forEach(([n, ws], vi) => ws.forEach((w, wi) => wRows.push({ id: `tw:${i}:${vi}:${wi}`, title: t.t + (t.k === "a" && n ? ` ${n}` : ""), ar: w[0], tr: w[1], fix: "", note: "" }))));
sheet("Kelimeler", [["Kimlik", "id", 12], ["Metin", "title", 24], ["Arapça", "ar", 22], ["Mevcut anlam", "tr", 36], ["Düzeltme (yeni anlam)", "fix", 36], ["Not", "note", 30]], wRows, ["ar"], ["fix", "note"]);

// Diyaloglar
const dRows = [];
DLG.forEach(([title, lines], di) => lines.forEach(([ar, tr], li) => dRows.push({ id: `dl:${di}:${li}`, title, ar, tr, fixAr: "", fixTr: "", note: "" })));
sheet("Diyaloglar", [["Kimlik", "id", 9], ["Diyalog", "title", 18], ["Arapça", "ar", 45], ["Türkçe", "tr", 40], ["Düzeltme: Arapça", "fixAr", 40], ["Düzeltme: Türkçe", "fixTr", 36], ["Not", "note", 30]], dRows, ["ar", "fixAr"], ["fixAr", "fixTr", "note"]);

// Tatoeba örnek cümleleri: 7+ yaşa uygun olmayan ya da hatalı olanlar işaretlenir
const SN = read("sentences"), Wd = read("words"), used = {};
for (const [id, ks] of Object.entries(SN.w)) for (const k of ks) (used[k] = used[k] || []).push(Wd[id][0]);
const sRows = SN.s.map((s, k) => ({ id: "sn:" + s[2], ar: s[0], tr: s[1], words: (used[k] || []).join("، "), del: "", note: "" })).filter((r, k) => used[k]);
sheet("Örnek cümleler", [["Kimlik", "id", 12], ["Arapça", "ar", 45], ["Türkçe", "tr", 45], ["Hangi kelimelerde", "words", 22], ["Kaldır (x)", "del", 10], ["Not", "note", 30]], sRows, ["ar", "words"], ["del", "note"]);

// Dersler: uygulamada gösterilen metin (jsdom ile)
const order = read("order");
const a = openApp({ state: learnedState(order.slice(0, 1500), 5) });
const lessons = JSON.parse(a.ev("JSON.stringify(LESSONS.map(L => ({ id: L.id, t: L.t, lv: L.lv || '' })))"));
const lRows = [];
lessons.forEach((L, k) => {
  a.ev(`pv = { mode: "lesson", k: ${k} }; gq = null; practice();`);
  const n = a.ev("pv.steps.length + 1");
  for (let s = 0; s < n; s++) {
    a.ev(`pv.step = ${s}; practice();`);
    const txt = a.$(".lesson.step").textContent.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    lRows.push({ id: `ls:${L.id}:${s}`, title: `${k + 1}. ${L.t}`, lv: L.lv, step: s === n - 1 ? "Özet kural" : `Adım ${s + 1}`, text: txt, fix: "", note: "" });
  }
});
a.close();
sheet("Dersler", [["Kimlik", "id", 14], ["Ders", "title", 24], ["Seviye", "lv", 7], ["Bölüm", "step", 10], ["Uygulamadaki metin", "text", 80], ["Düzeltme önerisi", "fix", 50], ["Not", "note", 30]], lRows, [], ["fix", "note"]);

await wb.xlsx.writeFile(out);
console.log(`${out}: ${tRows.length} metin, ${wRows.length} kelime, ${dRows.length} diyalog satırı, ${lRows.length} ders bölümü`);
