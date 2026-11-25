// @fontsource paketlerinden yalnızca gereken yazı tipi dosyalarını src/fonts'a kopyalar ve fonts.css üretir.
// Kullanım: node tools/fonts.mjs  (npm install sonrası, yazı tipi değiştiğinde bir kez)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src/fonts");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const want = { amiri: { weights: [400, 700], subsets: ["arabic", "latin", "latin-ext"] }, rubik: { weights: [400, 500, 700], subsets: ["latin", "latin-ext"] } };
let css = "";
for (const [fam, { weights, subsets }] of Object.entries(want)) {
  const dir = path.join(root, "node_modules/@fontsource", fam);
  for (const w of weights) {
    const src = fs.readFileSync(path.join(dir, `${w}.css`), "utf8");
    for (const block of src.match(/@font-face \{[\s\S]*?\}/g)) {
      const file = block.match(/files\/([^)]+\.woff2)/)[1];
      const subset = file.replace(`${fam}-`, "").replace(`-${w}-normal.woff2`, "");
      if (!subsets.includes(subset)) continue;
      fs.copyFileSync(path.join(dir, "files", file), path.join(out, file));
      css += block.replace(/src: [^;]+;/, `src: url(fonts/${file}) format('woff2');`) + "\n";
    }
  }
  fs.copyFileSync(path.join(dir, "LICENSE"), path.join(out, `${fam}-OFL.txt`));
}
fs.writeFileSync(path.join(out, "fonts.css"), css);
console.log(fs.readdirSync(out).join("\n"));
