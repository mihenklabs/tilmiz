"""Eğitilen Tilmiz sesiyle indirilebilir ses paketlerini üretir (uygulamada Ayarlar → Ses paketleri).

1) Kontrol noktasını ONNX'e çevir:
   python -m piper.train.export_onnx --checkpoint <ckpt> --output-file D:/tts-egitim/out/ar_tilmiz-medium.onnx
2) Paketler:
   python tools/tts/synth_pack.py D:/tts-egitim/out/ar_tilmiz-medium.onnx dist/ses [--limit 50] [--only kelime]

Çıktı (aynı kökenden sunulmalı: <kullanıcı>.github.io/tilmiz-ses/):
  packs.json                      [{id,title,desc,ver,size,index,parts}]
  <paket>/index.<ver>.json        {"metin": [parça, bayt_başı, uzunluk]}
  <paket>/p<n>.<ver>.bin          art arda Ogg Opus dosyaları (her parça ≤ 20 MB)
Paketler: kelime (sözlükteki kelimeler), cumle (örnek cümleler, diyaloglar, ayet/hadis parçaları).
Metin anahtarı uygulamadaki sesKey() ile aynı: boşluklar tekleştirilir. Ara dosyalar <out>/_cache altında saklanır (yeniden çalıştırmak hızlı).
Atıf: ses ClArTTS (CC BY 4.0) ile eğitildi.
"""
import argparse
import hashlib
import io
import json
import os
import re
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PART_MAX = 20 * 1024 * 1024


def load(name):
    with open(os.path.join(ROOT, "data", name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def norm(t):
    return re.sub(r"\s+", " ", t).strip()


def uniq(items):
    seen, out = set(), []
    for t in map(norm, items):
        if t and t not in seen:
            seen.add(t)
            out.append(t)
    return out


def pack_texts():
    words = load("words")
    mat = set(load("mat"))
    kelime = [w[0] for i, w in enumerate(words) if i not in mat and w[0]]
    cumle = [s[0] for s in load("sentences")["s"]]
    for _, lines in load("dialogs"):
        cumle += [l[0] for l in lines]
    for t in load("texts"):
        if t.get("hid"):
            continue
        for _, it in t["v"]:
            cumle += [x[0] for x in it]
            for i in range(0, len(it), 6):
                cumle.append(" ".join(x[0] for x in it[i:i + 6]))
    return {
        "kelime": ("Kelime sesleri", "Sözlükteki bütün kelimeler", uniq(kelime)),
        "cumle": ("Cümle sesleri", "Örnek cümleler, diyaloglar, ayet ve hadisler", uniq(cumle)),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model")
    ap.add_argument("out")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--length-scale", type=float, default=1.1)  # biraz yavaş: öğrenciler için
    a = ap.parse_args()

    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(a.model)
    cfg = SynthesisConfig(length_scale=a.length_scale)
    sr = voice.config.sample_rate
    cache = os.path.join(a.out, "_cache")
    os.makedirs(cache, exist_ok=True)
    manifest_path = os.path.join(a.out, "packs.json")
    manifest = json.load(open(manifest_path, encoding="utf-8")) if os.path.exists(manifest_path) else []

    for pid, (title, desc, items) in pack_texts().items():
        if a.only and pid != a.only:
            continue
        if a.limit:
            items = items[: a.limit]
        blobs = []
        for n, t in enumerate(items):
            h = hashlib.sha1(t.encode("utf-8")).hexdigest()[:16]
            cp = os.path.join(cache, h[:2], h + ".ogg")
            if not os.path.exists(cp):
                audio = np.concatenate([c.audio_float_array for c in voice.synthesize(t, syn_config=cfg)])
                y = resample_poly(audio, 24000 // 150, sr // 150) if sr == 22050 else audio
                os.makedirs(os.path.dirname(cp), exist_ok=True)
                sf.write(cp, y.astype(np.float32), 24000, format="OGG", subtype="OPUS")
            blobs.append((t, open(cp, "rb").read()))
            if n % 500 == 0:
                print(f"{pid}: {n}/{len(items)}", flush=True)
        ver = hashlib.sha1(b"".join(b for _, b in blobs)).hexdigest()[:8]
        os.makedirs(os.path.join(a.out, pid), exist_ok=True)
        index, parts, cur, pi, size = {}, [], io.BytesIO(), 0, 0

        def flush():
            nonlocal cur, pi
            name = f"{pid}/p{pi}.{ver}.bin"
            open(os.path.join(a.out, name), "wb").write(cur.getvalue())
            parts.append(name)
            cur, pi = io.BytesIO(), pi + 1

        for t, b in blobs:
            if cur.tell() and cur.tell() + len(b) > PART_MAX:
                flush()
            index[t] = [pi, cur.tell(), len(b)]
            cur.write(b)
            size += len(b)
        flush()
        idx_name = f"{pid}/index.{ver}.json"
        data = json.dumps(index, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        open(os.path.join(a.out, idx_name), "wb").write(data)
        manifest = [m for m in manifest if m["id"] != pid] + [
            {"id": pid, "title": title, "desc": f"{desc} ({len(index):,} kayıt)".replace(f"{len(index):,}", f"{len(index):,}".replace(",", ".")), "ver": ver,
             "size": size + len(data), "index": idx_name, "parts": parts}]
        print(f"{pid}: {len(index)} kayıt, {(size + len(data)) / 1048576:.1f} MB, {len(parts)} parça", file=sys.stderr)

    manifest.sort(key=lambda m: ["kelime", "cumle"].index(m["id"]) if m["id"] in ("kelime", "cumle") else 9)
    json.dump(manifest, open(manifest_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
