# Android hatırlatmaları (TWA'ya eklenecek yerel kod)

Bu klasör, Bubblewrap'in ürettiği Android projesine eklenecek **yerel hatırlatma** kodunu içerir. Web uygulaması (`src/notify.js`) kullanıcının alışkanlığından 14 günlük planı hesaplar; bu kod planı TWA **postMessage** kanalıyla alır ve `AlarmManager` ile zamanında gösterir. Sunucu yok, veri cihazdan çıkmaz.

> Durum: kod yazıldı, **henüz derlenmedi ve cihazda denenmedi** (bu bilgisayarda Android SDK yok).

## Gereksinimler
- Chrome 115+ (TWA postMessage), `androidx.browser:browser:1.8.0` veya üstü, `androidx.core:core-ktx`, Kotlin.
- `assetlinks.json`'da `delegate_permission/common.use_as_origin` ilişkisi (şablonda var).
- `twa-manifest.json`'da `enableNotifications: true` (Android 13+ bildirim izni isteği web'deki "Bildirimlere izin ver" düğmesinden gelir).

## Bubblewrap projesine ekleme
1. `bubblewrap init` / `update` sonrası bu klasördeki `src/main/java/...` dosyalarını projenin `app/src/main/java/` altına kopyala.
2. `app/build.gradle`:
   ```gradle
   apply plugin: 'kotlin-android'
   dependencies {
       implementation 'androidx.browser:browser:1.8.0'
       implementation 'androidx.core:core-ktx:1.13.1'
   }
   ```
3. `AndroidManifest.xml`:
   - Bubblewrap'in `LauncherActivity`'sinin MAIN/LAUNCHER `intent-filter`'ını kaldırıp şunu ekle (Bubblewrap'in açılış ekranı ve yedek davranışı bu etkinlikte yoktur; Chrome yoksa tarayıcıda açar):
   ```xml
   <activity android:name=".reminders.TilmizActivity" android:exported="true"
       android:theme="@android:style/Theme.Translucent.NoTitleBar">
       <intent-filter>
           <action android:name="android.intent.action.MAIN" />
           <category android:name="android.intent.category.LAUNCHER" />
       </intent-filter>
   </activity>
   <service android:name="androidx.browser.customtabs.PostMessageService" android:exported="true" />
   <receiver android:name=".reminders.ReminderReceiver" android:exported="false" />
   <receiver android:name=".reminders.BootReceiver" android:exported="false">
       <intent-filter>
           <action android:name="android.intent.action.BOOT_COMPLETED" />
           <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
       </intent-filter>
   </receiver>
   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```
4. `Reminders.BASE_URL` ve `ORIGIN` `app.config.json`'daki adresle aynı olmalı.

## Nasıl çalışır
1. `TilmizActivity` Chrome'a bağlanır, kendi oturumuyla TWA'yı açar; sayfa yüklenince `requestPostMessageChannel` ister.
2. Kanal hazır olunca `"tilmiz-native-hello"` gönderir; web tarafı gelen portu saklar ve planı JSON olarak yollar (her çalışmadan sonra yeniden).
3. `Reminders.schedule` planı `SharedPreferences`'a yazar, en fazla 40 alarm kurar (`setAndAllowWhileIdle`, tam zaman izni gerekmez).
4. Zamanı gelince `ReminderReceiver` bildirimi gösterir (3 saatten eskiyse göstermez). Dokunulunca uygulama `?n=etiket#calis` ile açılır; web tarafı hatırlatmanın işe yaradığını kaydeder ve sonraki saatleri buna göre ayarlar.
5. Telefon yeniden başlarsa `BootReceiver` planı yeniden kurar.

## Play Console
- Veri güvenliği: değişmez (veri toplanmıyor).
- Aileler Politikası: bildirimler reklam içermez, günde en fazla bir (seri hatırlatmasıyla iki), sessiz saatlerde (varsayılan 21:00–08:00) gönderilmez, kullanıcı Ayarlar'dan kapatabilir.
