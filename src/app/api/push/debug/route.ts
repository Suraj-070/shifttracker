import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // 1. Check subscriptions
  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint")
    .limit(5);

  // 2. Check settings
  const { data: settings, error: setErr } = await supabase
    .from("notification_settings")
    .select("*")
    .limit(5);

  // 3. Check env vars
  const vapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = !!process.env.VAPID_PRIVATE_KEY;
  const groqKey = !!process.env.GROQ_API_KEY;

  // 4. Current Sydney time
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit", minute: "2-digit",
    hour12: false, weekday: "long",
  }).formatToParts(now);
  const hour = parts.find(p => p.type === "hour")?.value ?? "??";
  const minute = parts.find(p => p.type === "minute")?.value ?? "??";
  const weekday = parts.find(p => p.type === "weekday")?.value ?? "??";

  // 5. Today's date in Sydney
  const sydneyDate = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const [dd, mm, yyyy] = sydneyDate.split("/");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // 6. Check today's station shifts
  const { data: todayShifts } = await supabase
    .from("shifts")
    .select("id, covering_for, shift_date, location_name")
    .eq("shift_date", dateStr)
    .eq("location_name", "Station Cleaning");

  return NextResponse.json({
    sydneyTime: `${hour}:${minute}`,
    sydneyDay: weekday,
    todayDate: dateStr,
    subscriptions: subs?.length ?? 0,
    subscriptionError: subErr?.message ?? null,
    settings: settings?.map(s => ({
      hall_enabled: s.hall_reminder_enabled,
      hall_days: s.hall_reminder_days,
      hall_time: s.hall_reminder_time,
      hall_venue: s.hall_reminder_venue,
      station_reminders: s.station_reminders,
    })) ?? [],
    settingsError: setErr?.message ?? null,
    todayStationShifts: todayShifts ?? [],
    envVars: { vapidPublic, vapidPrivate, groqKey },
  });
}
