// Veri dosyalarını git'te satır satır izlenebilir (diff'i okunur) biçimde yazar:
// her kayıt kendi satırında. Derleme sırasında tekrar sıkıştırılır.
const SMALL = 160;
function fmt(v, ind) {
  const s = JSON.stringify(v);
  if (s.length <= SMALL || v === null || typeof v !== "object") return s;
  const pad = "  ".repeat(ind + 1), end = "  ".repeat(ind);
  if (Array.isArray(v)) {
    // kayıt dizisi: her eleman tek satır
    return "[\n" + v.map(x => pad + JSON.stringify(x)).join(",\n") + "\n" + end + "]";
  }
  const keys = Object.keys(v);
  const flat = keys.every(k => JSON.stringify(v[k]).length <= SMALL * 4);
  return "{\n" + keys.map(k => pad + JSON.stringify(k) + ":" + (flat ? JSON.stringify(v[k]) : fmt(v[k], ind + 1))).join(",\n") + "\n" + end + "}";
}
export const fmtJSON = v => fmt(v, 0) + "\n";
