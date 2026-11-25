// Tatoeba Arapça–Türkçe cümle çiftlerinden data/sentences.json üretir (lisans: CC BY 2.0 FR, tatoeba.org).
// Kullanım: node tools/tatoeba.mjs <klasör>   (klasörde ara_sentences.tsv, tur_sentences.tsv, ara-tur_links.tsv)
// İndirme: https://downloads.tatoeba.org/exports/per_language/{ara/ara_sentences,tur/tur_sentences,ara/ara-tur_links}.tsv.bz2
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { fmtJSON } from "./jsonfmt.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2];
if (!dir) { console.error("kullanım: node tools/tatoeba.mjs <klasör>"); process.exit(1); }

const links = fs.readFileSync(path.join(dir, "ara-tur_links.tsv"), "utf8").trim().split("\n").map(l => l.split("\t").map(Number));
const need = new Set(links.flat());
async function load(f) {
  const m = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, f), "utf8"), crlfDelay: Infinity });
  for await (const line of rl) { const [id, , text] = line.split("\t"); if (need.has(+id)) m.set(+id, text.trim()); }
  return m;
}
const AR = await load("ara_sentences.tsv"), TR = await load("tur_sentences.tsv");

// Uygulamadaki arNorm ile aynı normalleştirme
const bare = s => s.replace(/[ً-ْٰـ]/g, "");
const arNorm = s => bare(String(s)).replace(/[ۖ-ۭٕٓٔ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء").replace(/\s+/g, " ").trim();
const W = JSON.parse(fs.readFileSync(path.join(root, "data/words.json"), "utf8"));
const ORDER = JSON.parse(fs.readFileSync(path.join(root, "data/order.json"), "utf8"));
const MAT = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/mat.json"), "utf8")));
const POSI = []; ORDER.forEach((id, p) => { POSI[id] = p; });

// Biçim → en sık kullanılan kelime (aynı yazılışlı kelimelerde yanlış eşleşmeyi azaltmak için yalnızca en sık olana bağlanır)
const FORM = new Map();
W.forEach((w, i) => {
  if (MAT.has(i) || w[4] === "phrase") return;
  for (const f of [w[0], w[5]].filter(Boolean).flatMap(x => x.split(/[،,/]/))) {
    const n = arNorm(f); if (!n || n.includes(" ") || n.length < 2) continue;
    const cur = FORM.get(n); if (cur === undefined || POSI[i] < POSI[cur]) FORM.set(n, i);
  }
});
const PRE = ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ل", "ك"];
function wordsIn(sentence) {
  const ids = new Set();
  for (const raw of arNorm(sentence).replace(/[^ء-ي ]/g, " ").split(" ").filter(Boolean)) {
    const cands = [raw];
    for (const p of PRE) if (raw.startsWith(p) && raw.length - p.length >= 2) cands.push(raw.slice(p.length));
    for (const c of [...cands]) if (c.startsWith("ال") && c.length > 3) cands.push(c.slice(2));
    for (const c of cands) { const id = FORM.get(c); if (id !== undefined) { ids.add(id); break; } }
  }
  return ids;
}

// Arapça cümle başına bir kayıt; birden çok Türkçe çeviri varsa en kısası
const byAr = new Map();
for (const [a, t] of links) {
  const ar = AR.get(a), tr = TR.get(t); if (!ar || !tr) continue;
  const cur = byAr.get(a); if (!cur || tr.length < cur[1].length) byAr.set(a, [ar, tr, a, t]);
}
// 7+ yaş: gizli kelimeleri içeren ya da uygunsuz konulu cümleler alınmaz; data/sentences-blocked.json elle/hoca tablosundan gelen çıkarmalar
const MATFORM = new Set(); for (const i of MAT) for (const f of [W[i][0], W[i][5]].filter(Boolean)) MATFORM.add(arNorm(f));
const hasMat = ar => arNorm(ar).replace(/[^ء-ي ]/g, " ").split(" ").some(t => MATFORM.has(t) || PRE.some(p => t.startsWith(p) && MATFORM.has(t.slice(p.length))));
const BAD_RE = /(^|[^a-zçğıöşüâîû])(öl[üdmeaıs]|intihar|cinay|katil|öldür|silah|tabanca|bıçakla|kanlı|seks|çıplak|öpüş|öptü|sevgili|aşık|şarap|bira|içki|sarhoş|alkol|uyuşturucu|sigara|kumar|hapis|tecavüz|savaş|bomba|terör|nefret|aptal|salak|lanet|cehennem|intikam|vur(du|acağ)|dövdü)/;
const BAD_TR = { test: s => BAD_RE.test(s.toLocaleLowerCase("tr")) };
let blocked = new Set();
const bf = path.join(root, "data/sentences-blocked.json");
if (fs.existsSync(bf)) blocked = new Set(JSON.parse(fs.readFileSync(bf, "utf8")));
const S = [...byAr.values()].filter(([ar, tr, a]) => ar.length <= 120 && !hasMat(ar) && !BAD_TR.test(tr) && !blocked.has(a)).sort((x, y) => x[0].length - y[0].length);
const idx = {};
S.forEach((s, k) => { for (const id of wordsIn(s[0])) (idx[id] = idx[id] || []).push(k); });
for (const k in idx) idx[k] = idx[k].slice(0, 6); // kısa cümleler önce
fs.writeFileSync(path.join(root, "data/sentences.json"), fmtJSON({ src: "Tatoeba (tatoeba.org), CC BY 2.0 FR", s: S, w: idx }));
const covered = Object.keys(idx).length;
console.log(`${S.length} cümle çifti, ${covered} kelimede en az bir örnek`);
