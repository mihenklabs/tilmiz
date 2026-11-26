// Bubblewrap'in ürettiği projeye yerel hatırlatma kodunu (android/) ekler. Tekrar çalıştırmak güvenlidir.
// Kullanım: node tools/android/integrate.mjs <proje-klasörü>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function patch(file, edits) {
  let s = fs.readFileSync(file, "utf8");
  for (const [marker, anchor, insert] of edits) {
    if (s.includes(marker)) continue; // zaten eklenmiş
    if (!s.includes(anchor)) throw new Error(`${path.basename(file)}: "${anchor.trim().slice(0, 60)}" bulunamadı (Bubblewrap şablonu değişmiş olabilir)`);
    s = s.replace(anchor, insert(anchor));
  }
  fs.writeFileSync(file, s);
}

export function integrate(proj) {
  const app = path.join(proj, "app/src/main");
  const pkgDir = path.join(app, "java/io/github/mihenklabs/tilmiz");
  if (!fs.existsSync(path.join(pkgDir, "LauncherActivity.java"))) throw new Error("LauncherActivity.java yok: paket adı ya da proje klasörü yanlış");
  copyDir(path.join(root, "android/src/main/java"), path.join(app, "java"));

  // 1) LauncherActivity: postMessage köprüsünü ekle (açılış ekranı ve yedek davranış Bubblewrap'te kalır)
  patch(path.join(pkgDir, "LauncherActivity.java"), [
    ["import io.github.mihenklabs.tilmiz.reminders.PlanBridge;", "import android.os.Bundle;\n",
      a => a + "\nimport androidx.browser.customtabs.CustomTabsCallback;\nimport com.google.androidbrowserhelper.trusted.TwaLauncher;\nimport io.github.mihenklabs.tilmiz.reminders.PlanBridge;\n"],
    ["private PlanBridge planBridge;", "    @Override\n    protected void onCreate(",
      a => `    // Tilmiz: web sayfasından hatırlatma planını alan postMessage köprüsü (tools/android/integrate.mjs)
    private PlanBridge planBridge;

    @Override
    protected CustomTabsCallback getCustomTabsCallback() {
        if (planBridge == null) planBridge = new PlanBridge(this, super.getCustomTabsCallback());
        return planBridge;
    }

    @Override
    protected TwaLauncher createTwaLauncher() {
        TwaLauncher launcher = super.createTwaLauncher();
        getCustomTabsCallback();
        planBridge.setLauncher(launcher);
        return launcher;
    }

` + a],
  ]);

  // 2) Manifest: alıcılar ve açılışta yeniden kurma izni
  patch(path.join(app, "AndroidManifest.xml"), [
    ["android.permission.RECEIVE_BOOT_COMPLETED", '<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>',
      a => a + '\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>'],
    [".reminders.ReminderReceiver", "    </application>",
      a => `        <!-- Tilmiz hatırlatmaları (tools/android/integrate.mjs) -->
        <receiver android:name=".reminders.ReminderReceiver" android:exported="false" />
        <receiver android:name=".reminders.BootReceiver" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
` + a],
  ]);

  // 3) Yayın imzası: anahtar ve şifre depoda değil, ortam değişkenlerinde (tools/android/release.ps1 sorar)
  patch(path.join(proj, "app/build.gradle"), [
    ["TILMIZ_KEYSTORE", "    buildTypes {\n        release {\n",
      a => `    signingConfigs {
        release {
            if (System.getenv("TILMIZ_KEYSTORE")) {
                storeFile file(System.getenv("TILMIZ_KEYSTORE"))
                storePassword System.getenv("TILMIZ_KS_PASS")
                keyAlias System.getenv("TILMIZ_KEY_ALIAS") ?: "tilmiz"
                keyPassword System.getenv("TILMIZ_KEY_PASS") ?: System.getenv("TILMIZ_KS_PASS")
            }
        }
    }
` + a + `            if (System.getenv("TILMIZ_KEYSTORE")) signingConfig signingConfigs.release
`],
  ]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) { console.error("Kullanım: node tools/android/integrate.mjs <proje-klasörü>"); process.exit(1); }
  integrate(path.resolve(process.argv[2]));
  console.log("Hatırlatma kodu eklendi.");
}
