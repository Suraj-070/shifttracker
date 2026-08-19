"use client";

import React from "react";
import {
  X, Pencil, Trash2, CheckCircle2, XCircle,
  MapPin, Calendar, Clock, StickyNote, DollarSign, User, UserX,
} from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { isStationShift, parseStationTax, parseStationUserNote } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface ShiftDetailSheetProps {
  shift: Shift | null;
  open: boolean;
  onClose: () => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onToggleStatus: (shift: Shift) => void;
}

export function ShiftDetailSheet({
  shift, open, onClose, onEdit, onDelete, onToggleStatus,
}: ShiftDetailSheetProps) {
  if (!shift) return null;

  const station  = isStationShift(shift);
  const isPaid   = shift.status === "Paid";
  const tax      = station ? parseStationTax(shift.notes) : 0;
  const net      = station ? Math.max(0, parseFloat(shift.amountEarned) - tax) : 0;
  const userNote = station ? parseStationUserNote(shift.notes) : shift.notes;
  const covered  = Boolean(shift.coveredBy);
  const isSelf   = !covered && (shift.coveringFor?.toLowerCase() === "suraj" || shift.coveringFor?.toLowerCase() === "myself");

  const accentColor = covered ? "amber" : isSelf ? "purple" : station ? "blue" : isPaid ? "emerald" : "rose";

  const stripeClass: Record<string, string> = {
    amber:   "from-amber-400 to-orange-400",
    purple:  "from-purple-400 to-violet-500",
    blue:    "from-blue-400 to-blue-500",
    emerald: "from-emerald-400 to-emerald-500",
    rose:    "from-rose-400 to-rose-500",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.2s" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* Color stripe */}
        <div className={`h-1 w-full rounded-t-3xl bg-gradient-to-r ${stripeClass[accentColor]}`} />

        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Shift Detail</p>
            <p className="text-lg font-black">{formatShortDate(shift.shiftDate)} · {shift.shiftDay}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
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
              <p className="text-3xl font-black tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</p>
              {station && <p className="text-xs text-muted-foreground mt-1">net {formatCurrency(net)} after ${formatCurrency(tax)} tax</p>}
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
              {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {isPaid ? "Paid" : covered ? "Owed" : "Unpaid"}
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
                {covered ? shift.coveredBy : isSelf ? "Suraj (You)" : shift.coveringFor}
              </p>
            </div>
            {covered && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                💸 by {shift.coveredBy}
              </span>
            )}
            {isSelf && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
                ✦ You
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
              <span className="ml-auto text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600">Station</span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Date</p>
              <p className="text-sm font-semibold">{shift.shiftDate} · {shift.shiftDay}</p>
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
                <StickyNote className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground mb-1">Note</p>
                <p className="text-sm text-foreground leading-relaxed">{userNote}</p>
              </div>
            </div>
          )}

          {/* Covered by (if applicable) */}
          {covered && (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50/50 dark:bg-amber-950/10">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">To pay out</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {shift.coveredBy} · {formatCurrency(parseFloat(shift.amountEarned))}
                </p>
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

        {/* Cancel */}
        <div className="px-4 pb-4 pt-1">
          <button onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-muted text-sm font-semibold text-muted-foreground active:brightness-95">
            Close
          </button>
        </div>
      </div>
    </>
  );
}
