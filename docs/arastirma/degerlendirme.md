# Ses, konuşma tanıma ve çeviri: değerlendirme (Madde 5, 7, 8)

Tarih: 26 Kasım 2026. Ölçümler masaüstü CPU'da (telefonda 3–10 kat yavaş olur). Ham sonuçlar: `ceviri-karsilastirma.md`, `konusma-tanima.md`; betikler: `tools/tts/samples.py`, `tools/mt/compare.py`, `tools/asr/whisper_test.py`.

## 5. Telaffuz ses dosyaları (açık kaynak TTS)

| Model | Kalite (ilk izlenim) | Lisans durumu |
|---|---|---|
| Piper `ar_JO-kareem-medium` | Anlaşılır; Whisper dahi kalıp cümleleri doğru tanıdı. Ürdün lehçesine yakın ses, harekeyi kısmen izliyor. | **Belirsiz.** Model kartı lisans için veri setine yönlendiriyor; veri setinde lisans yok. Piper projesi ses modelleri için lisans vermiyor. Dağıtmak riskli. |
| Meta MMS-TTS `ara` | Daha robotik; Whisper hiçbir örneği tam tanıyamadı. | **CC BY-NC 4.0** (ticari olmayan). Bağış/uygulama içi ürün olduğu için uygun değil. |
| ClArTTS veri seti (klasik Arapça, 12 saat, LibriVox) | — | **CC BY 4.0**: kendi sesimizi eğitmek için temiz kaynak. Hazır model (`speecht5_tts_clartts_ar`) 2025'te CC BY-NC'ye çevrildi. |

**Öneri:** Şimdilik cihazın kendi sesi (Android Google TTS, ücretsiz ve iyi) kalsın. Kalıcı çözüm: ClArTTS ile kendi Piper sesimizi eğitmek (CC BY 4.0 atıfla dağıtılabilir; klasik Arapça ve harekeli metin olduğu için ayet/hadise de uygun). Bu bilgisayardaki GTX 1050 Ti (4 GB) ile ince ayar günler sürer; bulutta kiralık GPU ile birkaç saat (~10–30 USD). Ses dosyaları (11.700 kelime + cümleler, Opus 24 kbps) yaklaşık 60–90 MB eder; uygulamaya isteğe bağlı "ses paketi" olarak indirilebilir.

## 7. Sesli pratik (konuşma tanıma)

- **Çevrimdışı Whisper** (MIT lisans, tarayıcıda transformers.js ile çalışabilir): tiny 39 MB, base 74 MB, small 242 MB (int8).
  - Temiz TTS sesinde bile **tek kelimeleri tanıyamadı** (small: 0/6). Kalıp cümlelerde (selamlaşma, Besmele, Fatiha 2) small başarılı, tiny/base zayıf.
  - Gerçek öğrenci sesi (aksanlı, gürültülü) daha kötü olur. Whisper yanlış telaffuzu da en yakın doğru kelimeye "düzelttiği" için **telaffuz notu vermek için güvenilir değil**.
  - Telefonda small için cümle başı birkaç saniye + 242 MB indirme.
- **Tarayıcının konuşma tanıması (Web Speech API):** Android Chrome'da Arapça çalışır ama ses Google sunucularına gider. Bu, "veri toplanmaz" ilkesine ve Aileler Politikası/Veri güvenliği beyanına aykırı düşer (beyan değişir, ebeveyn onayı gerekebilir). Cihaz içi tanıma desteği Arapça için güvenilir değil.

**Dürüst sonuç:** Çevrimdışı ve güvenilir bir telaffuz değerlendirmesi şu an mümkün değil. Yapılabilecek makul şey: diyalog pratiğinde "söyle → kendi sesini dinle → örnekle karşılaştır" (kayıt yalnızca cihazda, tanıma yok). İstersen bunu ekleyebilirim; ileride isteğe bağlı Whisper-small paketiyle "cümleyi doğru söyledin mi" kontrolü denenebilir.

## 8. Cihazda çalışan çeviri modeli

| Model | Boyut (int8) | Hız | Kalite |
|---|---|---|---|
| Opus-MT ar→tr + tr→ar (Apache-2.0) | 2 × ~77 MB | 0,2–0,3 sn/cümle | Kısa günlük cümlelerde çoğunlukla doğru ("Kalemin var mı?", "Saat dokuzda başlıyor"). Dinî ifade ve hadislerde ciddi hatalar: "Sırtın için dua ettin mi?" (öğle namazı), "Tanrı'nın izniyle"; hadisleri anlamsız ya da yanlış çeviriyor. |
| M2M100-418M (MIT) | ~484 MB | 1,2–1,4 sn/cümle | Daha kötü; uydurma çeviriler (bir hadisi alakasız bir ayet parçasına çevirdi). |
| NLLB-200 600M | ~600 MB | — | CC BY-NC: uygun değil. |

**Öneri:** Serbest çeviri özelliği eklenmesin ya da yalnızca Opus-MT ile, "makine çevirisi, hatalı olabilir" uyarısıyla, ayet/hadis ekranlarında **kapalı** olarak, isteğe bağlı ~150 MB indirmeyle eklensin. Dinî metinlerde yanlış çeviri göstermek, 7+ yaş kitleye ve hoca kontrollü içeriğe ters düşer. Karar senin.
