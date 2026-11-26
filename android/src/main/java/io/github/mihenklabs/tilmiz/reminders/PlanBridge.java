// Web sayfasıyla (src/notify.js) TWA postMessage kanalı: sayfa yüklenince kanal istenir, sayfa planı gönderir.
// Bubblewrap'in LauncherActivity'si korunur (açılış ekranı, yedek davranış, Play Billing); yalnızca
// getCustomTabsCallback() ile bu geri çağırma eklenir. Kaynak: Chrome "PostMessage for TWA".
package io.github.mihenklabs.tilmiz.reminders;

import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsSession;

import org.json.JSONObject;

import java.lang.reflect.Field;

import io.github.mihenklabs.tilmiz.R;

public class PlanBridge extends CustomTabsCallback {
    private static final String TAG = "TilmizPlan";
    private final Context ctx;
    @Nullable private final CustomTabsCallback inner; // Bubblewrap'in kendi geri çağırması (kalite denetimi)
    private Object launcher; // TwaLauncher: oturum yalnızca onun içinde tutuluyor
    private boolean requested;

    public PlanBridge(Context ctx, @Nullable CustomTabsCallback inner) {
        this.ctx = ctx.getApplicationContext();
        this.inner = inner;
    }

    public void setLauncher(Object launcher) { this.launcher = launcher; }

    // androidbrowserhelper TwaLauncher oturumu dışarı vermiyor; alanı türüne göre bul (ad değişse de çalışır)
    @Nullable
    private CustomTabsSession session() {
        if (launcher == null) return null;
        for (Class<?> c = launcher.getClass(); c != null; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (f.getType() != CustomTabsSession.class) continue;
                try {
                    f.setAccessible(true);
                    return (CustomTabsSession) f.get(launcher);
                } catch (Exception e) {
                    Log.w(TAG, "oturuma erişilemedi", e);
                    return null;
                }
            }
        }
        return null;
    }

    private Uri origin() {
        Uri u = Uri.parse(ctx.getString(R.string.launchUrl));
        return new Uri.Builder().scheme(u.getScheme()).authority(u.getAuthority()).build();
    }

    @Override
    public void onNavigationEvent(int navigationEvent, @Nullable Bundle extras) {
        if (inner != null) inner.onNavigationEvent(navigationEvent, extras);
        if (navigationEvent != NAVIGATION_FINISHED || requested) return;
        CustomTabsSession s = session();
        if (s == null) return;
        requested = true;
        boolean ok = s.requestPostMessageChannel(origin(), origin(), new Bundle());
        if (!ok) { requested = false; Log.w(TAG, "postMessage kanalı istenemedi (Chrome 115+ gerekir)"); }
    }

    @Override
    public void onMessageChannelReady(@Nullable Bundle extras) {
        if (inner != null) inner.onMessageChannelReady(extras);
        CustomTabsSession s = session();
        if (s == null) return;
        s.postMessage("tilmiz-native-hello", null);
        // Uygulama kapalıyken gösterilen bildirimleri web tarafına bildir (işe yarayıp yaramadığını öğrensin)
        for (String m : Reminders.takeShown(ctx)) s.postMessage(m, null);
    }

    @Override
    public void onPostMessage(@NonNull String message, @Nullable Bundle extras) {
        if (inner != null) inner.onPostMessage(message, extras);
        try {
            JSONObject m = new JSONObject(message);
            if ("tilmiz-plan".equals(m.optString("type"))) Reminders.savePlanAndSchedule(ctx, m);
        } catch (Exception e) {
            Log.w(TAG, "geçersiz mesaj", e);
        }
    }

    @Override
    public void onRelationshipValidationResult(int relation, @NonNull Uri requestedOrigin, boolean result, @Nullable Bundle extras) {
        if (inner != null) inner.onRelationshipValidationResult(relation, requestedOrigin, result, extras);
        if (!result) Log.w(TAG, "assetlinks doğrulanamadı: " + requestedOrigin + " (use_as_origin ilişkisi gerekli)");
    }

    @Override
    public void extraCallback(@NonNull String callbackName, @Nullable Bundle args) {
        if (inner != null) inner.extraCallback(callbackName, args);
    }

    @Nullable
    @Override
    public Bundle extraCallbackWithResult(@NonNull String callbackName, @Nullable Bundle args) {
        return inner != null ? inner.extraCallbackWithResult(callbackName, args) : null;
    }
}
