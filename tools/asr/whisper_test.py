"""Çevrimdışı konuşma tanıma denemesi: Whisper tiny/base, TTS örneklerini (samples/) tanır.
Kullanım: .venv-tts/Scripts/python.exe tools/asr/whisper_test.py
"""
import json
import re
import time
from pathlib import Path

import numpy as np
import scipy.io.wavfile
import scipy.signal
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".venv-tts" / "voices" / "hf"
S = ROOT / "samples"
engines = json.loads((S / "engines.json").read_text(encoding="utf-8"))
texts = re.findall(r"<td class=ar>(.*?)</td>", (S / "index.html").read_text(encoding="utf-8"))


def norm(s):
    s = re.sub(r"[ً-ْٰـۖ-ۭٓ]", "", s)
    s = re.sub("[أإآٱ]", "ا", s).replace("ى", "ي").replace("ة", "ه")
    return re.sub(r"[^ء-ي ]", "", s).split()


def load(f):
    sr, x = scipy.io.wavfile.read(f)
    x = x.astype(np.float32) / 32768
    return scipy.signal.resample_poly(x, 16000, sr) if sr != 16000 else x


lines = ["# Çevrimdışı konuşma tanıma denemesi (Whisper)\n", "Girdi: TTS ile üretilmiş temiz sesler (gerçek öğrenci sesi değil). Doğru = kelimelerin hepsi aynı (harekesiz karşılaştırma).\n"]
for name in ["openai/whisper-tiny", "openai/whisper-base", "openai/whisper-small"]:
    p = WhisperProcessor.from_pretrained(name, cache_dir=str(CACHE))
    m = WhisperForConditionalGeneration.from_pretrained(name, cache_dir=str(CACHE)).eval()
    n = sum(x.numel() for x in m.parameters())
    lines.append(f"\n## {name} ({n/1e6:.0f}M parametre, int8 ≈ {n/1e6:.0f} MB)\n\n| Ses | Hedef | Tanınan | Doğru |\n|---|---|---|---|")
    ok = tot = 0; t0 = time.time()
    for eng, files in engines.items():
        for k, f in enumerate(files):
            feats = p(load(S / f), sampling_rate=16000, return_tensors="pt").input_features
            with torch.no_grad():
                ids = m.generate(feats, language="ar", task="transcribe", max_new_tokens=60)
            hyp = p.batch_decode(ids, skip_special_tokens=True)[0].strip()
            good = norm(hyp) == norm(texts[k]); ok += good; tot += 1
            lines.append(f"| {eng.split()[0]} | {texts[k]} | {hyp} | {'✓' if good else '✗'} |")
    sec = (time.time() - t0) / tot
    lines.append(f"\n**{ok}/{tot} tam doğru**, örnek başı {sec:.2f} sn (masaüstü CPU)")
    print(name, ok, "/", tot, f"{sec:.2f} sn")
(S / "konusma-tanima.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(S / "konusma-tanima.md")
