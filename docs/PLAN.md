# Tilmiz – yayına kadar ve sonrası plan (26 Kasım 2026)

Kurallar: şifreler, anahtarlar ve ödemeler kullanıcıda kalır. Hiçbir dosyaya şifre yazılmaz.

## Aşama 1 – Yayına hazırlık (hazır olanlar)
- Uygulama, testler (50), site derlemesi, gizlilik politikası, mağaza görselleri ve metinleri.
- İletişim e-postası: mihenklabs@gmail.com. Git yazarı: Mihenk Labs.
- Android projesi `D:\Android\tilmiz-twa`: hatırlatma kodu ve imzalı paket betiği (`tools/android/release.ps1`).
- Emülatör `tilmiz35`: uygulama açılıyor. Açılışta çöken site ayarları kısayolu hatası giderildi.

## Aşama 2 – GitHub (karar: kullanıcı)
1. Kullanıcı Claude'un tarayıcı panelinde github.com'a giriş yapar.
2. Claude şu iki herkese açık depoyu oluşturur:
   - `mihenklabs/tilmiz`
   - `mihenklabs/mihenklabs.github.io`
3. Claude kodu gönderir. Git'in açtığı giriş penceresini kullanıcı onaylar.
4. Pages ayarı: depo → Settings → Pages → Source: **GitHub Actions**.
5. Kontrol: `https://mihenklabs.github.io/tilmiz/` ve `https://mihenklabs.github.io/.well-known/assetlinks.json` açılıyor mu.

## Aşama 3 – Cihazda uçtan uca deneme
1. Emülatörde uygulama tam ekran açılmalı, adres çubuğu görünmemeli (doğrulama debug parmak iziyle).
2. Hatırlatma "Sabit saat"e kurulur. Ardından denenir:
   - plan uygulamaya geçiyor mu,
   - bildirim geliyor mu,
   - bildirime dokununca çalışma ekranı açılıyor mu,
   - yeniden başlatmadan sonra bildirim hâlâ kurulu mu.
3. Destek paketleri ilk sürümde kapalı (`playBilling: false`); açılırsa Billing testi yalnızca Play'den yüklenen sürümde yapılabilir.

## Aşama 4 – İmza ve ilk paket
1. Kullanıcı kendi PowerShell penceresinde `tools\android\release.ps1` dosyasını çalıştırır. Anahtar oluşturulur ve şifre parola yöneticisine kaydedilir.
2. Yükleme anahtarının SHA-256 değeri `app.config.json` → `fingerprints` içine `upload` adıyla eklenir.

## Aşama 5 – Play Console
1. Uygulama oluşturulur: Tilmiz – Arapça öğren, Türkçe, ücretsiz.
2. Mağaza girişi doldurulur: `docs/magaza-metinleri.md`, `store/`. Ekran görüntüleri emülatörden alınır.
3. Uygulama içeriği beyanları:
   - gizlilik politikası adresi,
   - reklam yok,
   - veri güvenliği: veri toplanmaz,
   - hedef kitle 7+ (Aileler Politikası),
   - içerik derecelendirmesi,
   - hükümet uygulaması değil, finansal özellik yok.
4. Uygulama içi ürün yok (ilk sürüm). Hesap: "satıcı değil" beyanı. Bağış ileride: `playBilling: true` + satıcı beyanı + ürünler `kahve_30`, `destek_100`, `destek_250`.
5. Kapalı test:
   - `tilmiz.aab` yüklenir,
   - en az 12 testçi 14 gün boyunca katılır,
   - Play imzalama SHA-256 değeri `fingerprints` içine `play` adıyla eklenir,
   - `debug` kaydı silinir, kök site yeniden gönderilir.
6. Testçilerle yapılacaklar: gerçek telefonda 320–412 px ekran ve karanlık tema, bildirimler.
7. Üretime başvuru. Bu aşamada Play'in sorularına yanıt verilir (test sırasında neler öğrenildi).

## Aşama 6 – Yayından sonra
- **Kendi ses paketi:** kullanıcı "başla" deyince TTS eğitimi `tools/tts/train.sh` ile yapılır. Ardından kontrol noktası seçimi, ONNX'e dönüştürme, `synth_pack.py`, uygulamada ses paketi ve ClArTTS atfı.
- **Hoca kontrolü:** `npm run content:export` ile tablo hazırlanır. Hoca sıhhat notlarını, sadeleştirilmiş anlatımları ve çıkarılan cümleleri kontrol eder. Sonra `content:import` ile geri alınır.
- **QuranEnc:** kısmi ayet alıntısı için bildirim e-postası gönderilir.
- **Bakım:**
  - her sürümde `package.json` sürümü artırılır (versionCode otomatik),
  - `npm test`,
  - `release.ps1`,
  - Play'de yeni sürüm.
- **Geri bildirim:** e-posta önerileri bir listede toplanır, hatalı çeviriler düzeltilir.

## Play Console'a Claude'un erişimi
Önerilen yol tarayıcı panelidir; anahtar ya da şifre paylaşılmaz.
1. Claude masaüstü uygulamasında Claude'un tarayıcı paneli açılır. Kullanıcı panelde `play.google.com/console` adresine **kendisi** giriş yapar (Google şifresi ve 2 adımlı doğrulama kullanıcıda kalır).
2. Claude formları doldurur:
   - mağaza girişi,
   - beyan anketleri,
   - ürünler,
   - test kanalı.
3. Kullanıcının kendisinin yapacakları:
   - kimlik doğrulama,
   - ödeme profili ve banka bilgileri,
   - sözleşme ve koşulların kabulü,
   - imza anahtarı.
4. Claude her **gönderme ya da yayınlama** düğmesinden önce kullanıcıya sorar.
5. İsteğe bağlı, sonrası için: otomatik yükleme isteniyorsa Google Cloud'da bir hizmet hesabı açılır ve Play Console → Kullanıcılar ve izinler bölümünden davet edilir. JSON anahtarı depo dışında tutulur. İlk yükleme yine elle yapılmak zorundadır.
