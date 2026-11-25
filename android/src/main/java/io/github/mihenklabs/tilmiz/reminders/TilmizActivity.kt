// Tilmiz başlatıcısı: TWA'yı kendi CustomTabsSession'ımızla açar ve web sayfasıyla postMessage kanalı kurar.
// Web tarafı (src/notify.js) ilk mesajla gelen port üzerinden 14 günlük hatırlatma planını gönderir;
// burada AlarmManager ile zamanlanır. Kaynak: Chrome "PostMessage for TWA" ve android-browser-helper
// demos/twa-post-message (Apache-2.0).
package io.github.mihenklabs.tilmiz.reminders

import android.app.Activity
import android.content.ComponentName
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.browser.customtabs.CustomTabsCallback
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsServiceConnection
import androidx.browser.customtabs.CustomTabsSession
import androidx.browser.trusted.TrustedWebActivityIntentBuilder
import org.json.JSONObject

class TilmizActivity : Activity() {
    private var session: CustomTabsSession? = null
    private var connection: CustomTabsServiceConnection? = null
    private var channelRequested = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val browser = CustomTabsClient.getPackageName(this, null)
        if (browser == null) { // Chrome yoksa: tarayıcıda aç
            startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, launchUrl()))
            finish(); return
        }
        val conn = object : CustomTabsServiceConnection() {
            override fun onCustomTabsServiceConnected(name: ComponentName, client: CustomTabsClient) {
                client.warmup(0L)
                val s = client.newSession(callback) ?: return
                session = s
                TrustedWebActivityIntentBuilder(launchUrl()).build(s).launchTrustedWebActivity(this@TilmizActivity)
            }
            override fun onServiceDisconnected(name: ComponentName) { session = null }
        }
        connection = conn
        CustomTabsClient.bindCustomTabsService(this, browser, conn)
    }

    // Bildirime dokunarak gelindiyse ?n=etiket ile açılır (uygulama "işe yaradı" diye kaydeder)
    private fun launchUrl(): Uri = intent?.data?.takeIf { it.toString().startsWith(Reminders.BASE_URL) } ?: Uri.parse(Reminders.BASE_URL)

    private val callback = object : CustomTabsCallback() {
        override fun onNavigationEvent(navigationEvent: Int, extras: Bundle?) {
            if (navigationEvent == NAVIGATION_FINISHED && !channelRequested) {
                channelRequested = true
                session?.requestPostMessageChannel(Reminders.ORIGIN, Reminders.ORIGIN, Bundle())
            }
        }

        override fun onMessageChannelReady(extras: Bundle?) {
            val s = session ?: return
            s.postMessage("tilmiz-native-hello", null)
            // Uygulama kapalıyken gösterilen bildirimleri web tarafına bildir
            for (shown in Reminders.takeShown(this@TilmizActivity)) s.postMessage(shown.toString(), null)
        }

        override fun onPostMessage(message: String, extras: Bundle?) {
            try {
                val m = JSONObject(message)
                if (m.optString("type") == "tilmiz-plan") Reminders.savePlanAndSchedule(this@TilmizActivity, m)
            } catch (e: Exception) { Log.w("Tilmiz", "geçersiz mesaj", e) }
        }

        override fun onRelationshipValidationResult(relation: Int, requestedOrigin: Uri, result: Boolean, extras: Bundle?) {
            if (!result) Log.w("Tilmiz", "assetlinks doğrulanamadı: $requestedOrigin (use_as_origin ilişkisi gerekli)")
        }
    }

    override fun onDestroy() {
        connection?.let { try { unbindService(it) } catch (_: Exception) {} }
        super.onDestroy()
    }
}
