#!/usr/bin/env bash
# Tilmiz Arapça sesi: ClArTTS (CC BY 4.0) üzerinde Piper (VITS, medium) ince ayarı.
# Başlangıç ağırlıkları: Piper en_US ljspeech medium (LJ Speech veri seti kamu malı).
# Bu bilgisayar: GTX 1050 Ti 4 GB → küçük toplu boyut + karışık duyarlık.
#
# Hazırlık (bir kez):
#   python tools/tts/clartts_prep.py D:/tts-egitim/clartts D:/tts-egitim/data
#   python tools/tts/filter_long.py D:/tts-egitim   (→ data/metadata-8s.csv)
#   python tools/tts/patch_mas.py
#   python tools/tts/convert_ckpt.py D:/tts-egitim/base/lj-med_1000.ckpt D:/tts-egitim/base/lj-med_1000.sd.ckpt
# Çalıştırma:   bash tools/tts/train.sh            (kaldığı yerden devam: RESUME=1 bash tools/tts/train.sh)
# Oturumdan bağımsız (PowerShell): Start-Process "C:\Program Files\Git\bin\bash.exe" -ArgumentList '-lc','"cd /d/ElifBe && bash tools/tts/train.sh > /d/tts-egitim/train.log 2>&1"' -WindowStyle Hidden
# Colab (T4 GPU) için: tools/tts/colab_train.ipynb (make_colab.py üretir).
# Hız (GTX 1050 Ti, toplu 6): ~55 dk/dönem. İlerleme: D:/tts-egitim/train.log; kontrol noktaları her 5 dönemde D:/tts-egitim/out/lightning_logs/.
set -euo pipefail
ROOT=${ROOT:-/d/tts-egitim}
PY="$ROOT/venv/Scripts/python.exe"
BATCH=${BATCH:-6}
EPOCHS=${EPOCHS:-400}
CSV=${CSV:-$ROOT/data/metadata-8s.csv}  # 8 sn üstü 52 klip 4 GB GPU'da bellek taşırıyor (tools/tts/clartts_prep.py sonrası süzülür)
export PYTHONIOENCODING=utf-8
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
ARGS=(
  --data.voice_name ar_tilmiz-medium
  --data.csv_path "$CSV"
  --data.audio_dir "$ROOT/data/wav"
  --data.cache_dir "$ROOT/cache"
  --data.config_path "$ROOT/out/ar_tilmiz-medium.onnx.json"
  --data.espeak_voice ar
  --data.batch_size "$BATCH"
  --data.num_workers 2
  --data.validation_split 0.02
  --data.num_test_examples 4
  --model.mos_metric none
  --trainer.accelerator gpu
  --trainer.devices 1
  --trainer.precision 16-mixed
  --trainer.max_epochs "$EPOCHS"
  --trainer.check_val_every_n_epoch 5
  --trainer.default_root_dir "$ROOT/out"
)
if [ "${RESUME:-0}" = "1" ]; then
  CK="$ROOT/out/ckpt/son.ckpt"
  exec "$PY" tools/tts/train_run.py --ckpt-dir "$ROOT/out/ckpt" --every 5 fit "${ARGS[@]}" --ckpt_path "$CK"
else
  exec "$PY" tools/tts/train_run.py --ckpt-dir "$ROOT/out/ckpt" --every 5 fit "${ARGS[@]}" --model.warmstart_ckpt "$ROOT/base/lj-med_1000.sd.ckpt"
fi
