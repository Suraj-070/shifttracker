"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, MapPin, StickyNote, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { Shift, MonthGroup } from "@/types/database.types";

interface ShiftListViewProps {
  monthGroups: MonthGroup[];
  onToggleStatus: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
}

export function ShiftListView({ monthGroups, onToggleStatus, onDelete, onEdit }: ShiftListViewProps) {
  return (
    <div className="space-y-8">
      {monthGroups.map((group) => (
        <div key={group.monthKey}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold tracking-tight">{group.monthLabel}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-600 font-medium">{formatCurrency(group.totalEarned)}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground text-xs">{group.paidCount}p / {group.unpaidCount}u</span>
            </div>
          </div>
          <div className="space-y-1">
            <AnimatePresence>
              {group.shifts.map((shift) => (
                <ShiftListRow key={shift.id} shift={shift} onToggleStatus={onToggleStatus} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ShiftListRowProps {
  shift: Shift;
  onToggleStatus: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
}

function ShiftListRow({ shift, onToggleStatus, onDelete, onEdit }: ShiftListRowProps) {
  const isPaid = shift.status === "Paid";
  const badgeClass = isPaid
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 cursor-pointer"
    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800 cursor-pointer";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
      onClick={() => onEdit(shift)}
    >
      <div className={`w-1 h-8 rounded-full shrink-0 ${isPaid ? "bg-emerald-500" : "bg-rose-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{formatShortDate(shift.shiftDate)}</span>
          <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{shift.coveringFor}</span>
          <span className="text-border">·</span>
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{shift.locationName}</span>
          {shift.notes && shift.notes.trim() && (
            <StickyNote className="w-3 h-3 shrink-0 text-amber-500" />
          )}
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(parseFloat(shift.amountEarned))}</span>
      <Badge variant="outline" className={badgeClass} onClick={(e) => { e.stopPropagation(); onToggleStatus(shift); }}>
        {shift.status}
      </Badge>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(shift); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-rose-600 shrink-0"
        aria-label="Delete shift"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
