"""tools/tts/colab_train.ipynb defterini üretir (hücreler burada düz metin olarak tutulur, diff okunur).
Kullanım: python tools/tts/make_colab.py
Colab'da açmak: https://colab.research.google.com/github/mihenklabs/tilmiz/blob/main/tools/tts/colab_train.ipynb
"""
import json
import os

CELLS = []


def md(s):
    CELLS.append(("markdown", s.strip("\n")))


def code(s):
    CELLS.append(("code", s.strip("\n")))


md("""
# Tilmiz Arapça sesi – Colab eğitimi

Piper (VITS, medium) **ince ayar**: başlangıç ağırlıkları Piper `en_US ljspeech medium` (LJ Speech kamu malı),
veri **ClArTTS** (CC BY 4.0, Kulkarni ve ark., Interspeech 2023; tek erkek konuşmacı, ~12 saat, harekeli klasik Arapça).

**Nasıl kullanılır**
1. Çalışma zamanı → Çalışma zamanı türünü değiştir → **T4 GPU**.
2. Hücreleri sırayla çalıştır (Çalışma zamanı → Tümünü çalıştır). Drive izni bir kez sorulur.
3. Kontrol noktası her VAL_EVERY turda **Google Drive / tilmiz-tts/ckpt/son.ckpt** dosyasına yazılır (~280 MB). Oturum koparsa defteri yeniden açıp tümünü çalıştır: kaldığı yerden devam eder.
4. Ara sıra **Dinle** hücresini çalıştırıp sesin gelişimini dinle. Yeterince iyi olunca eğitimi durdur ve **Ses paketi** hücresini çalıştır.

Drive'da gereken yer: ~2,5 GB (veri önbelleği ~1,7 GB + kontrol noktası ~0,3 GB + başlangıç modeli ~0,3 GB).
""")

code("""
#@title 1) Ayarlar ve GPU
BATCH = 16          #@param {type:"integer"}  # bellek yetiyorsa 24 dene; "CUDA out of memory" olursa 12
MAX_EPOCHS = 2000   #@param {type:"integer"}  # üst sınır; istediğin an durdurabilirsin
VAL_EVERY = 5       #@param {type:"integer"}  # kaç turda bir doğrulama + kontrol noktası
MAX_SEC = 8.0       #@param {type:"number"}   # daha uzun klipler atlanır (yalnızca ~50 klip)
import subprocess
print(subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv"], capture_output=True, text=True).stdout or "GPU YOK: Çalışma zamanı türünü T4 GPU yap!")
""")

code("""
#@title 2) Google Drive
from google.colab import drive
drive.mount("/content/drive")
import os
DRIVE = "/content/drive/MyDrive/tilmiz-tts"
for d in ["ckpt", "base", "data", "out"]:
    os.makedirs(f"{DRIVE}/{d}", exist_ok=True)
W = "/content/tts"   # hızlı yerel disk
os.makedirs(W, exist_ok=True)
print(sorted(os.listdir(f"{DRIVE}/ckpt")))
""")

code("""
#@title 3) Kurulum (piper-tts 1.8.0 eğitim paketi + Tilmiz betikleri)
!pip -q install "piper-tts[train]==1.8.0" numba pyarrow
!rm -rf /content/tilmiz && git clone -q --depth 1 https://github.com/mihenklabs/tilmiz /content/tilmiz
!python /content/tilmiz/tools/tts/patch_mas.py
""")

code("""
#@title 4) Veri: ClArTTS → 22.050 Hz wav (ilk seferde ~10 dk; sonra Drive önbelleğinden ~1 dk)
import os, subprocess
TAR = f"{DRIVE}/data/clartts-22k.tar"
if os.path.exists(TAR):
    !tar -xf "{TAR}" -C {W}
else:
    B = "https://huggingface.co/datasets/MBZUAI/ClArTTS/resolve/main/data"
    os.makedirs(f"{W}/clartts", exist_ok=True)
    !wget -q -O {W}/clartts/test.parquet {B}/test-00000-of-00001.parquet
    for i in range(26):
        subprocess.run(["wget", "-q", "-O", f"{W}/clartts/train-{i:02d}.parquet", f"{B}/train-{i:05d}-of-00026.parquet"], check=True)
    !python /content/tilmiz/tools/tts/clartts_prep.py {W}/clartts {W}/data --max-sec {MAX_SEC}
    !tar -cf "{TAR}" -C {W} data
    !rm -rf {W}/clartts
!wc -l {W}/data/metadata.csv && du -sh {W}/data
""")

