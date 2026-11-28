# Çevrimdışı konuşma tanıma değerlendirmesi (28 Kasım 2026)

Amaç: telefona bağlı olmadan (web, masaüstü, Android) çevrimdışı çalışan Arapça konuşma tanıma; sözlükte sesle arama ve telaffuz kontrolü.

## Denenenler (bilgisayarda, CPU)
| Model | Boyut (int8 tahmini) | ClArTTS kısa cümle CER | Tek kelime birebir | Ses çifti ayırt etme |
|---|---|---|---|---|
| openai/whisper-tiny | ~40 MB | %24 | 5/40 | serbest 1/20, aday puanlama 11/20 |
| openai/whisper-base | ~80 MB | %15 | 3/40 | serbest 1/20, aday puanlama 11/20 |
| openai/whisper-small | ~250 MB | %6 | – | – (klip başı 5,5 sn) |
| facebook/wav2vec2-xlsr-53-espeak-cv-ft (fonem) | ~320 MB | – | – | 8/20 |

Test sesleri: ClArTTS kısa klipleri ve Piper ar_JO-kareem sesiyle üretilmiş tek kelimeler (yalnızca test için, uygulamaya girmez).
Betikler: scratchpad (asr_eval.py, asr_words.py, phon_eval.py) – gerekirse yeniden yazılabilir.

## Sonuç
- Hazır Whisper modelleri cümlede kabul edilebilir (small), tek kelimede ve ق/ك gibi çiftlerde yazı-tura düzeyinde. Dil modeli yanlış telaffuzu “düzelttiği” için telaffuz kontrolüne uygun değil.
- Hazır çok dilli fonem modeli de Arapça vurgulu (mufahham) harflerde başarısız.
- Güvenilir telaffuz kontrolü için Arapça konuşmayla eğitilmiş bir fonem (CTC) modeli gerekir: veri Common Voice Arapça (CC0, Hugging Face’te koşulları kabul etmek gerekir) + ClArTTS; xlsr-53 ya da wav2vec2-base üzerinden ince ayar, sonra int8 ONNX (~100–300 MB), tarayıcıda onnxruntime-web ile. Kalitesi önceden bilinemez; T4’te 10–20 saat.
- Şimdilik: Chrome’un cihaz içi tanıması varsa kullanılıyor (src/pron.js); yoksa telaffuz bölümü dinle-ayırt et ve sesli pratikte kendi sesini karşılaştırma ile çalışıyor.
