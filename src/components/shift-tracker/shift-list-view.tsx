"use client";

import React from "react";
import { User, MapPin, StickyNote, ChevronRight } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift, MonthGroup } from "@/types/database.types";

interface ShiftListViewProps {
  monthGroups: MonthGroup[];
  onToggleStatus: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
}

export function ShiftListView({ monthGroups, onToggleStatus, onDelete, onEdit }: ShiftListViewProps) {
  return (
    <div className="space-y-5">
      {monthGroups.map((group) => (
        <div key={group.monthKey}>
          {/* Month header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{group.monthLabel}</span>
            <span className="text-sm font-bold tabular-nums text-primary">{formatCurrency(group.totalEarned)}</span>
          </div>

          {/* Rows */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
            {group.shifts.map((shift) => {
              const isPaid = shift.status === "Paid";
              const station = isStationShift(shift);
              return (
                <div
                  key={shift.id}
                  onClick={() => onEdit(shift)}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/60 transition-colors cursor-pointer select-none"
                >
                  {/* Status stripe */}
                  <div className={`w-1 h-9 rounded-full shrink-0 ${isPaid ? "bg-emerald-500" : "bg-rose-400"}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold">{formatShortDate(shift.shiftDate)}</span>
                      <span className="text-[11px] text-muted-foreground">{shift.shiftDay}</span>
                      {station && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">STN</span>
                      )}
                      {shift.notes?.trim() && <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{shift.coveringFor}</p>
                  </div>

                  {/* Amount + status */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(shift); }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full active:scale-90 transition-transform ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                      }`}
                    >
                      {isPaid ? "✓ Paid" : "Unpaid"}
                    </button>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
