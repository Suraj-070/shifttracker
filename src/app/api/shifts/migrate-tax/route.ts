// Recalculate unpaid station shifts with new rates
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function parseHours(notes: string, hoursWorked: number): number {
  return hoursWorked || 0;
}

export async function POST(request: Request) {
  let taxRate = 0.0598;
  let afternoonRate = 37.91;
  let saturdayRate = 47.38;
  let sundayRate = 60.94;

  try {
    const body = await request.json();
    if (body.taxRate) taxRate = body.taxRate;
    if (body.afternoonRate) afternoonRate = body.afternoonRate;
    if (body.saturdayRate) saturdayRate = body.saturdayRate;
    if (body.sundayRate) sundayRate = body.sundayRate;
  } catch {}

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, notes, amount_earned, hours_worked, shift_day, status")
    .eq("location_name", "Station Cleaning")
    .eq("status", "Unpaid");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shifts?.length) return NextResponse.json({ updated: 0, message: "No unpaid station shifts found" });

  let updated = 0;

  for (const shift of shifts) {
    const notes = (shift.notes ?? "") as string;
    if (!notes.startsWith("__station__")) continue;

    const hours = parseFloat(shift.hours_worked) || 0;
    const day = (shift.shift_day ?? "").toLowerCase();

    // Determine rate by day
    let hourlyRate = afternoonRate;
    if (day === "saturday") hourlyRate = saturdayRate;
    else if (day === "sunday") hourlyRate = sundayRate;

    const newGross = hours > 0 ? hours * hourlyRate : parseFloat(shift.amount_earned) || 0;
    const newTax = newGross * taxRate;
    const newGrossStr = newGross.toFixed(2);
    const newTaxStr = newTax.toFixed(2);

    // Update notes with new tax
    let newNotes = notes;
    if (notes.match(/tax:[\d.]+/)) {
      newNotes = notes.replace(/tax:[\d.]+/, `tax:${newTaxStr}`);
    } else {
      newNotes = notes.replace("__station__|", `__station__|tax:${newTaxStr}|`);
    }

    const { error: updateErr } = await supabase
      .from("shifts")
      .update({
        amount_earned: newGrossStr,
        notes: newNotes,
      })
      .eq("id", shift.id);

    if (!updateErr) updated++;
  }

  return NextResponse.json({
    updated,
    total: shifts.length,
    rates: { afternoonRate, saturdayRate, sundayRate, taxRate: `${(taxRate * 100).toFixed(2)}%` },
    message: `Updated ${updated} of ${shifts.length} unpaid station shifts`,
  });
}
