package io.github.mihenklabs.tilmiz.reminders;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Telefon yeniden başlayınca ya da uygulama güncellenince alarmlar silinir: kayıtlı planı yeniden kur. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) Reminders.schedule(ctx);
    }
}
