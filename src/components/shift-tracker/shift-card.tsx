"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { User, MapPin, Pencil, Trash2, StickyNote, ChevronDown, Train } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

const DENSITY_STYLES: Record<CardDensity, {
  pad: string; gap: string; amount: string; actionPad: string; actionGap: string;
}> = {
  compact:     { pad: "p-2.5", gap: "mb-1", amount: "text-sm",  actionPad: "mt-2 pt-2", actionGap: "gap-1.5" },
  comfortable: { pad: "p-3.5", gap: "mb-2", amount: "text-base", actionPad: "mt-3 pt-3", actionGap: "gap-2" },
  spacious:    { pad: "p-5",   gap: "mb-3", amount: "text-lg",  actionPad: "mt-4 pt-4", actionGap: "gap-2.5" },
};

const SWIPE_THRESHOLD = -72;

// ── Swipe wrapper — mobile only ───────────────────────────────────────────────
// Long press is detected HERE (wrapping level) so Framer drag doesn't swallow it.

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
  const deleteScale  = useTransform(x, [0, SWIPE_THRESHOLD], [0.7, 1]);

  // Long press detection via raw touch — bypasses Framer drag interception
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longFired = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    longFired.current = false;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    onPressStart?.();
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        longFired.current = true;
        haptics(20);
        onLongPress();
      }, 450);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimer.current);
      onPressEnd?.();
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    onPressEnd?.();
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < SWIPE_THRESHOLD) {
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
    animate(x, -400, { duration: 0.2 }).then(onDelete);
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-500 rounded-xl px-5"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-5 h-5 text-white" />
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={() => { if (swiped) resetSwipe(); }}
        style={{ x }}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>

      {/* Confirm strip */}
      {swiped && (
        <div className="flex">
          <button
            onClick={confirmDelete}
            className="flex-1 py-2 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950 border-t border-rose-200"
          >
            Confirm Delete
          </button>
          <button
            onClick={resetSwipe}
            className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted border-t border-border"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

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
  const [pressing, setPressing] = useState(false);
  const taxWithheld = station ? parseStationTax(shift.notes) : 0;
  const afterTax = station ? Math.max(0, parseFloat(shift.amountEarned) - taxWithheld) : 0;
  const userNote = station ? parseStationUserNote(shift.notes) : shift.notes;
  const hasNotes = Boolean(userNote && userNote.trim());
  const [notesOpen, setNotesOpen] = useState(false);
  const d = DENSITY_STYLES[density];

  // Desktop long press (mouse)
  const desktopLongTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const desktopLongPress = {
    onMouseDown: () => {
      if (!onLongPress || isMobile) return;
      desktopLongTimer.current = setTimeout(() => {
        haptics(20);
        onLongPress(shift);
      }, 500);
    },
    onMouseUp: () => clearTimeout(desktopLongTimer.current),
    onMouseLeave: () => clearTimeout(desktopLongTimer.current),
  };

  const card = (
    <div
      {...(isMobile ? {} : desktopLongPress)}
      className={`bg-card border rounded-xl overflow-hidden select-none transition-all duration-100 ${
        station ? "border-blue-200 dark:border-blue-800" : "border-border/60"
      } ${pressing ? "scale-[0.98] brightness-95" : ""}`}
    >
      <div className="flex items-stretch">
        {/* Color bar */}
        <div className={`w-1 shrink-0 ${
          station ? "bg-blue-500" : isPaid ? "bg-emerald-500" : "bg-rose-400"
        }`} />

        <div className={`flex-1 min-w-0 ${d.pad}`}>
          {/* Top row */}
          <div className={`flex items-start justify-between gap-2 ${d.gap}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{formatShortDate(shift.shiftDate)}</span>
                <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
                {station && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 gap-0.5">
                    <Train className="w-2.5 h-2.5" />Station
                  </Badge>
                )}
              </div>
              {station && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                  {shift.coveringFor}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`font-bold tabular-nums ${d.amount}`}>
                {formatCurrency(parseFloat(shift.amountEarned))}
              </span>
              {station && (
                <span className="text-[11px] text-muted-foreground">
                  after tax: {formatCurrency(afterTax)}
                </span>
              )}
              {/* Simple badge — no animation, saves mobile perf */}
              <Badge
                variant="outline"
                onClick={() => { haptics(8); onToggleStatus(shift); }}
                className={`text-[10px] px-2 py-0 h-5 cursor-pointer select-none min-h-[28px] flex items-center ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                }`}
              >
                {shift.status}
              </Badge>
            </div>
          </div>

          {/* Hall details */}
          {!station && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="w-3 h-3 shrink-0" /><span>{shift.coveringFor}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" /><span>{shift.locationName}</span>
              </div>
              {hasNotes && (
                <button
                  onClick={() => setNotesOpen(v => !v)}
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                >
                  <StickyNote className="w-3 h-3 shrink-0" />
                  <span>Note</span>
                  <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          )}

          {/* Station details */}
          {station && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs text-muted-foreground">{shift.hoursWorked}h worked</span>
              <span className="text-xs text-muted-foreground">Tax: {formatCurrency(taxWithheld)}</span>
              {hasNotes && (
                <button
                  onClick={() => setNotesOpen(v => !v)}
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                >
                  <StickyNote className="w-3 h-3 shrink-0" />
                  <span>Note</span>
                  <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          )}

          {/* Notes — no animation on mobile */}
          {hasNotes && notesOpen && (
            <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed">
              {userNote}
            </p>
          )}

          {/* Actions */}
          <div className={`flex items-center ${d.actionGap} ${d.actionPad} border-t border-border/40`}>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs flex-1"
              onClick={() => { haptics(6); onEdit(shift); }}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="ghost" size="sm"
              className="h-9 gap-1.5 text-xs flex-1 text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              onClick={() => { haptics(12); onDelete(shift); }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile — wrap with swipe (long press handled inside SwipeWrapper)
  if (isMobile && !disableSwipe) {
    return (
      <SwipeWrapper
        onDelete={() => onDelete(shift)}
        onLongPress={onLongPress ? () => { setPressing(false); onLongPress(shift); } : undefined}
        onPressStart={() => setPressing(true)}
        onPressEnd={() => setPressing(false)}
      >
        {card}
      </SwipeWrapper>
    );
  }

  // Mobile no swipe OR desktop
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.15) }}
    >
      {card}
    </motion.div>
  );
}