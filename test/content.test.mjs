// İçerik kontrol tablosu: dışa aktar → düzeltme yaz → içe aktar (deneme kipinde)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ExcelJS from "exceljs";
import { root } from "./helpers.mjs";

test("tablo üretilir ve düzeltmeler doğru kimlikle okunur", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tilmiz-"));
  const f = path.join(dir, "k.xlsx");
  execFileSync(process.execPath, [path.join(root, "tools/content-export.mjs"), f]);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(f);
  assert.deepEqual(wb.worksheets.map(w => w.name), ["Okuyun", "Ayet-Hadis", "Kelimeler", "Diyaloglar", "Örnek cümleler", "Dersler"]);
  assert.equal(wb.getWorksheet("Ayet-Hadis").rowCount, 72);
  wb.getWorksheet("Ayet-Hadis").getRow(2).getCell(7).value = "YENİ ÇEVİRİ";
  wb.getWorksheet("Diyaloglar").getRow(3).getCell(6).value = "Yeni Türkçe";
  wb.getWorksheet("Dersler").getRow(2).getCell(7).value = "bir not";
  await wb.xlsx.writeFile(f);
  const out = execFileSync(process.execPath, [path.join(root, "tools/content-import.mjs"), f, "--dry"], { encoding: "utf8" });
  assert.match(out, /çeviri tx:0: .* → "YENİ ÇEVİRİ"/);
  assert.match(out, /diyalog dl:0:1 Türkçe: .* → "Yeni Türkçe"/);
  assert.match(out, /2 düzeltme, 1 not/);
  fs.rmSync(dir, { recursive: true, force: true });
});
