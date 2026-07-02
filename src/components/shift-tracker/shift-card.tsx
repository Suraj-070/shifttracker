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
  compact:     { pad: "p-2.5", gap: "mb-1", amount: "text-sm",   actionPad: "mt-2 pt-2", actionGap: "gap-1.5" },
  comfortable: { pad: "p-3.5", gap: "mb-2", amount: "text-base", actionPad: "mt-3 pt-3", actionGap: "gap-2" },
  spacious:    { pad: "p-5",   gap: "mb-3", amount: "text-lg",   actionPad: "mt-4 pt-4", actionGap: "gap-2.5" },
};

const SWIPE_THRESHOLD = -80;
const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;

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
  const [swiped, setSwiped] = useState(false);
  const d = DENSITY_STYLES[density];

  // Swipe motion values
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteScale   = useTransform(x, [0, SWIPE_THRESHOLD], [0.7, 1]);

  // Long press tracking — using refs attached to Framer's onPan callbacks
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const longFired = useRef(false);
  const didSwipe = useRef(false);

  // Desktop long press
  const desktopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const desktopLongPress = isMobile ? {} : {
    onMouseDown: () => {
      if (!onLongPress) return;
      desktopTimer.current = setTimeout(() => {
        haptics(20);
        onLongPress(shift);
      }, 500);
    },
    onMouseUp: () => clearTimeout(desktopTimer.current),
    onMouseLeave: () => clearTimeout(desktopTimer.current),
  };

  const resetSwipe = () => {
    setSwiped(false);
    animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  };

  const confirmDelete = () => {
    haptics(20);
    animate(x, -400, { duration: 0.18 }).then(() => onDelete(shift));
  };

  // ── Framer pan handlers — fire BEFORE drag ────────────────────────────────
  // onPanStart fires on first movement, but we need to detect long press
  // BEFORE any movement. We use onTapStart which fires on touch down.

  const handleTapStart = () => {
    if (!isMobile) return;
    longFired.current = false;
    didSwipe.current = false;
    setPressing(true);
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        longFired.current = true;
        haptics(20);
        setPressing(false);
        onLongPress(shift);
      }, LONG_PRESS_MS);
    }
  };

  const handlePanStart = (_: unknown, info: { point: { x: number; y: number } }) => {
    panStartX.current = info.point.x;
    panStartY.current = info.point.y;
  };

  const handlePan = (_: unknown, info: { offset: { x: number; y: number } }) => {
    const dx = Math.abs(info.offset.x);
    const dy = Math.abs(info.offset.y);
    // If moved enough — cancel long press
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
      if (!longFired.current) {
        clearTimeout(longPressTimer.current);
        setPressing(false);
      }
      didSwipe.current = true;
    }
  };

  const handleTap = () => {
    clearTimeout(longPressTimer.current);
    setPressing(false);
    if (swiped) resetSwipe();
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    clearTimeout(longPressTimer.current);
    setPressing(false);
    if (disableSwipe || !isMobile) return;

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

  const cardContent = (
    <div
      {...desktopLongPress}
      className={`bg-card border rounded-2xl overflow-hidden select-none transition-all duration-100 tap-press shadow-sm ${
        station
          ? "border-blue-100 dark:station-border shadow-blue-50 dark:shadow-none"
          : "border-border/50"
      } ${pressing ? "scale-[0.97] brightness-90" : ""}`}
    >
      <div className="flex items-stretch">
        <div className={`w-[3px] shrink-0 ${
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
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-200 bg-blue-50 text-blue-700 dark:station-blue-bg dark:station-blue dark:station-border gap-0.5">
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
              <Badge
                variant="outline"
                onClick={(e) => { e.stopPropagation(); haptics(8); onToggleStatus(shift); }}
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
                  onClick={(e) => { e.stopPropagation(); setNotesOpen(v => !v); }}
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
                  onClick={(e) => { e.stopPropagation(); setNotesOpen(v => !v); }}
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                >
                  <StickyNote className="w-3 h-3 shrink-0" />
                  <span>Note</span>
                  <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
          )}

          {hasNotes && notesOpen && (
            <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed">
              {userNote}
            </p>
          )}

          {/* Actions */}
          <div className={`flex items-center ${d.actionGap} ${d.actionPad} border-t border-border/40`}>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs flex-1"
              onClick={(e) => { e.stopPropagation(); haptics(6); onEdit(shift); }}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="ghost" size="sm"
              className="h-9 gap-1.5 text-xs flex-1 text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              onClick={(e) => { e.stopPropagation(); haptics(12); onDelete(shift); }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop — simple fade entrance, no swipe
  if (!isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.15) }}
      >
        {cardContent}
      </motion.div>
    );
  }

  // Mobile — swipe + long press all on ONE motion.div
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete reveal background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-500 px-5 rounded-xl"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-5 h-5 text-white" />
        </motion.div>
      </motion.div>

      {/* Single motion.div handles EVERYTHING: long press + swipe */}
      <motion.div
        drag={disableSwipe ? false : "x"}
        dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
        dragElastic={0.08}
        style={{ x }}
        onTapStart={handleTapStart}
        onTap={handleTap}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onDragEnd={handleDragEnd}
      >
        {cardContent}
      </motion.div>

      {/* Swipe confirm strip */}
      {swiped && (
        <div className="flex border-t border-border/40">
          <button
            onClick={confirmDelete}
            className="flex-1 py-2.5 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950"
          >
            Confirm Delete
          </button>
          <button
            onClick={resetSwipe}
            className="px-5 py-2.5 text-xs font-medium text-muted-foreground bg-muted"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