code("""
#@title 5) Başlangıç modeli (Piper ljspeech medium, kamu malı veri)
import os, torch
SD = f"{DRIVE}/base/lj-med_1000.sd.ckpt"
if not os.path.exists(SD):
    !wget -q -O {W}/lj.ckpt https://huggingface.co/datasets/rhasspy/piper-checkpoints/resolve/main/en/en_US/ljspeech/medium/lj-med_1000.ckpt
    ck = torch.load(f"{W}/lj.ckpt", map_location="cpu", weights_only=False)
    torch.save({"state_dict": ck["state_dict"]}, SD)
    os.remove(f"{W}/lj.ckpt")
print("hazır:", SD, os.path.getsize(SD) // 2**20, "MB")
""")

code("""
#@title 6) Eğitim (kaldığı yerden devam eder; durdurmak için hücrenin durdur düğmesi)
import os
son = f"{DRIVE}/ckpt/son.ckpt"
start = f"--ckpt_path {son}" if os.path.exists(son) else f"--model.warmstart_ckpt {DRIVE}/base/lj-med_1000.sd.ckpt"
print("Başlangıç:", start)
%env PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
%env PYTHONIOENCODING=utf-8
!python /content/tilmiz/tools/tts/train_run.py --ckpt-dir {DRIVE}/ckpt --every {VAL_EVERY} fit \
  --data.voice_name ar_tilmiz-medium --data.csv_path {W}/data/metadata.csv --data.audio_dir {W}/data/wav \
  --data.cache_dir {W}/cache --data.config_path {DRIVE}/out/ar_tilmiz-medium.onnx.json --data.espeak_voice ar \
  --data.batch_size {BATCH} --data.num_workers 2 --data.validation_split 0.02 --data.num_test_examples 4 \
  --model.mos_metric none --trainer.accelerator gpu --trainer.devices 1 --trainer.precision 16-mixed \
  --trainer.max_epochs {MAX_EPOCHS} --trainer.check_val_every_n_epoch {VAL_EVERY} \
  --trainer.default_root_dir {W}/logs {start}
""")

code("""
#@title 7) Dinle: son kontrol noktasını ONNX'e çevir ve örnek cümleleri seslendir
import os, glob, shutil, numpy as np
from IPython.display import Audio, display
CK = f"{DRIVE}/ckpt/son.ckpt"
ONNX = f"{W}/ar_tilmiz-medium.onnx"
!python -m piper.train.export_onnx --checkpoint {CK} --output-file {ONNX}
shutil.copy(f"{DRIVE}/out/ar_tilmiz-medium.onnx.json", ONNX + ".json")
import torch; print("tur:", torch.load(CK, map_location="cpu", weights_only=False)["epoch"])
from piper import PiperVoice, SynthesisConfig
v = PiperVoice.load(ONNX)
for t in ["مَرْحَبًا", "السَّلَامُ عَلَيْكُمْ", "كِتَابٌ", "أَيْنَ الْمَدْرَسَةُ؟", "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"]:
    a = np.concatenate([c.audio_float_array for c in v.synthesize(t, syn_config=SynthesisConfig(length_scale=1.1))])
    print(t); display(Audio(a, rate=v.config.sample_rate))
""")

code("""
#@title 8) Ses paketi: kelimeler, diyaloglar, ayet/hadis parçaları → Drive/tilmiz-tts/out/voice.zip
import shutil, os
!cd /content/tilmiz && git pull -q
shutil.copy(ONNX, f"{DRIVE}/out/ar_tilmiz-medium.onnx")
!python /content/tilmiz/tools/tts/synth_pack.py {ONNX} {W}/voice
!cd {W} && zip -q -r voice.zip voice && cp voice.zip "{DRIVE}/out/voice.zip" && du -sh voice voice.zip
print("Drive'da: tilmiz-tts/out/voice.zip ve ar_tilmiz-medium.onnx (+ .json)")
""")


def cell(kind, src):
    lines = src.split("\n")
    lines = [l + "\n" for l in lines[:-1]] + [lines[-1]]
    c = {"cell_type": kind, "metadata": {}, "source": lines}
    if kind == "code":
        c.update(execution_count=None, outputs=[])
    return c


nb = {
    "nbformat": 4, "nbformat_minor": 0,
    "metadata": {"accelerator": "GPU", "colab": {"provenance": [], "gpuType": "T4", "name": "colab_train.ipynb"},
                 "kernelspec": {"name": "python3", "display_name": "Python 3"}, "language_info": {"name": "python"}},
    "cells": [cell(k, s) for k, s in CELLS],
}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "colab_train.ipynb")
with open(out, "w", encoding="utf-8", newline="\n") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)
    f.write("\n")
print("yazıldı:", out, len(CELLS), "hücre")
