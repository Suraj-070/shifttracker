// src/app/api/push/settings/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateUserByEmail } from "@/lib/get-or-create-user";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getOrCreateUserByEmail(session.user.email);

    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found

    return NextResponse.json(data ?? null);
  } catch (err) {
    console.error("GET /api/push/settings error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getOrCreateUserByEmail(session.user.email);
    const body = await request.json();

    const { error } = await supabase
      .from("notification_settings")
      .upsert(
        { user_id: user.id, ...body, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/push/settings error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
