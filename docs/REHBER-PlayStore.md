# Elifbâ Kelime'yi Google Play'e yükleme rehberi

Bu paket uygulamanın Play Store sürümünü içerir. Uygulama bir web uygulaması (PWA) olarak barındırılır, Android'e "Trusted Web Activity" (TWA) olarak paketlenir. Destek paketleri Google Play Billing ile çalışır.

## Paketin içeriği
- `site/` → Barındırılacak dosyalar: `index.html` (uygulama), `LICENSE` (GPLv3), `README.md`, `manifest.webmanifest`, `sw.js` (çevrimdışı çalışma), `icons/`, `privacy.html` (gizlilik politikası), `.well-known/assetlinks.json` (doldurulacak şablon).
- `store/` → Mağaza görselleri: 512×512 uygulama simgesi ve 1024×500 öne çıkan görsel.

## 1. Siteyi yayınla (GitHub Pages, ücretsiz)
TWA'nın çalışması için `assetlinks.json` dosyası alan adının **kök dizininde** olmalı. Bu yüzden siteyi kendi kök alan adına koy:
1. github.com'da ücretsiz hesap aç.
2. Adı tam olarak `KULLANICIADIN.github.io` olan yeni bir **public** depo oluştur.
3. `site/` klasörünün **içindekileri** (`.well-known` ve `.nojekyll` dahil) deponun kök dizinine yükle.
4. Depo → Settings → Pages → Source: "Deploy from a branch", Branch: `main` / root → Kaydet.
5. Birkaç dakika sonra `https://KULLANICIADIN.github.io` adresinde uygulamayı açıp dene.
6. `privacy.html` içindeki `[E-POSTA ADRESİNİ BURAYA YAZ]` kısmını kendi e-postanla değiştir.

(Alternatif: Netlify veya Cloudflare Pages da olur; yine site alan adının kökünde durmalı.)

## 2. Android paketini oluştur (PWABuilder)
1. pwabuilder.com'a git, site adresini yaz, "Start" de.
2. "Package for stores" → **Android** → "Generate Package" → "Options".
3. Ayarlar:
   - **Package ID**: ör. `io.github.kullaniciadi.elifba` (sonradan değiştirilemez).
   - **App name**: Elifbâ Kelime, **Short name**: Elifbâ.
   - **Play Billing**: **Açık** (destek paketleri için şart).
   - **Signing key**: "Create new" (anahtarı PWABuilder üretir).
4. İndir. Zip içinde `.aab` dosyası, imza anahtarı (`signing.keystore`), şifreleri içeren bir not ve `assetlinks.json` gelir.
5. **İmza anahtarını ve şifreleri güvenli bir yerde sakla.** Kaybolursa uygulamayı güncelleyemezsin.

## 3. assetlinks.json'u güncelle
PWABuilder'ın verdiği `assetlinks.json` içeriğini sitedeki `.well-known/assetlinks.json` dosyasının yerine koy. Play Console'da uygulama oluşturduktan sonra **Kurulum → Uygulama imzalama** sayfasındaki "Uygulama imzalama anahtarı sertifikası" SHA-256 parmak izini de aynı dosyadaki listeye ekle. Bu yapılmazsa uygulama üstte adres çubuğuyla açılır.

## 4. Google Play Console
1. play.google.com/console → geliştirici hesabı aç (tek seferlik 25 USD, kimlik doğrulaması istenir). Kişisel hesaplarda, uygulamayı yayınlamadan önce kapalı testte belirli sayıda testçiyle bir süre test etme şartı olabilir; Console'da güncel şartı kontrol et.
2. "Uygulama oluştur": ad Elifbâ Kelime, varsayılan dil Türkçe, Uygulama, Ücretsiz.
3. **Mağaza girişi**: kısa ve tam açıklama, `store/play-icon-512.png`, `store/feature-graphic-1024x500.png`, telefondan en az 2 ekran görüntüsü.
4. **Uygulama içeriği** formları:
   - Gizlilik politikası URL'si: `https://KULLANICIADIN.github.io/privacy.html`
   - Reklam: Yok.
   - Veri güvenliği: Veri toplanmıyor, paylaşılmıyor (ödeme Google tarafından işlenir).
   - Hedef kitle ve içerik: yaş grupları olarak **6–8, 9–12, 13–15, 16–17 ve 18+** seç (7+ için en yakın seçim). Çocukları kapsadığı için uygulama **Aileler Politikası**'na tabi olur. Hazırlananlar: reklam ve takip yazılımı yok, veri toplanmıyor, çocuklara uygun olmayan kelimeler gizli, satın almalardan önce ebeveyn onayı sorusu var, gizlilik politikasında çocuklar bölümü var.
   - "Uygulamanız çocukların ilgisini çekebilir mi?" gibi sorularda dürüstçe "Evet" de.
   - İçerik derecelendirmesi anketi: Eğitim uygulaması, şiddet vb. yok.
