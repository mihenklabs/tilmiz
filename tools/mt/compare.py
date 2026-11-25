"""Açık kaynak Ar<->Tr çeviri modellerini uygulamanın diyalog cümleleri ve ayet/hadislerle dener.
Kullanım: .venv-tts/Scripts/python.exe tools/mt/compare.py  → samples/ceviri-karsilastirma.md
"""
import json
import time
from pathlib import Path

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".venv-tts" / "voices" / "hf"
dlg = json.loads((ROOT / "data/dialogs.json").read_text(encoding="utf-8"))
tx = json.loads((ROOT / "data/texts.json").read_text(encoding="utf-8"))

pairs = [l for _, lines in dlg for l in lines][::3][:14]  # [ar, tr]
hadis = [t for t in tx if t["k"] == "h"][:4]
for t in hadis:
    pairs.append([" ".join(w[0] for _, ws in t["v"] for w in ws), t["tr"]])
torch.set_num_threads(4)


def run(name, src_lang, tgt_lang, texts):
    tok = AutoTokenizer.from_pretrained(name, cache_dir=str(CACHE))
    m = AutoModelForSeq2SeqLM.from_pretrained(name, cache_dir=str(CACHE)).eval()
    params = sum(p.numel() for p in m.parameters())
    kw = {}
    if "m2m100" in name:
        tok.src_lang = src_lang
        kw["forced_bos_token_id"] = tok.get_lang_id(tgt_lang)
    out, t0 = [], time.time()
    for s in texts:
        with torch.no_grad():
            g = m.generate(**tok(s, return_tensors="pt"), max_new_tokens=80, num_beams=2, **kw)
        out.append(tok.decode(g[0], skip_special_tokens=True))
    return out, (time.time() - t0) / len(texts), params


ar = [p[0] for p in pairs]
tr = [p[1] for p in pairs]
res = {}
for label, name, s, t, src in [
    ("Opus-MT ar→tr", "Helsinki-NLP/opus-mt-ar-tr", "ar", "tr", ar),
    ("M2M100-418M ar→tr", "facebook/m2m100_418M", "ar", "tr", ar),
    ("Opus-MT tr→ar", "Helsinki-NLP/opus-mt-tr-ar", "tr", "ar", tr),
    ("M2M100-418M tr→ar", "facebook/m2m100_418M", "tr", "ar", tr),
]:
    o, sec, n = run(name, s, t, src)
    res[label] = (o, sec, n)
    print(label, f"{n/1e6:.0f}M parametre, cümle başı {sec:.2f} sn (masaüstü CPU)")

md = ["# Ar↔Tr çeviri modeli karşılaştırması\n"]
for label, (o, sec, n) in res.items():
    md.append(f"- **{label}**: {n/1e6:.0f}M parametre (fp32 ≈ {n*4/1e6:.0f} MB, int8 ≈ {n/1e6:.0f} MB), cümle başı {sec:.2f} sn (masaüstü CPU)")
md.append("\n## Arapça → Türkçe\n\n| Arapça | Uygulamadaki çeviri | Opus-MT | M2M100 |\n|---|---|---|---|")
for i, (a, t) in enumerate(pairs):
    md.append(f"| {a} | {t} | {res['Opus-MT ar→tr'][0][i]} | {res['M2M100-418M ar→tr'][0][i]} |")
md.append("\n## Türkçe → Arapça\n\n| Türkçe | Uygulamadaki Arapça | Opus-MT | M2M100 |\n|---|---|---|---|")
for i, (a, t) in enumerate(pairs):
    md.append(f"| {t} | {a} | {res['Opus-MT tr→ar'][0][i]} | {res['M2M100-418M tr→ar'][0][i]} |")
f = ROOT / "samples" / "ceviri-karsilastirma.md"
f.write_text("\n".join(md) + "\n", encoding="utf-8")
print(f)
