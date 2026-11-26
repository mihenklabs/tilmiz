"""piper-tts eğitim paketindeki monotonic_align Cython eklentisinin yerine numba sürümünü kurar.

piper-tts tekerleğinde derlenmiş `monotonic_align.core` yok; Windows'ta C derleyicisi olmadan derlenemiyor.
Bu betik aynı imzayla (maximum_path_c(path, neg_cent, t_t_max, t_s_max)) saf Python + numba sürümünü yazar.
Algoritma: VITS / Glow-TTS monotonic alignment search (MIT lisanslı özgün Cython koduyla aynı).

Kullanım: python tools/tts/patch_mas.py   (eğitim sanal ortamının python'u ile)
"""
import importlib.util
import os

# paketi içe aktarmadan yerini bul (__init__ eksik modülü içe aktarmaya çalışıp hata verir)
spec = importlib.util.find_spec("piper.train.vits")
MA_DIR = os.path.join(list(spec.submodule_search_locations)[0], "monotonic_align")

CODE = '''import numba
import numpy as np


@numba.njit(cache=True, nogil=True)
def _maximum_path_each(path, value, t_y, t_x, max_neg_val=-1e9):
    index = t_x - 1
    for y in range(t_y):
        for x in range(max(0, t_x + y - t_y), min(t_x, y + 1)):
            v_cur = max_neg_val if x == y else value[y - 1, x]
            if x == 0:
                v_prev = 0.0 if y == 0 else max_neg_val
            else:
                v_prev = value[y - 1, x - 1]
            value[y, x] += max(v_prev, v_cur)
    for y in range(t_y - 1, -1, -1):
        path[y, index] = 1
        if index != 0 and (index == y or value[y - 1, index] < value[y - 1, index - 1]):
            index = index - 1


@numba.njit(cache=True, nogil=True, parallel=True)
def maximum_path_c(paths, values, t_ys, t_xs):
    b = paths.shape[0]
    for i in numba.prange(b):
        _maximum_path_each(paths[i], values[i], t_ys[i], t_xs[i])
'''

pkg = os.path.join(MA_DIR, "monotonic_align")
os.makedirs(pkg, exist_ok=True)
open(os.path.join(pkg, "__init__.py"), "w").close()
with open(os.path.join(pkg, "core.py"), "w", encoding="utf-8") as f:
    f.write(CODE)
print("yazıldı:", os.path.join(pkg, "core.py"))
