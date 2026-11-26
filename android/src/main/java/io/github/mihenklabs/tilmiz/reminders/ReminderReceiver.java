package io.github.mihenklabs.tilmiz.reminders;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONException;
import org.json.JSONObject;

/** Zamanı gelen hatırlatmayı gösterir. */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String item = intent.getStringExtra("item");
        if (item == null) return;
        try {
            Reminders.show(ctx, new JSONObject(item));
        } catch (JSONException ignored) {
        }
    }
}
