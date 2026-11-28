# Yeni diyalog yazım yönergesi (Tilmiz)

Mevcut 12 diyalog (`data/dialogs.json`): Selamlaşma, Tanışma, Aile, Okulda, Saat kaç?, Namaz vakti, Yol sorma, Alışveriş, Lokantada, Doktorda, Telefonda, Otelde. Bunların biçimine bak ve aynı biçimde 28 yeni diyalog yaz.

## Biçim
`out.json`: dizi; her öğe `["Başlık", [[arapça, türkçe, [alternatifler]], ...]]`. Satırlar sırayla iki kişi arasında gidip gelir.
- 6–10 satır; her satır kısa (2–10 kelime), **tam harekeli Fasih Arapça**, doğru i‘rab, sonunda nokta/soru işareti (؟)/ünlem.
- Türkçe doğal çeviri; `alternatifler` 1–2 farklı doğru Türkçe çeviri (ör. sen/siz).
- Seviye A1–B1: sık kullanılan kelimeler; yeni başlayan biri izleyebilmeli.
- 7+ uygun: şiddet, alkol, romantik içerik, siyaset yok; dinî konular saygılı; ayet/hadis uydurma.

## Konular (bu 28'i yaz, sırayla)
Hava durumu; Sabah rutini; Kahvaltı; Mutfakta yemek yapma; Pazarda meyve-sebze; Kütüphanede; Sınıfta ödev; Sınav sonrası; Arkadaşı davet etme; Doğum günü; Bayram tebriki; Ramazan ve iftar; Camide; Hac/umre yolculuğu hazırlığı; Havalimanında; Otobüs/taksi; Tren istasyonunda; Bankada; Postanede; Eczanede; Kayboldum (yardım isteme); Spor ve yürüyüş; Hobiler; Hafta sonu planı; Yeni ev/oda tarifi; Komşuyla sohbet; İş görüşmesi (basit); Vedalaşma ve teşekkür.

## Son kontrol
JSON geçerli mi; her satırda tam hareke ve doğru i‘rab var mı; çeviriler anlamı karşılıyor mu; konu dışı ya da tekrar eden diyalog yok mu.
