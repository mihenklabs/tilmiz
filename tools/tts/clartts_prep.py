"""ClArTTS (CC BY 4.0) veri setini Piper eğitimine hazırlar.

Girdi : Hugging Face MBZUAI/ClArTTS parquet dosyaları (train-*.parquet, test.parquet)
Çıktı : <out>/wav/*.wav (22.050 Hz, 16 bit, mono) ve <out>/metadata.csv ("dosya|metin")

Kullanım:
  python tools/tts/clartts_prep.py D:/tts-egitim/clartts D:/tts-egitim/data [--max-hours 11.5]

ClArTTS: LibriVox'taki klasik Arapça bir sesli kitaptan, tek erkek konuşmacı, ~12 saat, harekeli metin.
Atıf: Kulkarni ve ark., "ClArTTS: An Open-Source Classical Arabic Text-to-Speech Corpus", Interspeech 2023.
"""
import argparse
import glob
import os
import re
import sys
from math import gcd

import numpy as np
import pyarrow.parquet as pq
import soundfile as sf
from scipy.signal import resample_poly

TARGET_SR = 22050
# Harekeli Arapça harfler, boşluk ve temel noktalama dışındaki karakterleri at
KEEP = re.compile(r"[^\u0621-\u063A\u0640-\u0652\u0670\u0671\s.,،؟?!:;]")


def clean(text: str) -> str:
    t = KEEP.sub("", text)
    return re.sub(r"\s+", " ", t).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--max-hours", type=float, default=100.0)
    ap.add_argument("--min-sec", type=float, default=0.8)
    ap.add_argument("--max-sec", type=float, default=12.0)
    a = ap.parse_args()

    wav_dir = os.path.join(a.out, "wav")
    os.makedirs(wav_dir, exist_ok=True)
    files = sorted(glob.glob(os.path.join(a.src, "train-*.parquet"))) + sorted(glob.glob(os.path.join(a.src, "test.parquet")))
    if not files:
        sys.exit("parquet dosyası yok: " + a.src)

    rows, total, skipped = [], 0.0, 0
    for f in files:
        pf = pq.ParquetFile(f)
        for batch in pf.iter_batches(batch_size=64, columns=["text", "file", "audio", "sampling_rate", "duration"]):
            for r in batch.to_pylist():
                dur = float(r["duration"])
                text = clean(r["text"] or "")
                if not text or dur < a.min_sec or dur > a.max_sec:
                    skipped += 1
                    continue
                if total / 3600 >= a.max_hours:
                    break
                sr = int(r["sampling_rate"])
                x = np.asarray(r["audio"], dtype=np.float32)
                g = gcd(TARGET_SR, sr)
                y = resample_poly(x, TARGET_SR // g, sr // g).astype(np.float32)
                peak = float(np.max(np.abs(y))) or 1.0
                y = y / peak * 0.95  # tepe normalizasyonu
                name = os.path.splitext(r["file"])[0]
                sf.write(os.path.join(wav_dir, name + ".wav"), y, TARGET_SR, subtype="PCM_16")
                rows.append(f"{name}.wav|{text}")
                total += dur
        print(f"{os.path.basename(f)}: {len(rows)} kayıt, {total / 3600:.2f} saat", flush=True)

    with open(os.path.join(a.out, "metadata.csv"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(rows) + "\n")
    print(f"Bitti: {len(rows)} kayıt, {total / 3600:.2f} saat, atlanan {skipped}")


if __name__ == "__main__":
    main()
