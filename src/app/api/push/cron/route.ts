// src/app/api/push/cron/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/lib/web-push";

export const runtime = "nodejs";
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function nowSydney() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit", minute: "2-digit",
    hour12: false, weekday: "short",
  }).formatToParts(now);

  const hour    = parts.find(p => p.type === "hour")?.value    ?? "00";
  const minute  = parts.find(p => p.type === "minute")?.value  ?? "00";
  const weekday = parts.find(p => p.type === "weekday")?.value ?? "Mon";
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };

  return {
    hhmm: `${hour}:${minute}`,
    dayOfWeek: dayMap[weekday] ?? 0,
  };
}

function subtractMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - mins);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hhmm, dayOfWeek } = nowSydney();
  let fired = 0;

  // Load all users with any notification setting enabled
  const { data: allSettings } = await supabase
    .from("notification_settings")
    .select("*");

  if (!allSettings?.length) return NextResponse.json({ fired: 0, time: hhmm });

  for (const setting of allSettings) {
    const userId = setting.user_id;

    // Get this user's push subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) continue;

    // ── Feature 1: Hall shift logging reminder ──────────────────────────────
    if (
      setting.hall_reminder_enabled &&
      (setting.hall_reminder_days as number[]).includes(dayOfWeek) &&
      hhmm === (setting.hall_reminder_time ?? "21:00")
    ) {
      const venue = setting.hall_reminder_venue ?? "Eastgardens";

      for (const sub of subs) {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: "ShiftTracker 🎬",
            body: `Did you add your ${venue} shifts today?`,
            tag: "hall-reminder",
            url: "/?tab=shifts",
          }
        );
        if (result.success) fired++;
        if (result.expired) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    // ── Feature 2: Station clock-in/out reminders ───────────────────────────
    const stationReminders = (setting.station_reminders ?? []) as Array<{
      id: string;
      station: string;
      clockin: string;
      clockout: string;
      offset: number;
      enabled: boolean;
    }>;

    for (const reminder of stationReminders) {
      if (!reminder.enabled || !reminder.station) continue;

      // Clock-in reminder
      const clockinAlert = subtractMins(reminder.clockin, reminder.offset);
      if (hhmm === clockinAlert) {
        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title: `🚉 Clock in at ${reminder.clockin}`,
              body: `${reminder.station} — ${reminder.offset} min until your shift starts`,
              tag: `clockin-${reminder.id}`,
              url: "/",
              requireInteraction: true,
            }
          );
          if (result.success) fired++;
          if (result.expired) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }

      // Clock-out reminder
      const clockoutAlert = subtractMins(reminder.clockout, reminder.offset);
      if (hhmm === clockoutAlert) {
        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title: `🚉 Clock out at ${reminder.clockout}`,
              body: `${reminder.station} — ${reminder.offset} min until your shift ends`,
              tag: `clockout-${reminder.id}`,
              url: "/",
              requireInteraction: true,
            }
          );
          if (result.success) fired++;
          if (result.expired) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
    }
  }

  return NextResponse.json({ fired, time: hhmm, day: dayOfWeek });
}
