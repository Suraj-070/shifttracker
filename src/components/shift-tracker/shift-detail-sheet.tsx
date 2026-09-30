"use client";

import { SheetShell } from "./sheet-shell";
import React from "react";
import { X, Pencil, Trash2, CheckCircle2, XCircle, MapPin, Calendar, Clock, StickyNote, DollarSign, User, UserX } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { isStationShift, parseStationTax, effectiveAmount, shiftUserNote, shiftFine } from "@/types/database.types";
import type { Shift } from "@/types/database.types";
import { FineBadge } from "./fine-badge";

interface ShiftDetailSheetProps {
  userName?: string;
  shift: Shift | null;
  open: boolean;
  onClose: () => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onToggleStatus: (shift: Shift) => void;
}

export function ShiftDetailSheet({
  shift, open, onClose, onEdit, onDelete, onToggleStatus, userName = "Suraj",
}: ShiftDetailSheetProps) {
  if (!shift) return null;

  const isSelfName = (n: string) => n.toLowerCase() === userName.toLowerCase() || n.toLowerCase() === "myself";
  const station  = isStationShift(shift);
  const isPaid   = shift.status === "Paid";
  const tax      = station ? parseStationTax(shift.notes) : 0;
  const net      = station ? Math.max(0, effectiveAmount(shift) - tax) : 0;
  const userNote = shiftUserNote(shift);
  const fine     = shiftFine(shift);
  const covered  = Boolean(shift.coveredBy);
  const isSelf   = !covered && (isSelfName(shift.coveringFor ?? ""));

  const accentColor = covered ? "amber" : isSelf ? "purple" : station ? "blue" : isPaid ? "emerald" : "rose";

  const stripeClass: Record<string, string> = {
    amber:   "from-amber-400 to-orange-400",
    purple:  "from-purple-400 to-violet-500",
    blue:    "from-blue-400 to-blue-500",
    emerald: "from-emerald-400 to-emerald-500",
    rose:    "from-rose-400 to-rose-500",
  };

  return (
    <SheetShell open={open} onClose={onClose} label="Shift detail" maxHeight="88dvh" backdropOpacity={0.55}
      topSlot={<div className={`h-1 w-full rounded-t-3xl bg-gradient-to-r ${stripeClass[accentColor]}`} />}>
        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Shift Detail</p>
              <FineBadge shift={shift} />
            </div>
            <p className="text-xl font-black tracking-tight">{formatShortDate(shift.shiftDate)} · {shift.shiftDay}</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="hit w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Amount hero */}
        <div className={`mx-4 rounded-2xl p-4 mb-4 ${
          covered ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900"
          : isSelf ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900"
          : "bg-muted/50 border border-border/50"
        }`}>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Amount</p>
              <p className="text-4xl font-black tabular-nums tracking-tight">{formatCurrency(effectiveAmount(shift))}</p>
              {station && <p className="text-xs text-muted-foreground mt-1">net {formatCurrency(net)} after ${formatCurrency(tax)} tax</p>}
              {fine.amount > 0 && (
                <p className={`text-xs mt-1 ${fine.included ? "font-semibold text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}>
                  {fine.included
                    ? `${formatCurrency(parseFloat(shift.amountEarned))} earned − ${formatCurrency(fine.amount)} fine`
                    : `Fine ${formatCurrency(fine.amount)} recorded · not counted`}
                </p>
              )}
            </div>
            {/* Status toggle */}
            <button
              onClick={() => onToggleStatus(shift)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform ${
                isPaid
                  ? "bg-emerald-500 text-white"
                  : covered ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
              }`}
            >
              {isPaid ? <CheckCircle2 className="w-4 h-4" /> : null}
              {isPaid ? "Mark Unpaid" : covered ? "Mark Paid" : "Mark Paid"}
            </button>
          </div>
        </div>

        {/* Detail rows */}
        <div className="mx-4 rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-border/40 mb-4">

          {/* Person */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">{covered ? "Covered by" : "Covering for"}</p>
              <p className="text-sm font-semibold">
                {covered ? shift.coveredBy : isSelf ? `${userName} (You)` : shift.coveringFor}
              </p>
            </div>

            {isSelf && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
                <User className="w-3 h-3 inline -mt-0.5 mr-1" aria-hidden="true" />You
              </span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Location</p>
              <p className="text-sm font-semibold">{shift.locationName}</p>
            </div>
            {station && (
              <span className="ml-auto text-[11px] font-bold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600">Station</span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Date</p>
              <p className="text-sm font-semibold">{formatShortDate(shift.shiftDate)} · {shift.shiftDay}</p>
            </div>
          </div>

          {/* Hours (station only) */}
          {station && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Hours worked</p>
                <p className="text-sm font-semibold">{shift.hoursWorked}h</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {userNote?.trim() && (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0 mt-0.5">
                <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground mb-1">Note</p>
                <p className="text-sm text-foreground leading-relaxed">{userNote}</p>
              </div>
            </div>
          )}


        </div>

        {/* Action buttons */}
        <div className="px-4 pb-2 flex gap-3">
          <button
            onClick={() => { onEdit(shift); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform"
          >
            <Pencil className="w-4 h-4" /> Edit Shift
          </button>
          <button
            onClick={() => { onDelete(shift); onClose(); }}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-bold active:scale-95 transition-transform border border-rose-100 dark:border-rose-900"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-3 pt-1">
          <button onClick={onClose}
            className="w-full py-3 rounded-2xl bg-muted text-sm font-semibold text-muted-foreground active:brightness-95">
            Close
          </button>
        </div>
    </SheetShell>
  );
}
