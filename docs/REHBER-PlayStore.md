# Tilmiz'i Google Play'e yükleme rehberi

Uygulama bir web uygulaması (PWA) olarak GitHub Pages'te barındırılır ve Android'e "Trusted Web Activity" (TWA) olarak paketlenir. Destek paketleri Google Play Billing ile çalışır.

Adlar (`app.config.json`): uygulama **Tilmiz**, geliştirici **Mihenk Labs**, GitHub kullanıcı adı **mihenklabs**, paket kimliği **io.github.mihenklabs.tilmiz** (paket kimliği sonradan değiştirilemez).

## Derleme çıktıları (`npm run build`)
- `dist/site/` → uygulama: `https://mihenklabs.github.io/tilmiz/`
- `dist/root/` → geliştirici kök sitesi: `https://mihenklabs.github.io/` (tanıtım sayfası + `.well-known/assetlinks.json`). TWA doğrulaması için `assetlinks.json` alan adının **kökünde** olmalı; ileride başka uygulamalar da aynı dosyaya eklenir.
- `store/` → 512×512 Play simgesi ve 1024×500 öne çıkan görsel (`tools/assets/` ile yeniden üretilebilir).

## 1. GitHub
1. github.com'da **mihenklabs** kullanıcı adıyla hesap aç (ad müsaitken hemen al).
2. İki **public** depo:
   - `tilmiz`: bu proje (kaynak kod). Settings → Pages → Source: **GitHub Actions**. `.github/workflows/pages.yml` her `main` gönderiminde testleri çalıştırıp `dist/site`'ı yayınlar.
   - `mihenklabs.github.io`: `dist/root/` içeriği (`.nojekyll` ve `.well-known` dahil). Settings → Pages → Branch: `main` / root.
3. Birkaç dakika sonra `https://mihenklabs.github.io/tilmiz/` adresinde uygulamayı aç ve dene.

## 2. Android paketi

### Alternatif: PWABuilder (hatırlatmalar olmadan)
1. pwabuilder.com → adres: `https://mihenklabs.github.io/tilmiz/` → Start.
2. Package for stores → **Android** → Options:
   - **Package ID**: `io.github.mihenklabs.tilmiz`
   - **App name**: Tilmiz, **Short name**: Tilmiz
   - **Play Billing**: Açık (destek paketleri için şart)
   - **Signing key**: Create new
3. İndir: `.aab`, imza anahtarı (`signing.keystore`), şifre notu ve `assetlinks.json` gelir.
4. **İmza anahtarını ve şifreleri depoya koyma**; güvenli bir yerde (ör. parola yöneticisi + şifreli yedek) sakla. Kaybolursa uygulama güncellenemez. (`.gitignore` `*.keystore`, `signing*` dosyalarını zaten dışarıda tutar.)

