import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/lib/web-push";

export async function GET() {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .limit(1);

  if (!subs?.length) return NextResponse.json({ error: "No subscriptions" });

  const result = await sendPushNotification(subs[0], {
    title: "🔔 ShiftTracker",
    body: "Testing new badge icon!",
    tag: "test",
    url: "/",
  });

  return NextResponse.json({ result });
}
