// src/app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateUserByEmail } from "@/lib/get-or-create-user";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUserByEmail(
      session.user.email,
      session.user.name ?? undefined,
      session.user.image ?? undefined
    );

    const { endpoint, keys } = await request.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/push/subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUserByEmail(session.user.email);
    const { endpoint } = await request.json();

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/push/subscribe error:", err);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
