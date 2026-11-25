// Tek seferlik: eski tek dosyalık elifba-kelime.html'i src/ + data/ olarak ayırır.
// Kullanım: node tools/split.mjs eski.html
import fs from "node:fs";
import path from "node:path";
import { fmtJSON } from "./jsonfmt.mjs";

const src = process.argv[2];
if (!src) { console.error("kullanım: node tools/split.mjs eski.html"); process.exit(1); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const html = fs.readFileSync(src, "utf8");

const styleM = html.match(/<style>\n([\s\S]*?)<\/style>\n/);
const css = styleM[1];
const dataRe = /<script type="application\/json" id="([a-z]+)">([\s\S]*?)<\/script>\n/g;
const data = {};
for (const m of html.matchAll(dataRe)) data[m[1]] = JSON.parse(m[2]);
const appM = html.match(/<script>\n([\s\S]*?)<\/script>\n<\/body>/);
let js = appM[1];
js = js.replace(/JSON\.parse\(document\.getElementById\("([a-z]+)"\)\.textContent\)/g, 'DATA("$1")');
const loader = `// Veri: tek dosya sürümünde <script type="application/json"> etiketlerinden, site sürümünde önceden indirilen JSON'lardan okunur.
const DATA = id => { const D = window.__ELIFBA_DATA; if (D && D[id] !== undefined) return D[id]; return JSON.parse(document.getElementById(id).textContent); };
`;
js = js.replace('"use strict";\n', '"use strict";\n' + loader);

let tpl = html.slice(0, styleM.index) + "<!-- @head -->\n" + html.slice(styleM.index + styleM[0].length);
const firstData = tpl.search(/<script type="application\/json"/);
tpl = tpl.replace(dataRe, "");
tpl = tpl.replace(/<script>\n[\s\S]*?<\/script>\n<\/body>/, "<!-- @scripts -->\n</body>");
void firstData;

fs.mkdirSync(path.join(root, "src"), { recursive: true });
fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(path.join(root, "src/index.html"), tpl);
fs.writeFileSync(path.join(root, "src/style.css"), css);
fs.writeFileSync(path.join(root, "src/app.js"), js);
const order = Object.keys(data);
for (const k of order) fs.writeFileSync(path.join(root, "data", k + ".json"), fmtJSON(data[k]));
fs.writeFileSync(path.join(root, "data/_order.json"), JSON.stringify(order) + "\n");
console.log("ayrıldı:", order.join(", "));
