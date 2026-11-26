"""Eğitilen Tilmiz sesiyle uygulamanın ses paketini üretir (kelimeler, diyalog satırları, ayet/hadis parçaları).

1) Kontrol noktasını ONNX'e çevir:
   python -m piper.train.export_onnx --checkpoint <ckpt> --output-file D:/tts-egitim/out/ar_tilmiz-medium.onnx
2) Ses paketi:
   python tools/tts/synth_pack.py D:/tts-egitim/out/ar_tilmiz-medium.onnx dist/voice [--limit 50]

Çıktı: <out>/a/<ilk2>/<sha1-12>.ogg (Opus, 24 kHz mono, ~24 kbps) ve <out>/index.json {metin: dosya}.
Metin anahtarı uygulamadaki speak() ile aynı normalleştirilir (boşluklar tekleştirilir).
Atıf: ses ClArTTS (CC BY 4.0) ile eğitildi.
"""
import argparse
import hashlib
import json
import os
import re
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load(name):
    with open(os.path.join(ROOT, "data", name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def norm(t):
    return re.sub(r"\s+", " ", t).strip()


def texts():
    out = []
    words = load("words")
    mat = set(load("mat"))
    for i, w in enumerate(words):
        if i not in mat and w[0]:
            out.append(w[0])
    for _, lines in load("dialogs"):
        out += [l[0] for l in lines]
    for t in load("texts"):
        if t.get("hid"):
            continue
        for _, it in t["v"]:
            out += [x[0] for x in it]
            for i in range(0, len(it), 6):
                out.append(" ".join(x[0] for x in it[i:i + 6]))
    seen, uniq = set(), []
    for t in map(norm, out):
        if t and t not in seen:
            seen.add(t)
            uniq.append(t)
    return uniq


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model")
    ap.add_argument("out")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--length-scale", type=float, default=1.1)  # biraz yavaş: öğrenciler için
    a = ap.parse_args()

    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(a.model)
    cfg = SynthesisConfig(length_scale=a.length_scale)
    sr = voice.config.sample_rate
    items = texts()
    if a.limit:
        items = items[: a.limit]
    index = {}
    os.makedirs(a.out, exist_ok=True)
    for n, t in enumerate(items):
        h = hashlib.sha1(t.encode("utf-8")).hexdigest()[:12]
        rel = f"a/{h[:2]}/{h}.ogg"
        dst = os.path.join(a.out, rel)
        index[t] = rel
        if os.path.exists(dst):
            continue
        audio = np.concatenate([c.audio_float_array for c in voice.synthesize(t, syn_config=cfg)])
        y = resample_poly(audio, 24000 // 150, sr // 150) if sr == 22050 else audio
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        sf.write(dst, y.astype(np.float32), 24000, format="OGG", subtype="OPUS")
        if n % 500 == 0:
            print(f"{n}/{len(items)}", flush=True)
    with open(os.path.join(a.out, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Bitti: {len(index)} ses", file=sys.stderr)


if __name__ == "__main__":
    main()
