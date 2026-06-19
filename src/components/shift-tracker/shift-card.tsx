"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, MapPin, Pencil, Trash2, StickyNote, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { Shift } from "@/types/database.types";
import type { CardDensity } from "@/stores/settings-store";

interface ShiftCardProps {
  shift: Shift;
  onToggleStatus: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  density?: CardDensity;
}

const DENSITY_STYLES: Record<CardDensity, { pad: string; gap: string; amount: string; actionPad: string; actionGap: string }> = {
  compact: { pad: "p-2.5", gap: "mb-1", amount: "text-sm", actionPad: "mt-2 pt-2", actionGap: "gap-1.5" },
  comfortable: { pad: "p-3.5", gap: "mb-2", amount: "text-base", actionPad: "mt-3 pt-3", actionGap: "gap-2" },
  spacious: { pad: "p-5", gap: "mb-3", amount: "text-lg", actionPad: "mt-4 pt-4", actionGap: "gap-2.5" },
};

export function ShiftCard({ shift, onToggleStatus, onEdit, onDelete, density = "comfortable" }: ShiftCardProps) {
  const isPaid = shift.status === "Paid";
  const hasNotes = Boolean(shift.notes && shift.notes.trim());
  const [notesOpen, setNotesOpen] = useState(false);
  const d = DENSITY_STYLES[density];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-card border border-border/60 rounded-xl overflow-hidden"
    >
      <div className="flex items-stretch">
        {/* Color bar */}
        <div className={`w-1 shrink-0 ${isPaid ? "bg-emerald-500" : "bg-rose-400"}`} />

        <div className={`flex-1 min-w-0 ${d.pad}`}>
          {/* Top row */}
          <div className={`flex items-start justify-between gap-2 ${d.gap}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{formatShortDate(shift.shiftDate)}</span>
                <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`font-bold tabular-nums ${d.amount}`}>{formatCurrency(parseFloat(shift.amountEarned))}</span>
              <Badge
                variant="outline"
                onClick={() => onToggleStatus(shift)}
                className={`text-[10px] px-2 py-0 h-5 cursor-pointer select-none ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                }`}
              >
                {shift.status}
              </Badge>
            </div>
          </div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3 shrink-0" />
              <span>{shift.coveringFor}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{shift.locationName}</span>
            </div>
            {hasNotes && (
              <button
                onClick={() => setNotesOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                <StickyNote className="w-3 h-3 shrink-0" />
                <span>Note</span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {hasNotes && notesOpen && (
            <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed">
              {shift.notes}
            </p>
          )}

          {/* Action row */}
          <div className={`flex items-center ${d.actionGap} ${d.actionPad} border-t border-border/40`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs flex-1"
              onClick={() => onEdit(shift)}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs flex-1 text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              onClick={() => onDelete(shift)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
