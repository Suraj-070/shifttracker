"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Pencil, Trash2, Train, ChevronDown, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  isStationShift,
  parseStationTax,
  parseStationUserNote,
} from "@/types/database.types";
import type { Shift } from "@/types/database.types";
import type { CardDensity } from "@/stores/settings-store";

interface ShiftCardProps {
  shift: Shift;
  onToggleStatus: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onLongPress?: (shift: Shift) => void;
  density?: CardDensity;
  disableSwipe?: boolean;
  index?: number;
}

const SWIPE_THRESHOLD = -80;
const LONG_PRESS_MS = 450;

function SwipeWrapper({
  children,
  onDelete,
  onLongPress,
  onPressStart,
  onPressEnd,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onLongPress?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}) {
  const haptics = useHaptics();
  const [swiped, setSwiped] = useState(false);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteScale  = useTransform(x, [0, SWIPE_THRESHOLD], [0.6, 1]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panMoved = useRef(false);

  const handleTapStart = () => {
    // onTapStart fires on touch-down BEFORE framer captures the pointer
    panMoved.current = false;
    onPressStart?.();
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (!panMoved.current) {
          haptics(20);
          onPressEnd?.();
          onLongPress();
        }
      }, LONG_PRESS_MS);
    }
  };

  const handlePanStart = () => {
    // Pan started = finger moved = cancel long press
    panMoved.current = true;
    clearTimeout(longPressTimer.current);
    onPressEnd?.();
  };

  const handleTap = () => {
    clearTimeout(longPressTimer.current);
    onPressEnd?.();
    if (swiped) resetSwipe();
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    clearTimeout(longPressTimer.current);
    onPressEnd?.();
    const shouldDelete = info.offset.x < SWIPE_THRESHOLD || info.velocity.x < -500;
    if (shouldDelete) {
      haptics(12);
      setSwiped(true);
      animate(x, SWIPE_THRESHOLD, { type: "spring", stiffness: 400, damping: 30 });
    } else {
      setSwiped(false);
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  const resetSwipe = () => {
    setSwiped(false);
    animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  };

  const confirmDelete = () => {
    haptics(20);
    animate(x, -400, { duration: 0.18 }).then(onDelete);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-500 rounded-2xl px-6"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-5 h-5 text-white" />
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
        dragElastic={0.08}
        style={{ x }}
        onTapStart={handleTapStart}
        onTap={handleTap}
        onPanStart={handlePanStart}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>

      {swiped && (
        <div className="flex overflow-hidden rounded-b-2xl">
          <button onClick={confirmDelete}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-500 tracking-wide">
            DELETE
          </button>
          <button onClick={resetSwipe}
            className="px-5 py-2.5 text-xs font-semibold text-muted-foreground bg-muted">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function ShiftCard({
  shift,
  onToggleStatus,
  onEdit,
  onDelete,
  onLongPress,
  density = "comfortable",
  disableSwipe = false,
  index = 0,
}: ShiftCardProps) {
  const haptics = useHaptics();
  const isMobile = useIsMobile();
  const station = isStationShift(shift);
  const isPaid = shift.status === "Paid";
  const taxWithheld = station ? parseStationTax(shift.notes) : 0;
  const afterTax = station ? Math.max(0, parseFloat(shift.amountEarned) - taxWithheld) : 0;
  const userNote = station ? parseStationUserNote(shift.notes) : shift.notes;
  const hasNotes = Boolean(userNote && userNote.trim());
  const [notesOpen, setNotesOpen] = useState(false);
  const [pressing, setPressing] = useState(false);

  const desktopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const desktopLongPress = isMobile ? {} : {
    onMouseDown: () => {
      if (!onLongPress) return;
      desktopTimer.current = setTimeout(() => { haptics(20); onLongPress(shift); }, 500);
    },
    onMouseUp: () => clearTimeout(desktopTimer.current),
    onMouseLeave: () => clearTimeout(desktopTimer.current),
  };

  const card = (
    <div
      {...desktopLongPress}
      className={`select-none overflow-hidden rounded-2xl border transition-all duration-100 ${
        pressing ? "scale-[0.97] brightness-90" : ""
      } ${
        station
          ? "bg-card border-blue-100/80 dark:border-blue-900/60 shadow-sm shadow-blue-50 dark:shadow-none"
          : isPaid
          ? "bg-card border-border/50 shadow-sm"
          : "bg-card border-border/50 shadow-sm"
      }`}
    >
      {/* Top accent bar */}
      <div className={`h-[3px] w-full ${
        station ? "bg-gradient-to-r from-blue-400 to-blue-600"
        : isPaid ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
        : "bg-gradient-to-r from-rose-400 to-rose-500"
      }`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-bold tracking-tight">
                {formatShortDate(shift.shiftDate)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {shift.shiftDay}
              </span>
              {station && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                  <Train className="w-2.5 h-2.5" /> Station
                </span>
              )}
            </div>
            <p className={`text-sm font-semibold mt-0.5 truncate ${
              station ? "text-blue-600 dark:text-blue-400" : "text-foreground"
            }`}>
              {station ? shift.coveringFor : shift.coveringFor}
            </p>
            {!station && (
              <p className="text-xs text-muted-foreground truncate">{shift.locationName}</p>
            )}
            {station && (
              <p className="text-xs text-muted-foreground">{shift.hoursWorked}h · tax {formatCurrency(taxWithheld)}</p>
            )}
          </div>

          {/* Amount + status */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xl font-bold tabular-nums tracking-tight">
              {formatCurrency(parseFloat(shift.amountEarned))}
            </span>
            {station && (
              <span className="text-[11px] text-muted-foreground font-medium">
                net {formatCurrency(afterTax)}
              </span>
            )}
            {/* Status pill */}
            <button
              onClick={() => { haptics(8); onToggleStatus(shift); }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all active:scale-95 ${
                isPaid
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400"
              }`}
            >
              {isPaid ? "✓ Paid" : "Unpaid"}
            </button>
          </div>
        </div>

        {/* Notes */}
        {hasNotes && (
          <button
            onClick={(e) => { e.stopPropagation(); setNotesOpen(v => !v); }}
            className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-2"
          >
            <StickyNote className="w-3 h-3 shrink-0" />
            <span className="font-medium">Note</span>
            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
          </button>
        )}
        {hasNotes && notesOpen && (
          <p className="text-xs text-muted-foreground bg-muted/60 rounded-xl p-3 leading-relaxed mb-3">
            {userNote}
          </p>
        )}

        {/* Action row */}
        <div className="flex gap-2 pt-2 border-t border-border/30">
          <button
            onClick={(e) => { e.stopPropagation(); haptics(6); onEdit(shift); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/60 text-xs font-semibold text-foreground active:scale-95 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); haptics(12); onDelete(shift); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-500 active:scale-95 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile && !disableSwipe) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.12) }}
      >
        <SwipeWrapper
          onDelete={() => onDelete(shift)}
          onLongPress={onLongPress ? () => onLongPress(shift) : undefined}
          onPressStart={() => setPressing(true)}
          onPressEnd={() => setPressing(false)}
        >
          {card}
        </SwipeWrapper>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.12) }}
    >
      {card}
    </motion.div>
  );
}
