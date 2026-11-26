// Bubblewrap çekirdeğiyle TWA projesini dist/twa/twa-manifest.json'dan üretir ve hatırlatma kodunu ekler.
// Kullanım (tools/android içinde bir kez `npm install`):
//   node tools/android/generate.mjs <hedef-klasör> [simge-adresi-kökü]
// Site henüz yayında değilse simgeler yerel sunucudan alınır: önce `npm run serve` (localhost:8080),
// ikinci argüman http://localhost:8080/ . Yayından sonra argümansız çalıştır.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TwaGenerator, TwaManifest, ConsoleLog } from "@bubblewrap/core";
import { integrate } from "./integrate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const [,, outArg, iconBase] = process.argv;
if (!outArg) { console.error("Kullanım: node tools/android/generate.mjs <hedef-klasör> [http://localhost:8080/]"); process.exit(1); }
const outDir = path.resolve(outArg);
const manifestPath = path.join(root, "dist/twa/twa-manifest.json");
const original = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const json = { ...original };
if (iconBase) for (const k of ["iconUrl", "maskableIconUrl", "monochromeIconUrl", "webManifestUrl"]) json[k] = json[k].replace(/^https:\/\/[^/]+\/[^/]+\//, iconBase);

fs.mkdirSync(outDir, { recursive: true });
await new TwaGenerator().createTwaProject(outDir, new TwaManifest(json), new ConsoleLog("bubblewrap"));
fs.writeFileSync(path.join(outDir, "twa-manifest.json"), JSON.stringify(original, null, 2));
if (iconBase) { // web manifest adresi projeye gerçek adresiyle yazılsın
  const g = path.join(outDir, "app/build.gradle");
  fs.writeFileSync(g, fs.readFileSync(g, "utf8").replace(json.webManifestUrl, original.webManifestUrl));
}
integrate(outDir);
console.log("Proje hazır:", outDir);
