"use client";

import React, { useRef, useState, useCallback } from "react";
import { Pencil, Trash2, MapPin, ChevronDown, StickyNote, CheckCircle2 } from "lucide-react";
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

const SWIPE_THRESHOLD = 88;  // px to trigger action reveal
const LONG_PRESS_MS   = 500;

// ── Bidirectional swipe: right = pay, left = delete ───────────────────────────
// Pure CSS transforms — zero Framer Motion overhead
function SwipeWrapper({
  children,
  isPaid,
  onDelete,
  onTogglePaid,
  onLongPress,
  onPressStart,
  onPressEnd,
}: {
  children: React.ReactNode;
  isPaid: boolean;
  onDelete: () => void;
  onTogglePaid: () => void;
  onLongPress?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}) {
  const haptics   = useHaptics();
  const cardRef   = useRef<HTMLDivElement>(null);

  // "snapped" direction: null | "left" | "right"
  const [snapped, setSnapped] = useState<null | "left" | "right">(null);

  // live background opacity for each side
  const [leftOpacity,  setLeftOpacity]  = useState(0); // delete (rose)
  const [rightOpacity, setRightOpacity] = useState(0); // pay (emerald)
  // true once we cross threshold — triggers haptic once per swipe
  const hapticFiredRef = useRef(false);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startX      = useRef(0);
  const startY      = useRef(0);
  const swipeX      = useRef(0);
  const isSwiping   = useRef(false);
  const longFired   = useRef(false);

  // ── DOM helpers ──────────────────────────────────────────────────────────────

  const setTransform = (dx: number, transition = "none") => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = transition;
    cardRef.current.style.transform  = `translateX(${dx}px)`;
  };

  // rubber-band resistance past threshold
  const rubberDx = (raw: number) => {
    const abs = Math.abs(raw);
    if (abs <= SWIPE_THRESHOLD) return raw;
    const over   = abs - SWIPE_THRESHOLD;
    const damped = SWIPE_THRESHOLD + over * 0.25;
    return raw < 0 ? -damped : damped;
  };

  const snapBack = useCallback(() => {
    setTransform(0, "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)");
    setLeftOpacity(0);
    setRightOpacity(0);
    hapticFiredRef.current = false;
  }, []);

  const snapToLeft = () => {
    setTransform(-SWIPE_THRESHOLD, "transform 0.22s cubic-bezier(0.25,1,0.5,1)");
    setLeftOpacity(1);
    setRightOpacity(0);
  };

  const snapToRight = () => {
    setTransform(SWIPE_THRESHOLD, "transform 0.22s cubic-bezier(0.25,1,0.5,1)");
    setRightOpacity(1);
    setLeftOpacity(0);
  };

  // ── Confirm actions ──────────────────────────────────────────────────────────

  const confirmDelete = useCallback(() => {
    haptics(22);
    setTransform(-420, "transform 0.2s cubic-bezier(0.55,0,1,0.45)");
    setTimeout(onDelete, 195);
  }, [haptics, onDelete]);

  const confirmPay = useCallback(() => {
    haptics(14);
    setTransform(0, "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)");
    setSnapped(null);
    setRightOpacity(0);
    setTimeout(onTogglePaid, 80);
  }, [haptics, onTogglePaid]);

  const resetSnap = useCallback(() => {
    setSnapped(null);
    snapBack();
  }, [snapBack]);

  // ── Touch handlers ───────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current    = t.clientX;
    startY.current    = t.clientY;
    swipeX.current    = 0;
    isSwiping.current = false;
    longFired.current = false;
    hapticFiredRef.current = false;
    onPressStart?.();

    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        longFired.current = true;
        haptics(20);
        onPressEnd?.();
        onLongPress();
      }, LONG_PRESS_MS);
    }
  }, [onLongPress, onPressStart, onPressEnd, haptics]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t  = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = Math.abs(t.clientY - startY.current);

    if (dy > 22 && !isSwiping.current) {
      clearTimeout(timerRef.current);
      onPressEnd?.();
      return;
    }

    if (Math.abs(dx) > 10) {
      clearTimeout(timerRef.current);
      if (!longFired.current) onPressEnd?.();
      isSwiping.current = true;
    }

    if (!isSwiping.current) return;

    swipeX.current = dx;
    const clamped  = rubberDx(dx);
    setTransform(clamped);

    const progress = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);

    if (dx < 0) {
      setLeftOpacity(progress);
      setRightOpacity(0);
    } else {
      setRightOpacity(progress);
      setLeftOpacity(0);
    }

    // single haptic pop when crossing threshold
    if (!hapticFiredRef.current && Math.abs(dx) >= SWIPE_THRESHOLD) {
      hapticFiredRef.current = true;
      haptics(10);
    }
  }, [onPressEnd, haptics]);

  const onTouchEnd = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!longFired.current) onPressEnd?.();
    if (!isSwiping.current) return;

    const dx = swipeX.current;

    if (dx < -SWIPE_THRESHOLD) {
      // left swipe → reveal delete
      setSnapped("left");
      snapToLeft();
    } else if (dx > SWIPE_THRESHOLD) {
      // right swipe → toggle paid instantly (no confirm needed for pay)
      setSnapped(null);
      confirmPay();
    } else {
      setSnapped(null);
      snapBack();
    }
  }, [onPressEnd, confirmPay, snapBack]);

  return (
    <div className="relative overflow-hidden rounded-2xl">

      {/* ── Pay background (right swipe) ── */}
      <div
        className="absolute inset-y-0 left-0 right-0 flex items-center justify-start rounded-2xl px-7"
        style={{
          opacity: rightOpacity,
          background: isPaid
            ? "linear-gradient(135deg,#f43f5e,#e11d48)"   // unpay = rose
            : "linear-gradient(135deg,#10b981,#059669)",   // pay   = emerald
          transition: "opacity 0.08s",
          pointerEvents: "none",
        }}
      >
        <CheckCircle2 className="w-6 h-6 text-white drop-shadow" />
        <span className="ml-2.5 text-white text-sm font-bold tracking-wide">
          {isPaid ? "Mark Unpaid" : "Mark Paid"}
        </span>
      </div>

      {/* ── Delete background (left swipe) ── */}
      <div
        className="absolute inset-y-0 left-0 right-0 flex items-center justify-end rounded-2xl px-7"
        style={{
          opacity: leftOpacity,
          background: "linear-gradient(135deg,#ef4444,#dc2626)",
          transition: "opacity 0.08s",
          pointerEvents: "none",
        }}
      >
        <span className="mr-2.5 text-white text-sm font-bold tracking-wide">Delete</span>
        <Trash2 className="w-6 h-6 text-white drop-shadow" />
      </div>

      {/* ── Card ── */}
      <div
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onContextMenu={e => e.preventDefault()}
        className="touch-pan-y select-none relative z-10"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        {children}
      </div>

      {/* ── Delete confirm strip (appears after left snap) ── */}
      <div
        style={{
          maxHeight: snapped === "left" ? "52px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div className="flex rounded-b-2xl overflow-hidden">
          <button
            onClick={confirmDelete}
            className="flex-1 py-3 text-xs font-bold text-white bg-rose-500 tracking-widest active:brightness-90 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> DELETE
          </button>
          <button
            onClick={resetSnap}
            className="px-6 py-3 text-xs font-semibold text-muted-foreground bg-muted active:brightness-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

function ShiftCardInner({
  shift,
  onToggleStatus,
  onEdit,
  onDelete,
  onLongPress,
  disableSwipe = false,
}: ShiftCardProps) {
  const haptics = useHaptics();
  const isMobile = useIsMobile();

  const station    = isStationShift(shift);
  const isPaid     = shift.status === "Paid";
  const taxWithheld = station ? parseStationTax(shift.notes) : 0;
  const afterTax   = station ? Math.max(0, parseFloat(shift.amountEarned) - taxWithheld) : 0;
  const userNote   = station ? parseStationUserNote(shift.notes) : shift.notes;
  const hasNotes   = Boolean(userNote && userNote.trim());

  const [notesOpen, setNotesOpen] = useState(false);
  const [pressing, setPressing]   = useState(false);

  // Desktop long press
  const desktopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const desktopEvents = isMobile ? {} : {
    onMouseDown: () => {
      if (!onLongPress) return;
      desktopTimer.current = setTimeout(() => { haptics(20); onLongPress(shift); }, 500);
    },
    onMouseUp:    () => clearTimeout(desktopTimer.current),
    onMouseLeave: () => clearTimeout(desktopTimer.current),
  };

  const card = (
    <div
      {...desktopEvents}
      className={`select-none overflow-hidden rounded-2xl border transition-all duration-75 ${
        pressing ? "scale-[0.97] brightness-90" : ""
      } ${
        station
          ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
          : "bg-card border-border/50"
      }`}
    >
      {/* Top gradient bar */}
      <div className={`h-[3px] w-full ${
        station
          ? "bg-gradient-to-r from-blue-400 to-blue-600"
          : isPaid
          ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
          : "bg-gradient-to-r from-rose-400 to-rose-500"
      }`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-bold tracking-tight">{formatShortDate(shift.shiftDate)}</span>
              <span className="text-xs text-muted-foreground font-medium">{shift.shiftDay}</span>
              {station && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                  <MapPin className="w-2.5 h-2.5" /> Station
                </span>
              )}
            </div>
            <p className={`text-sm font-semibold mt-0.5 truncate ${
              station ? "text-blue-600 dark:text-blue-400" : "text-foreground"
            }`}>{shift.coveringFor}</p>
            {!station && <p className="text-xs text-muted-foreground truncate">{shift.locationName}</p>}
            {station && <p className="text-xs text-muted-foreground">{shift.hoursWorked}h · tax {formatCurrency(taxWithheld)}</p>}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Icon actions top right */}
            <div className="flex items-center gap-1">
              <button
                onClick={e => { e.stopPropagation(); haptics(6); onEdit(shift); }}
                className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); haptics(12); onDelete(shift); }}
                className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              </button>
            </div>
            <span className="text-xl font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</span>
            {station && <span className="text-[11px] text-muted-foreground">net {formatCurrency(afterTax)}</span>}
            <button
              onClick={() => { haptics(8); onToggleStatus(shift); }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide active:scale-95 transition-transform ${
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
            onClick={e => { e.stopPropagation(); setNotesOpen(v => !v); }}
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


      </div>
    </div>
  );

  if (isMobile && !disableSwipe) {
    return (
      <SwipeWrapper
        isPaid={isPaid}
        onDelete={() => onDelete(shift)}
        onTogglePaid={() => onToggleStatus(shift)}
        onLongPress={onLongPress ? () => onLongPress(shift) : undefined}
        onPressStart={() => setPressing(true)}
        onPressEnd={() => setPressing(false)}
      >
        {card}
      </SwipeWrapper>
    );
  }

  return card;
}

export const ShiftCard = React.memo(ShiftCardInner);
