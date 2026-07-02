import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint")
    .limit(10);

  const { data: settings, error: setErr } = await supabase
    .from("notification_settings")
    .select("*")
    .limit(10);

  return NextResponse.json({
    subscriptions: subs ?? [],
    subscriptionError: subErr?.message ?? null,
    settings: settings ?? [],
    settingsError: setErr?.message ?? null,
    vapidPublicKeySet: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPrivateKeySet: !!process.env.VAPID_PRIVATE_KEY,
  });
}
