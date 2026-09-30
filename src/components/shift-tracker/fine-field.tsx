"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";

interface FineFieldProps {
  amount: string;
  included: boolean;
  gross: number;
  onAmountChange: (v: string) => void;
  onIncludedChange: (v: boolean) => void;
}

/** Optional fine on a hall shift, with a switch for whether it counts toward totals. */
export function FineField({ amount, included, gross, onAmountChange, onIncludedChange }: FineFieldProps) {
  const fine = parseFloat(amount) || 0;
  const hasFine = fine > 0;
  const net = Math.max(0, gross - fine);

  return (
    <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
      <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Fine ($) <span className="normal-case font-normal">(optional)</span>
      </label>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="0.00"
        className="w-full h-11 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary font-bold tabular-nums"
      />

      {hasFine && (
        <>
          <button
            type="button"
            role="switch"
            aria-checked={included}
            onClick={() => onIncludedChange(!included)}
            className="w-full h-11 flex items-center justify-between gap-3 px-3.5 rounded-xl bg-background border border-border/60 text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            <span>Deduct from total</span>
            <span
              aria-hidden="true"
              className={`relative w-10 h-6 rounded-full transition-colors ${included ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${included ? "translate-x-4" : ""}`}
              />
            </span>
          </button>
          <p className="text-[11px] text-muted-foreground">
            {included
              ? `Counts in totals: ${formatCurrency(gross)} − ${formatCurrency(fine)} = ${formatCurrency(net)}`
              : "Recorded only — not deducted from totals."}
          </p>
        </>
      )}
    </div>
  );
}
