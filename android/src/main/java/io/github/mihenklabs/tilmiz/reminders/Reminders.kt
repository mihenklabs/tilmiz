// Hatırlatma planının saklanması, AlarmManager ile zamanlanması ve bildirimin gösterilmesi.
// Plan web tarafında (src/notify.js) hesaplanır; burada yalnızca zamanında gösterilir. Veri cihazdan çıkmaz.
package io.github.mihenklabs.tilmiz.reminders

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import io.github.mihenklabs.tilmiz.R
import org.json.JSONArray
import org.json.JSONObject

object Reminders {
    const val BASE_URL = "https://mihenklabs.github.io/tilmiz/"
    val ORIGIN: Uri = Uri.parse("https://mihenklabs.github.io")
    private const val PREFS = "tilmiz-reminders"
    private const val CHANNEL = "hatirlatmalar"
    private const val MAX = 40 // planda en fazla 40 kayıt
    private const val STALE_MS = 3 * 3600_000L // 3 saatten eski hatırlatma gösterilmez (ör. telefon kapalıydı)

    fun savePlanAndSchedule(ctx: Context, msg: JSONObject) {
        val plan = msg.optJSONArray("plan") ?: JSONArray()
        prefs(ctx).edit().putString("plan", plan.toString()).apply()
        schedule(ctx)
    }

    // Kayıtlı planı yeniden zamanla (yeni plan geldiğinde ve açılışta/yeniden başlatmada)
    fun schedule(ctx: Context) {
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        for (i in 0 until MAX) am.cancel(pending(ctx, i, null)) // eski alarmlar
        val plan = JSONArray(prefs(ctx).getString("plan", "[]"))
        val now = System.currentTimeMillis()
        for (i in 0 until minOf(plan.length(), MAX)) {
            val p = plan.getJSONObject(i)
            val at = p.optLong("at")
            if (at <= now) continue
            // Tam zaman izni gerekmez: setAndAllowWhileIdle birkaç dakika kayabilir, hatırlatma için yeterli
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(ctx, i, p))
        }
    }

    private fun pending(ctx: Context, i: Int, p: JSONObject?): PendingIntent {
        val it = Intent(ctx, ReminderReceiver::class.java).setAction("tilmiz.REMIND.$i")
        if (p != null) it.putExtra("item", p.toString())
        return PendingIntent.getBroadcast(ctx, i, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun show(ctx: Context, p: JSONObject) {
        if (System.currentTimeMillis() - p.optLong("at") > STALE_MS) return
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Çalışma hatırlatmaları", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Çalışma alışkanlığına göre günde en fazla bir hatırlatma"
            })
        }
        val tag = p.optString("tag")
        val url = Uri.parse(BASE_URL).buildUpon().appendQueryParameter("n", tag).fragment("calis").build()
        val open = PendingIntent.getActivity(ctx, tag.hashCode(),
            Intent(ctx, TilmizActivity::class.java).setData(url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification_icon)
            .setContentTitle(p.optString("title"))
            .setContentText(p.optString("body"))
            .setStyle(NotificationCompat.BigTextStyle().bigText(p.optString("body")))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()
        try { NotificationManagerCompat.from(ctx).notify("tilmiz", 1, n) } catch (_: SecurityException) { return }
        // Web tarafına sonraki açılışta bildirilmek üzere kaydet
        val shown = JSONArray(prefs(ctx).getString("shown", "[]"))
        shown.put(JSONObject().put("type", "shown").put("tag", tag).put("at", System.currentTimeMillis()))
        prefs(ctx).edit().putString("shown", shown.toString()).apply()
    }

    fun takeShown(ctx: Context): List<JSONObject> {
        val a = JSONArray(prefs(ctx).getString("shown", "[]"))
        prefs(ctx).edit().putString("shown", "[]").apply()
        return (0 until a.length()).map { a.getJSONObject(it) }
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val item = intent.getStringExtra("item") ?: return
        Reminders.show(ctx, JSONObject(item))
    }
}

// Telefon yeniden başlayınca alarmlar silinir: kayıtlı planı yeniden kur
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) Reminders.schedule(ctx)
    }
}
