// src/app/api/push/cron/route.ts
// Called by Vercel Cron every minute — checks who needs a notification and fires it

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/lib/web-push";
import { isStationShift, parseStationUserNote } from "@/types/database.types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Verify this is called by Vercel Cron (not a random request)
function isAuthorized(request: Request) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// Get current HH:MM in AEST (UTC+10 / UTC+11 DST)
// We store times in AEST so no timezone conversion needed on device
function nowAEST() {
  const now = new Date();
  // AEST = UTC+10, AEDT = UTC+11
  // Simple approach: use Sydney time via Intl
  const sydney = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour   = sydney.find(p => p.type === "hour")?.value ?? "00";
  const minute = sydney.find(p => p.type === "minute")?.value ?? "00";
  const weekday = sydney.find(p => p.type === "weekday")?.value ?? "Mon";

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };

  return {
    hhmm: `${hour}:${minute}`,
    dayOfWeek: weekdayMap[weekday] ?? 0,
    dateStr: now.toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })
      .split("/").reverse().join("-"), // YYYY-MM-DD
  };
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function subtractMinutes(hhmm: string, minutes: number): string {
  return addMinutes(hhmm, -minutes);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hhmm, dayOfWeek, dateStr } = nowAEST();

  // Get all users with notification settings enabled
  const { data: settings, error: settingsErr } = await supabase
    .from("notification_settings")
    .select("*, push_subscriptions(*)")
    .or("shift_reminder_enabled.eq.true,station_clockin_enabled.eq.true,station_clockout_enabled.eq.true");

  if (settingsErr || !settings?.length) {
    return NextResponse.json({ fired: 0 });
  }

  let fired = 0;

  for (const setting of settings) {
    const subs = setting.push_subscriptions as {
      endpoint: string; p256dh: string; auth: string;
    }[];
    if (!subs?.length) continue;

    const userId = setting.user_id;

    // ── Feature 1: Shift day reminder ──────────────────────────────────────
    if (setting.shift_reminder_enabled) {
      const reminderDays: number[] = setting.shift_reminder_days ?? [];
      const reminderTime: string = setting.shift_reminder_time ?? "21:00";

      if (reminderDays.includes(dayOfWeek) && hhmm === reminderTime) {
        // Get shifts for today
        const { data: shifts } = await supabase
          .from("shifts")
          .select("*")
          .eq("user_id", userId)
          .eq("shift_date", dateStr)
          .neq("location_name", "Station Cleaning");

        if (shifts?.length) {
          const shiftList = shifts
            .map(s => `🎬 ${s.covering_for} @ ${s.location_name}`)
            .join("\n");

          for (const sub of subs) {
            const result = await sendPushNotification(sub, {
              title: `📋 You have ${shifts.length} shift${shifts.length > 1 ? "s" : ""} today`,
              body: shiftList,
              tag: "shift-reminder",
              url: "/",
            });
            if (result.success) fired++;
            if (result.expired) {
              await supabase.from("push_subscriptions")
                .delete().eq("endpoint", sub.endpoint);
            }
          }
        }
      }
    }

    // ── Feature 2: Station clock-in / clock-out reminders ──────────────────
    if (setting.station_clockin_enabled || setting.station_clockout_enabled) {
      // Get today's station shifts
      const { data: stationShifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", userId)
        .eq("shift_date", dateStr)
        .eq("location_name", "Station Cleaning");

      if (stationShifts?.length) {
        for (const shift of stationShifts) {
          // Parse stored clock-in/out times from shift notes
          // Format stored: "__station__|clockin:16:00|clockout:21:15|tax:90.50||note"
          const notes = shift.notes ?? "";
          const clockinMatch = notes.match(/clockin:(\d{2}:\d{2})/);
          const clockoutMatch = notes.match(/clockout:(\d{2}:\d{2})/);

          const stationName = shift.covering_for ?? "station";

          // Clock-in reminder
          if (setting.station_clockin_enabled && clockinMatch) {
            const clockinTime = clockinMatch[1];
            const offset = setting.station_clockin_offset ?? 10;
            const reminderTime = subtractMinutes(clockinTime, offset);

            if (hhmm === reminderTime) {
              for (const sub of subs) {
                const result = await sendPushNotification(sub, {
                  title: `🚉 Clock in at ${clockinTime}`,
                  body: `${stationName} — ${offset} minutes until your shift starts`,
                  tag: `clockin-${shift.id}`,
                  url: "/",
                  requireInteraction: true,
                });
                if (result.success) fired++;
                if (result.expired) {
                  await supabase.from("push_subscriptions")
                    .delete().eq("endpoint", sub.endpoint);
                }
              }
            }
          }

          // Clock-out reminder
          if (setting.station_clockout_enabled && clockoutMatch) {
            const clockoutTime = clockoutMatch[1];
            const offset = setting.station_clockout_offset ?? 5;
            const reminderTime = subtractMinutes(clockoutTime, offset);

            if (hhmm === reminderTime) {
              for (const sub of subs) {
                const result = await sendPushNotification(sub, {
                  title: `🚉 Clock out at ${clockoutTime}`,
                  body: `${stationName} — ${offset} minutes until your shift ends`,
                  tag: `clockout-${shift.id}`,
                  url: "/",
                  requireInteraction: true,
                });
                if (result.success) fired++;
                if (result.expired) {
                  await supabase.from("push_subscriptions")
                    .delete().eq("endpoint", sub.endpoint);
                }
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ fired, time: hhmm, day: dayOfWeek });
}