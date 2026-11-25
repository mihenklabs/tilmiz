"""TTS örneklemi: aynı cümleleri farklı açık modellerle seslendirir, samples/ altına WAV + dinleme sayfası yazar.
Kullanım: .venv-tts/Scripts/python.exe tools/tts/samples.py
"""
import html
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "samples"
OUT.mkdir(exist_ok=True)
VOICES = ROOT / ".venv-tts" / "voices"
VOICES.mkdir(exist_ok=True)

# (etiket, metin) — kelime, diyalog, ayet, hadis
ITEMS = [
    ("kelime", "كِتَابٌ"),
    ("kelime", "مَدْرَسَةٌ"),
    ("kelime", "يَكْتُبُ"),
    ("diyalog", "السَّلَامُ عَلَيْكُمْ. كَيْفَ حَالُكَ؟"),
    ("diyalog", "بِخَيْرٍ، الْحَمْدُ لِلَّهِ. وَأَنْتَ؟"),
    ("ayet", "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
    ("ayet", "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"),
    ("hadis", "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ"),
]


def spk(t):
    """Uygulamadaki spk() ile aynı: Kur'an yazımını standart yazıma çevir."""
    t = t.replace("ٱ", "ا").replace("ىٰ", "ى")
    t = re.sub("َوٰ", "َا", t)
    t = re.sub("َ?ٰ", "َا", t)
    t = re.sub("[ۖ-ۭٓ]", "", t)
    return re.sub(r"\s+", " ", t).strip()


def piper(name):
    model = VOICES / f"{name}.onnx"
    if not model.exists():
        subprocess.run([sys.executable, "-m", "piper.download_voices", "--download-dir", str(VOICES), name], check=True)
    from piper import PiperVoice
    v = PiperVoice.load(str(model))
    files = []
    for k, (_, text) in enumerate(ITEMS):
        f = OUT / f"piper-{name}-{k}.wav"
        with wave.open(str(f), "wb") as w:
            v.synthesize_wav(spk(text), w)
        files.append(f.name)
    return files


def mms():
    import numpy as np
    import scipy.io.wavfile
    import torch
    from transformers import AutoTokenizer, VitsModel
    m = VitsModel.from_pretrained("facebook/mms-tts-ara", cache_dir=str(VOICES / "hf"))
    tok = AutoTokenizer.from_pretrained("facebook/mms-tts-ara", cache_dir=str(VOICES / "hf"))
    files = []
    for k, (_, text) in enumerate(ITEMS):
        inp = tok(spk(text), return_tensors="pt")
        with torch.no_grad():
            wav = m(**inp).waveform[0].numpy()
        f = OUT / f"mms-ara-{k}.wav"
        scipy.io.wavfile.write(str(f), m.config.sampling_rate, (np.clip(wav, -1, 1) * 32767).astype(np.int16))
        files.append(f.name)
    return files


engines = {}
for label, fn in [("Piper ar_JO-kareem-medium", lambda: piper("ar_JO-kareem-medium")), ("Meta MMS-TTS (ara)", mms)]:
    try:
        engines[label] = fn()
        print("tamam:", label)
    except Exception as e:  # bir motor çalışmazsa diğerleri yine üretilsin
        print("HATA:", label, e)

rows = "".join(
    f"<tr><td>{lab}</td><td class=ar>{html.escape(t)}</td>" + "".join(f"<td><audio controls preload=none src='{fs[k]}'></audio></td>" for fs in engines.values()) + "</tr>"
    for k, (lab, t) in enumerate(ITEMS)
)
(OUT / "index.html").write_text(f"""<!doctype html><meta charset=utf-8><title>TTS örneklemi</title>
<style>body{{font-family:system-ui;margin:16px}}td,th{{padding:6px;border-bottom:1px solid #ddd;vertical-align:middle}}.ar{{font-size:1.4rem;direction:rtl}}audio{{width:220px}}</style>
<h2>Telaffuz örneklemi</h2><table><tr><th>Tür</th><th>Metin</th>{''.join(f'<th>{html.escape(e)}</th>' for e in engines)}</tr>{rows}</table>""", encoding="utf-8")
(OUT / "engines.json").write_text(json.dumps(engines, ensure_ascii=False, indent=1), encoding="utf-8")
print(OUT / "index.html")
