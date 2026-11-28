# Örnek cümle yazım yönergesi (Tilmiz)

Tilmiz, Türkçe konuşanlara Arapça öğreten, 7 yaş ve üzeri herkes için uygun, ücretsiz bir uygulama. Bu cümleler kelime kartlarında "Örnek cümleler" olarak gösterilir.

## Girdi
`in/NN.json`: her satır bir kelime: `id` (değiştirme), `ar` (harekeli Arapça), `okunus`, `tr` (Türkçe anlam; birden çok anlam `,` ya da `;` ile ayrılmış), `en` (İngilizce), `tur` (noun, verb, adj, adv, prep, phrase …), `ek` (isimde çoğul, fiilde muzari).

## Çıktı
`out/NN.jsonl`: girdi sırasıyla, her kelime için bir satır, geçerli JSON:
`{"id": 123, "ar": "…", "tr": "…", "alt": ["…"]}`
- Kelime için doğal, doğru bir cümle yazamıyorsan (çok teknik, argo, uygunsuz) o satırı `{"id": 123, "skip": "kısa neden"}` yaz. Boş bırakma.

## Cümle kuralları
1. **Fasih (Modern Standart) Arapça**, kısa ve doğal: 3–9 kelime. Öğrenen biri için anlaşılır, günlük ya da eğitici bir bağlam.
2. **Kelime cümlede geçmeli** ve verilen anlamda (ilk anlam tercih edilir) kullanılmalı. Fiiller çekimli, isimler belirli/çoğul/tamlamada olabilir; ama kökü ve kalıbı tanınabilir kalmalı.
3. **Tam harekeli** yaz (her harf harekeli; i‘rab doğru: merfû/mansûb/mecrûr, tenvin, şedde, cezm). Cümle sonuna nokta ya da soru işareti (؟) koy. Hareke ve i‘rab doğruluğundan emin olmadığın cümleyi basitleştir.
4. **Türkçe çeviri** doğal Türkçe olmalı, kelime kelime değil; anlamı tam karşılamalı. Arapçadaki zaman, şahıs, tekil/çoğul ve olumsuzluk çeviride korunmalı.
5. **alt**: anlamı aynı kalan 0–2 farklı doğru Türkçe çeviri (ör. "sen/siz", farklı kelime seçimi). Emin değilsen boş dizi.
6. **İçerik 7+ uygun**: şiddet, öldürme, silah, alkol, sigara, kumar, romantik/cinsel içerik, korku, hakaret, siyaset, mezhep tartışması yok. Dinî kelimelerde saygılı ve tarafsız ol; ayet ya da hadis uydurma, alıntı yapma.
7. Gerçek kişi, marka, ülke liderleri yok. Yer adları genel olabilir (Mekke, Kahire, İstanbul).
8. Aynı kalıbı sürekli tekrarlama ("Bu bir …" gibi); çeşitli cümle yapıları kullan.
9. Seyrek kelimelerde (anlamında "seyrek kullanılır" yazan) da cümle yaz; kitabi bir bağlam uygundur.

## Son kontrol (yazdıktan sonra kendin yap)
- Her satır geçerli JSON mı, `id`ler girdiyle aynı ve sırada mı?
- Her cümlede kelime var mı, harekeler tam mı, çeviri anlamı karşılıyor mu?
- Emin olmadığın satırları düzelt ya da `skip` yap.
