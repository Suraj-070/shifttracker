// src/app/api/push/cron/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/lib/web-push";
import Groq from "groq-sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

<<<<<<< HEAD
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

=======
>>>>>>> c2b3e74b269945d0cee92cbae7a2e5fa0d20969a
function nowSydney() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit", minute: "2-digit",
    hour12: false, weekday: "long", day: "numeric", month: "short",
  }).formatToParts(now);

  const hour    = parts.find(p => p.type === "hour")?.value    ?? "00";
  const minute  = parts.find(p => p.type === "minute")?.value  ?? "00";
  const weekday = parts.find(p => p.type === "weekday")?.value ?? "Monday";
  const day     = parts.find(p => p.type === "day")?.value     ?? "1";
  const month   = parts.find(p => p.type === "month")?.value   ?? "Jan";

  const dayMap: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };

  // Today's date as YYYY-MM-DD in Sydney time
  const sydneyDate = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  // en-AU format: DD/MM/YYYY → convert to YYYY-MM-DD
  const [dd, mm, yyyy] = sydneyDate.split("/");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return {
    hhmm: `${hour}:${minute}`,
    dayOfWeek: dayMap[weekday] ?? 0,
    weekdayName: weekday,
    dateStr,
    dateLabel: `${weekday} ${day} ${month}`,
  };
}

function subtractMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - mins);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

<<<<<<< HEAD
// ── AI notification generator ──────────────────────────────────────────────────
async function generateNotification(context: {
  type: "hall_reminder" | "clockin" | "clockout";
  venue?: string;
  station?: string;
  time?: string;
  weekday?: string;
  minsUntil?: number;
}): Promise<{ title: string; body: string }> {
  try {
    const prompts = {
      hall_reminder: `Generate a short, friendly push notification reminding Suraj to log his hall shifts at ${context.venue} today (${context.weekday}). 
Make it casual, fun and personal. Use 1 relevant emoji in the title.
Keep title under 40 chars, body under 80 chars.
Vary the message each time — don't always say the same thing.
Return JSON only: {"title": "...", "body": "..."}`,

      clockin: `Generate a short push notification reminding Suraj to clock in at ${context.station} in ${context.minsUntil} minutes (at ${context.time}).
Make it feel urgent but friendly. Use 🚉 emoji.
Keep title under 40 chars, body under 80 chars.
Return JSON only: {"title": "...", "body": "..."}`,

      clockout: `Generate a short push notification reminding Suraj his shift at ${context.station} ends in ${context.minsUntil} minutes (at ${context.time}).
Make it casual and friendly. Use 🚉 emoji.
Keep title under 40 chars, body under 80 chars.
Return JSON only: {"title": "...", "body": "..."}`,
    };

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that writes short, casual, personal push notifications. Always return valid JSON only with title and body fields. No markdown, no backticks.",
        },
        { role: "user", content: prompts[context.type] },
      ],
      max_tokens: 100,
      temperature: 0.9, // high temp for variety
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(text);
    if (parsed.title && parsed.body) return parsed;
    throw new Error("Invalid response");
  } catch {
    // Fallback to static messages if AI fails
    const fallbacks = {
      hall_reminder: {
        title: `🎬 Shift reminder`,
        body: `Did you log your ${context.venue} shifts today?`,
      },
      clockin: {
        title: `🚉 Clock in at ${context.time}`,
        body: `${context.station} — ${context.minsUntil} min until your shift starts`,
      },
      clockout: {
        title: `🚉 Clock out at ${context.time}`,
        body: `${context.station} — ${context.minsUntil} min until your shift ends`,
      },
    };
    return fallbacks[context.type];
  }
}

// ── Main cron handler ──────────────────────────────────────────────────────────
export async function GET() {
  const { hhmm, dayOfWeek, weekdayName, dateStr, dateLabel } = nowSydney();
=======
export async function GET(request: Request) {
  const { hhmm, dayOfWeek } = nowSydney();
>>>>>>> c2b3e74b269945d0cee92cbae7a2e5fa0d20969a
  let fired = 0;

  const { data: allSettings } = await supabase
    .from("notification_settings")
    .select("*");

  if (!allSettings?.length) {
    return NextResponse.json({ fired: 0, time: hhmm });
  }

  for (const setting of allSettings) {
    const userId = setting.user_id;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) continue;

    // ── Feature 1: Hall shift logging reminder (AI) ──────────────────────────
    if (
      setting.hall_reminder_enabled &&
      (setting.hall_reminder_days as number[]).includes(dayOfWeek) &&
      hhmm === (setting.hall_reminder_time ?? "21:00")
    ) {
      const venue = setting.hall_reminder_venue ?? "Eastgardens";

      const { title, body } = await generateNotification({
        type: "hall_reminder",
        venue,
        weekday: weekdayName,
      });

      for (const sub of subs) {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body, tag: "hall-reminder", url: "/?tab=shifts" }
        );
        if (result.success) fired++;
        if (result.expired) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    // ── Feature 2: Station clock-in/out (AI + date check) ───────────────────
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

      // ✅ KEY FIX: Only fire if there's actually a station shift TODAY
      const { data: todayShifts } = await supabase
        .from("shifts")
        .select("id")
        .eq("user_id", userId)
        .eq("shift_date", dateStr)
        .eq("location_name", "Station Cleaning")
        .eq("covering_for", reminder.station)
        .limit(1);

      if (!todayShifts?.length) continue; // No shift today → skip

      // Clock-in reminder
      const clockinAlert = subtractMins(reminder.clockin, reminder.offset);
      if (hhmm === clockinAlert) {
        const { title, body } = await generateNotification({
          type: "clockin",
          station: reminder.station,
          time: reminder.clockin,
          minsUntil: reminder.offset,
          weekday: weekdayName,
        });

        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            { title, body, tag: `clockin-${reminder.id}`, url: "/", requireInteraction: true }
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
        const { title, body } = await generateNotification({
          type: "clockout",
          station: reminder.station,
          time: reminder.clockout,
          minsUntil: reminder.offset,
          weekday: weekdayName,
        });

        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            { title, body, tag: `clockout-${reminder.id}`, url: "/", requireInteraction: true }
          );
          if (result.success) fired++;
          if (result.expired) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
    }
  }

<<<<<<< HEAD
  return NextResponse.json({ fired, time: hhmm, day: weekdayName, date: dateStr });
}
=======
  return NextResponse.json({ fired, time: hhmm, day: dayOfWeek });
}
>>>>>>> c2b3e74b269945d0cee92cbae7a2e5fa0d20969a
