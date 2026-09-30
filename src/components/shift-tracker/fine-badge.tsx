import React from "react";
import { AlertTriangle } from "lucide-react";
import { shiftFine } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

/** Small "Fined" tag shown on any shift that has a fine. Solid when it counts, outlined when it doesn't. */
export function FineBadge({ shift }: { shift: Pick<Shift, "locationName" | "notes"> }) {
  const fine = shiftFine(shift);
  if (fine.amount <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
        fine.included
          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          : "border border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300"
      }`}
      title={fine.included ? "Fine deducted from total" : "Fine recorded, not counted"}
    >
      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
      Fined
    </span>
  );
}
