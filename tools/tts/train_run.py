"""piper.train'i kendi kontrol noktası ayarıyla başlatır.

Neden: piper-tts 1.8.0'ın varsayılan geri çağırmalarından biri `val_mos` izler; `--model.mos_metric none`
ile bu değer hiç yazılmadığı için ilk turun sonunda eğitim hata verip durur. Ayrıca varsayılanlar
en iyi 5 + son kontrol noktasını tutar (Drive'da gereksiz yer kaplar).
Bu betik varsayılanların yerine tek bir ModelCheckpoint koyar: her N turda <ckpt-dir>/son.ckpt üzerine yazar.

Kullanım: python tools/tts/train_run.py --ckpt-dir DİZİN [--every 5] fit <piper.train argümanları...>
Devam: ... fit ... --ckpt_path DİZİN/son.ckpt
"""
import argparse
import sys

from lightning.pytorch.callbacks import ModelCheckpoint

import piper.train.__main__ as piper_main

ap = argparse.ArgumentParser(add_help=False)
ap.add_argument("--ckpt-dir", required=True)
ap.add_argument("--every", type=int, default=5)
a, rest = ap.parse_known_args()

piper_main._DEFAULT_CALLBACKS[:] = [
    ModelCheckpoint(dirpath=a.ckpt_dir, filename="son", monitor=None, save_top_k=1,
                    every_n_epochs=a.every, enable_version_counter=False),
]
sys.argv = ["piper.train"] + rest
piper_main.main()
