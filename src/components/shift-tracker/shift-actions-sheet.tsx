"use client";

// Long press bottom sheet — appears when you long press a shift card
// Shows: Edit, Toggle paid/unpaid, Delete

import { SheetShell } from "./sheet-shell";
import React from "react";
import { motion } from "framer-motion";
import { Pencil, CheckCircle2, XCircle, Trash2, X, FileText } from "lucide-react";
import { formatShortDate, formatCurrency } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface ShiftActionsSheetProps {
  shift: Shift | null;
  open: boolean;
  onClose: () => void;
  onEdit: (shift: Shift) => void;
  onToggleStatus: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onViewDetail?: (shift: Shift) => void;
}

export function ShiftActionsSheet({
  shift,
  open,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
  onViewDetail,
}: ShiftActionsSheetProps) {
  if (!shift) return null;

  const station = isStationShift(shift);
  const isPaid = shift.status === "Paid";

  const actions = [
    ...(onViewDetail ? [{
      icon: FileText,
      label: "View detail",
      description: "See full shift summary",
      color: "text-foreground",
      bg: "bg-muted/60",
      onClick: () => { onClose(); onViewDetail(shift); },
    }] : []),
    {
      icon: Pencil,
      label: "Edit shift",
      description: "Change details, amount or date",
      color: "text-foreground",
      bg: "bg-muted/60",
      onClick: () => { onClose(); onEdit(shift); },
    },
    {
      icon: isPaid ? XCircle : CheckCircle2,
      label: isPaid ? "Mark as Unpaid" : "Mark as Paid",
      description: isPaid ? "Move back to unpaid" : "Mark this shift as collected",
      color: isPaid ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400",
      bg: isPaid ? "bg-rose-50 dark:bg-rose-950/30" : "bg-emerald-50 dark:bg-emerald-950/30",
      onClick: () => { onClose(); onToggleStatus(shift); },
    },
    {
      icon: Trash2,
      label: "Delete shift",
      description: "Remove permanently",
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      onClick: () => { onClose(); onDelete(shift); },
    },
  ];

  return (
    <SheetShell open={open} onClose={onClose} label="Shift actions" maxHeight="90dvh" backdropOpacity={0.4}>
      {/* Shift info header */}
      <div className="px-5 pb-3 pt-1 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{station ? "🚉" : "🎬"}</span>
          <div>
            <p className="text-sm font-semibold">
              {station ? shift.coveringFor : shift.coveringFor}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(shift.shiftDate)} · {shift.shiftDay} · {formatCurrency(parseFloat(shift.amountEarned))}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              whileTap={{ scale: 0.97 }}
              onClick={action.onClick}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl ${action.bg} transition-colors active:opacity-80`}
            >
              <div className={`w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center shrink-0 ${action.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${action.color}`}>{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-muted text-sm font-semibold text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </SheetShell>
  );
}
