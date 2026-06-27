"use client";

// Discord-style delete toast — slides in from bottom, auto-dismisses,
// has undo action. No modal, no blocking overlay.

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Undo2, X } from "lucide-react";
import { formatShortDate } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface DeleteToastProps {
  open: boolean;
  shift: Shift | null;
  onConfirm: () => void;      // called after auto-dismiss or explicit confirm
  onUndo: () => void;         // called if user taps Undo
  onOpenChange: (v: boolean) => void;
}

const AUTO_DISMISS_MS = 4000;

export function DeleteShiftDialog({
  open,
  shift,
  onConfirm,
  onUndo,
  onOpenChange,
}: DeleteToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    confirmedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!confirmedRef.current) {
        confirmedRef.current = true;
        onConfirm();
      }
      onOpenChange(false);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [open]);

  const handleUndo = () => {
    clearTimeout(timerRef.current);
    confirmedRef.current = true;
    onUndo();
    onOpenChange(false);
  };

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    if (!confirmedRef.current) {
      confirmedRef.current = true;
      onConfirm();
    }
    onOpenChange(false);
  };

  const station = shift ? isStationShift(shift) : false;
  const label = shift
    ? station
      ? `${shift.coveringFor} · ${formatShortDate(shift.shiftDate)}`
      : `${shift.coveringFor} · ${formatShortDate(shift.shiftDate)}`
    : "";

  return (
    <AnimatePresence>
      {open && shift && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80"
        >
          <div className="flex items-center gap-3 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-black/30">
            {/* Icon */}
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-100">Shift deleted</p>
              <p className="text-[11px] text-zinc-400 truncate">{label}</p>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl overflow-hidden">
              <motion.div
                className="h-full bg-rose-500/60"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
              />
            </div>

            {/* Undo */}
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 px-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}