5. **Para kazanma → Ürünler → Uygulama içi ürünler** (önce bir test sürümü yüklemen gerekebilir):
   - Ürün kimliği `kahve_30` → ad "Geliştiriciye bir kahve ısmarla", fiyat 30 TL → Etkinleştir.
   - Ürün kimliği `destek_100` → ad "Projeye destek ol", fiyat 100 TL → Etkinleştir.
   - Ürün kimliği `destek_250` → ad "Cömert destekçi ol", fiyat 250 TL → Etkinleştir.
   - Kimlikler bire bir böyle olmalı; uygulama bu kimlikleri arar.
6. Ödeme profili oluştur (Para kazanma kurulumu), banka hesabını ekle.

## 5. Test ve yayın
0. **Kapalı test şartı:** Yeni kişisel hesaplarda yayından önce en az **12 testçinin 14 gün kesintisiz** katıldığı bir kapalı test gerekir. Testçilerin uygulamayı gerçekten kullanması gerekir.
1. **Test → Dahili test** kanalına `.aab` dosyasını yükle, kendini testçi ekle, bağlantıdan uygulamayı yükle. Ardından aynı dosyayla **Kapalı test** kanalını aç ve 12 testçiyi e-posta listesiyle ekle.
2. **Kurulum → Lisans testi** bölümüne kendi Gmail adresini ekle: test satın almaları ücretsiz yapılır.
3. Uygulamada Ayarlar → "Destek ol" kartı görünmeli. Bir paket alıp "Teşekkürler" mesajını gör.
4. Her şey çalışınca sürümü **Üretim** kanalına taşı ve incelemeye gönder.

## Bilmen gerekenler
- Play sürümünde ilerleme yalnızca o telefonda saklanır; Claude'daki sürümle eşitlenmez.
- Telaffuz telefonun Arapça sesiyle yapılır (Claude sesi yalnızca claude.ai'de).
- Uygulamayı güncellemek için `site/index.html` dosyasını değiştirip yeniden yüklemen yeterli; çoğu güncelleme için yeni `.aab` gerekmez. `sw.js` içindeki `elifba-v1` sürüm adını artırırsan telefonlar yeni sürümü daha hızlı alır.
- GitHub deposunu herkese açık tut: `LICENSE` (GPLv3) ve `README.md` dosyaları depoda kalsın; GPL kaynak kodun erişilebilir olmasını ister.
- Vergi: Google'dan gelen kazanç için Türkiye'de mobil uygulama geliştiriciliği istisnası (GVK mükerrer 20/B) var; bunun için ayrı bir banka hesabı gerekiyor. Başlamadan önce bir mali müşavire danış (memursan özellikle).
- Lisanslar: Kelime verisi Vikisözlük'ten (CC BY-SA 4.0), Kur'an metni ve kök bilgisi Quranic Arabic Corpus'tan (GNU GPL), sıklık listesi FrequencyWords'ten (CC BY-SA 4.0). Atıflar uygulamada Ayarlar → "Hakkında, kaynaklar ve lisanslar" bölümünde. GPL ve CC BY-SA, verilerin aynı lisansla paylaşılmasını isteyebilir; ticari kullanım veya lisans konusunda emin olmak için bir uzmana danışmanı öneririm.
