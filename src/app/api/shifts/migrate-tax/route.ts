// One-time migration: recalculate station tax for all existing shifts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  // Accept custom rate from body, default to 5.98%
  let taxRate = 0.0598;
  try {
    const body = await request.json();
    if (body.taxRate) taxRate = body.taxRate;
  } catch {}

  // Try both column name formats (snake_case from DB)
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, notes, amount_earned")
    .eq("location_name", "Station Cleaning");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shifts?.length) return NextResponse.json({ updated: 0, message: "No station shifts found. Check location_name = 'Station Cleaning'" });

  let updated = 0;
  let skipped = 0;

  for (const shift of shifts) {
    const notes = (shift.notes ?? "") as string;

    // Handle shifts that may not have __station__ prefix
    const gross = parseFloat(shift.amount_earned ?? "0") || 0;
    const newTax = (gross * taxRate).toFixed(2);

    let newNotes: string;
    if (notes.startsWith("__station__")) {
      if (notes.match(/tax:[\d.]+/)) {
        newNotes = notes.replace(/tax:[\d.]+/, `tax:${newTax}`);
      } else {
        newNotes = notes.replace("__station__|", `__station__|tax:${newTax}|`);
      }
    } else {
      // Not a station shift format we recognise
      skipped++;
      continue;
    }

    if (newNotes === notes) { skipped++; continue; }

    const { error: updateErr } = await supabase
      .from("shifts")
      .update({ notes: newNotes })
      .eq("id", shift.id);

    if (!updateErr) updated++;
  }

  return NextResponse.json({
    updated,
    skipped,
    total: shifts.length,
    taxRate: `${(taxRate * 100).toFixed(2)}%`,
    message: `Updated ${updated} of ${shifts.length} station shifts`,
  });
}
