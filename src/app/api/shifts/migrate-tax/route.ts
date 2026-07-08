// One-time migration: recalculate station tax at 5.16% for all existing shifts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const NEW_TAX_RATE = 0.0516;

export async function POST() {
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, notes, amount_earned")
    .eq("location_name", "Station Cleaning");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shifts?.length) return NextResponse.json({ updated: 0 });

  let updated = 0;
  for (const shift of shifts) {
    const notes = shift.notes ?? "";
    if (!notes.startsWith("__station__")) continue;

    const gross = parseFloat(shift.amount_earned) || 0;
    const newTax = (gross * NEW_TAX_RATE).toFixed(2);

    // Replace tax value in notes
    const newNotes = notes.replace(/tax:[\d.]+/, `tax:${newTax}`);
    if (newNotes === notes) continue;

    await supabase.from("shifts").update({ notes: newNotes }).eq("id", shift.id);
    updated++;
  }

  return NextResponse.json({ updated, message: `Updated ${updated} station shifts to 5.16% tax rate` });
}
