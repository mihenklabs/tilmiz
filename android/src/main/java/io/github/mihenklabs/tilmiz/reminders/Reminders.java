// Hatırlatma planının saklanması, AlarmManager ile zamanlanması ve bildirimin gösterilmesi.
// Plan web tarafında (src/notify.js) hesaplanır; burada yalnızca zamanında gösterilir. Veri cihazdan çıkmaz.
package io.github.mihenklabs.tilmiz.reminders;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import io.github.mihenklabs.tilmiz.LauncherActivity;
import io.github.mihenklabs.tilmiz.R;

public final class Reminders {
    private static final String PREFS = "tilmiz-reminders";
    static final String CHANNEL = "hatirlatmalar";
    private static final int MAX = 40; // planda en fazla 40 kayıt
    private static final long STALE_MS = 3 * 3600_000L; // 3 saatten eski hatırlatma gösterilmez (ör. telefon kapalıydı)

    private Reminders() {}

    /** Web tarafından gelen {type:"tilmiz-plan", plan:[...]} mesajını sakla ve alarmları kur. */
    public static void savePlanAndSchedule(Context ctx, JSONObject msg) {
        JSONArray plan = msg.optJSONArray("plan");
        if (plan == null) plan = new JSONArray();
        prefs(ctx).edit().putString("plan", plan.toString()).apply();
        schedule(ctx);
    }

    /** Kayıtlı planı yeniden zamanla (yeni plan geldiğinde ve telefon yeniden başladığında). */
    public static void schedule(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am == null) return;
        for (int i = 0; i < MAX; i++) am.cancel(pending(ctx, i, null)); // eski alarmlar
        JSONArray plan;
        try {
            plan = new JSONArray(prefs(ctx).getString("plan", "[]"));
        } catch (JSONException e) {
            return;
        }
        long now = System.currentTimeMillis();
        for (int i = 0; i < Math.min(plan.length(), MAX); i++) {
            JSONObject p = plan.optJSONObject(i);
            if (p == null) continue;
            long at = p.optLong("at");
            if (at <= now) continue;
            // Tam zaman izni gerekmez: setAndAllowWhileIdle birkaç dakika kayabilir, hatırlatma için yeterli
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(ctx, i, p));
        }
    }

    private static PendingIntent pending(Context ctx, int i, JSONObject p) {
        Intent it = new Intent(ctx, ReminderReceiver.class).setAction("tilmiz.REMIND." + i);
        if (p != null) it.putExtra("item", p.toString());
        return PendingIntent.getBroadcast(ctx, i, it, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Hatırlatmanın açacağı adres: uygulamanın başlangıç adresi + ?n=etiket#calis */
    static Uri openUrl(Context ctx, String tag) {
        return Uri.parse(ctx.getString(R.string.launchUrl)).buildUpon()
                .appendQueryParameter("n", tag).fragment("calis").build();
    }

    static void show(Context ctx, JSONObject p) {
        if (System.currentTimeMillis() - p.optLong("at") > STALE_MS) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return;
        ensureChannel(ctx);
        String tag = p.optString("tag");
        Intent open = new Intent(ctx, LauncherActivity.class)
                .setAction(Intent.ACTION_VIEW)
                .setData(openUrl(ctx, tag))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, tag.hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String body = p.optString("body");
        NotificationCompat.Builder n = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setColor(ContextCompat.getColor(ctx, R.color.colorPrimary))
                .setContentTitle(p.optString("title"))
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_REMINDER);
        try {
            NotificationManagerCompat.from(ctx).notify("tilmiz", 1, n.build());
        } catch (SecurityException e) {
            return;
        }
        // Web tarafına sonraki açılışta bildirilmek üzere kaydet ("gösterildi")
        try {
            JSONArray shown = new JSONArray(prefs(ctx).getString("shown", "[]"));
            shown.put(new JSONObject().put("type", "shown").put("tag", tag).put("at", System.currentTimeMillis()));
            prefs(ctx).edit().putString("shown", shown.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Çalışma hatırlatmaları", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Çalışma alışkanlığına göre günde en fazla bir hatırlatma");
        nm.createNotificationChannel(ch);
    }

    /** Uygulama kapalıyken gösterilen bildirimler (web tarafına iletilip silinir). */
    static List<String> takeShown(Context ctx) {
        List<String> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(prefs(ctx).getString("shown", "[]"));
            for (int i = 0; i < a.length(); i++) out.add(a.getJSONObject(i).toString());
        } catch (JSONException ignored) {
        }
        prefs(ctx).edit().putString("shown", "[]").apply();
        return out;
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