### Önerilen: bu depodaki araçlarla (yerelde, tekrarlanabilir, hatırlatmalar dahil)
Kurulu: JDK 17 ve Android SDK `D:\Android` altında; proje `D:\Android\tilmiz-twa`; emülatör `tilmiz35` (sürücü AEHD).
1. Proje yoksa ya da `twa-manifest` değiştiyse: `npm run build`, sonra `node tools/android/generate.mjs D:/Android/tilmiz-twa` (site yayında değilse sona `http://localhost:8080/` ekle ve `npm run serve` açık olsun), ardından `local.properties` içine `sdk.dir=D:/Android/sdk`.
2. İmzalı paket: `powershell -ExecutionPolicy Bypass -File tools\android\release.ps1`. İlk çalıştırmada imza anahtarını **depo dışında** (`D:\tilmiz-imza\`) oluşturur; şifre yalnızca pencerede sorulur, hiçbir dosyaya yazılmaz. Çıktı: `dist/twa/tilmiz.aab` (Play) ve `tilmiz.apk` (deneme). Betik yükleme anahtarının SHA-256 parmak izini de yazar.
3. Şifreyi parola yöneticisine kaydet, anahtar dosyasını şifreli yedekle. Play App Signing açık olduğu için yükleme anahtarı kaybolursa Play desteğinden sıfırlatılabilir, ama zaman alır.

## 3. assetlinks.json
Parmak izleri `app.config.json` → `fingerprints` listesinden üretilir (`{name, sha256}`). Yayından önce:
- `debug` kaydını **sil** (yalnızca bu bilgisayardaki test anahtarı).
- `upload`: release.ps1 çıktısındaki SHA-256.
- `play`: Play Console → Test ve yayınla → Kurulum → Uygulama imzalama → "Uygulama imzalama anahtarı sertifikası" SHA-256.

Sonra `npm run build` ve `dist/root/` içeriğini `mihenklabs.github.io` deposuna gönder. Bu yapılmazsa uygulama üstte adres çubuğuyla açılır.

## 4. Google Play Console
1. play.google.com/console → geliştirici hesabı (tek seferlik 25 USD, kimlik doğrulama). Geliştirici adı: **Mihenk Labs**.
2. Uygulama oluştur: ad **Tilmiz – Arapça öğren**, varsayılan dil Türkçe, Uygulama, Ücretsiz.
3. **Mağaza girişi**: kısa ve tam açıklama (`docs/magaza-metinleri.md`), `store/play-icon-512.png`, `store/feature-graphic-1024x500.png`, telefon ekran görüntüleri `store/screenshots/` (5 adet, 1104×2207; emülatörde örnek ilerlemeyle çekildi).
4. **Uygulama içeriği**:
   - Gizlilik politikası URL'si: `https://mihenklabs.github.io/tilmiz/privacy.html`
   - Reklam: Yok.
   - Veri güvenliği: Veri toplanmıyor, paylaşılmıyor (ödeme Google tarafından işlenir).
   - Hedef kitle: **6–8, 9–12, 13–15, 16–17 ve 18+** → Aileler Politikası. Hazır olanlar: reklam/takip yazılımı yok, veri toplanmıyor, uygunsuz kelimeler gizli, satın almadan önce ebeveyn onayı sorusu, gizlilik politikasında çocuklar bölümü, yazı tipleri uygulama içinde (üçüncü taraf isteği yok).
   - "Uygulamanız çocukların ilgisini çekebilir mi?" → dürüstçe "Evet".
   - İçerik derecelendirmesi: Eğitim; şiddet vb. yok.
5. **Para kazanma → Uygulama içi ürünler** (önce bir test sürümü yüklemek gerekebilir):
   - `kahve_30` → "Geliştiriciye bir kahve ısmarla", 30 TL
   - `destek_100` → "Projeye destek ol", 100 TL
   - `destek_250` → "Cömert destekçi ol", 250 TL
   - Kimlikler bire bir böyle olmalı.
6. Ödeme profili ve banka hesabı.

## 5. Test ve yayın
0. **Kapalı test şartı:** Yeni kişisel hesaplarda en az **12 testçi, 14 gün kesintisiz** kapalı test.
1. Dahili test kanalına `.aab` yükle, kendini ekle; sonra aynı dosyayla kapalı testi aç, 12 testçiyi ekle.
2. Kurulum → Lisans testi: kendi Gmail adresin → test satın almaları ücretsiz.
3. Uygulamada Ayarlar → "Destek ol" kartı görünmeli; bir paket alıp "Teşekkürler" mesajını gör.
4. Her şey çalışınca Üretim kanalına taşı ve incelemeye gönder.

## Bilmen gerekenler
- Güncelleme: `main`'e gönderdiğinde site yeniden yayınlanır; çoğu güncelleme için yeni `.aab` gerekmez. Service worker sürümü derlemede otomatik değişir; telefonlar yeni sürümü bir sonraki açılışta alır.
- Play sürümünde ilerleme yalnızca o telefonda saklanır (yedek dosyasıyla taşınabilir); claude.ai sürümüyle eşitlenmez.
- Telaffuz telefonun Arapça sesiyle yapılır.
- GPL kaynak kodun erişilebilir olmasını ister: `tilmiz` deposu public kalsın.
- Vergi: GVK mükerrer 20/B istisnası (ayrı banka hesabı gerekir) — mali müşavire danış.
- Lisanslar: Vikisözlük (CC BY-SA 4.0), Quranic Arabic Corpus (GNU GPL), FrequencyWords (CC BY-SA 4.0), Amiri/Rubik (OFL). Atıflar uygulamada Ayarlar → "Hakkında, kaynaklar ve lisanslar".
- Marka: "Tilmiz" ve "Mihenk Labs" için TÜRKPATENT'te 9. ve 41. sınıflarda arama yap (bu kontrol edilemedi).
