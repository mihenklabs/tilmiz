"""Linux'ta kaydedilmiş Piper kontrol noktasından yalnızca ağırlıkları alır (Windows'ta PosixPath açılamıyor).
Kullanım: python tools/tts/convert_ckpt.py D:/tts-egitim/base/lj-med_1000.ckpt D:/tts-egitim/base/lj-med_1000.sd.ckpt
"""
import pathlib
import sys

import torch

pathlib.PosixPath = pathlib.WindowsPath  # yalnızca yükleme için
ck = torch.load(sys.argv[1], map_location="cpu", weights_only=False)
torch.save({"state_dict": ck["state_dict"]}, sys.argv[2])
print(len(ck["state_dict"]), "parametre ->", sys.argv[2])
