# Android hatırlatmaları (TWA'ya eklenen yerel kod)

Bu klasör, Bubblewrap'in ürettiği Android projesine eklenen **yerel hatırlatma** kodunu (Java) içerir. Web uygulaması (`src/notify.js`) kullanıcının alışkanlığından 14 günlük planı hesaplar; bu kod planı TWA **postMessage** kanalıyla alır ve `AlarmManager` ile zamanında gösterir. Sunucu yok, veri cihazdan çıkmaz.

## Dosyalar
- `PlanBridge.java`: `CustomTabsCallback`. Sayfa yüklenince `requestPostMessageChannel` ister, kanal hazır olunca `"tilmiz-native-hello"` ve uygulama kapalıyken gösterilen bildirimleri yollar, sayfadan gelen `tilmiz-plan` mesajını `Reminders`'a verir. Bubblewrap'in kendi geri çağırmasını sarar (kalite denetimi bozulmaz).
- `Reminders.java`: planı `SharedPreferences`'a yazar, en fazla 40 alarm kurar (`setAndAllowWhileIdle`, tam zaman izni gerekmez), bildirimi gösterir (3 saatten eskiyse göstermez). Dokunulunca uygulama `?n=etiket#calis` ile açılır; web tarafı hatırlatmanın işe yaradığını kaydeder.
- `ReminderReceiver.java`, `BootReceiver.java`: alarm ve yeniden başlatma alıcıları.

Bubblewrap'in `LauncherActivity`'si **korunur** (açılış ekranı, Chrome yoksa yedek davranış, Play Billing). Yalnızca iki yöntem eklenir: `getCustomTabsCallback()` köprüyü döndürür, `createTwaLauncher()` köprüye oturumu verir. androidbrowserhelper oturumu dışarı vermediği için `PlanBridge` onu `TwaLauncher` içindeki `CustomTabsSession` türündeki alandan okur (alan adı değişse de çalışır; tür değişirse kanal kurulmaz, uygulama yine çalışır, yalnızca hatırlatma planı gelmez).

## Gereksinimler
- Chrome 115+ (TWA postMessage), androidbrowserhelper 2.7.4 (Bubblewrap 1.27 ile gelir).
- `assetlinks.json`'da `delegate_permission/common.use_as_origin` ilişkisi (şablonda var).
- `twa-manifest.json`'da `enableNotifications: true` (Android 13+ bildirim izni web'deki "Bildirimlere izin ver" düğmesinden gelir) ve `monochromeIconUrl` (bildirim simgesi).

## Projeyi üretme
```
npm run build
cd tools/android && npm install && cd ../..
node tools/android/generate.mjs ../tilmiz-twa                # site yayındaysa
node tools/android/generate.mjs ../tilmiz-twa http://localhost:8080/   # yayından önce: önce `npm run serve`
```
`generate.mjs` Bubblewrap çekirdeğiyle projeyi `dist/twa/twa-manifest.json`'dan üretir ve `integrate.mjs` ile bu klasördeki kodu ekler (LauncherActivity'ye iki yöntem, manifeste iki alıcı ve `RECEIVE_BOOT_COMPLETED`). Bubblewrap CLI ile `bubblewrap update` yaptıktan sonra `node tools/android/integrate.mjs <proje>` yeniden çalıştırılmalı.

Derleme (JDK 17 ve Android SDK, bu bilgisayarda `D:\Android`):
```
cd ../tilmiz-twa
echo sdk.dir=D:/Android/sdk > local.properties
set JAVA_HOME=D:\Android\jdk-17.0.21.1+2
gradlew assembleDebug        # deneme
gradlew bundleRelease        # Play için .aab (imza anahtarıyla; anahtar ve şifre depoya yazılmaz)
```

## Play Console
- Veri güvenliği: değişmez (veri toplanmıyor).
- Aileler Politikası: bildirimler reklam içermez, günde en fazla bir (seri hatırlatmasıyla iki), sessiz saatlerde (varsayılan 21:00–08:00) gönderilmez, kullanıcı Ayarlar'dan kapatabilir.
