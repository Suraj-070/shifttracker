"use client";

import React, { useRef, useState, useCallback } from "react";
import { Pencil, Trash2, MapPin, ChevronDown, StickyNote, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import { isStationShift, parseStationTax, parseStationUserNote } from "@/types/database.types";
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

const SWIPE_THRESHOLD = 88;
const LONG_PRESS_MS   = 480;

// ── Bidirectional swipe wrapper ───────────────────────────────────────────────
function SwipeWrapper({
  children, isPaid, onDelete, onTogglePaid, onLongPress, onPressStart, onPressEnd,
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
  const [snapped, setSnapped]         = useState<null | "left">(null);
  const [leftOpacity,  setLeftOpacity]  = useState(0);
  const [rightOpacity, setRightOpacity] = useState(0);
  const hapticFiredRef = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startX      = useRef(0);
  const startY      = useRef(0);
  const swipeX      = useRef(0);
  const isSwiping   = useRef(false);
  const longFired   = useRef(false);

  const setTransform = (dx: number, transition = "none") => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = transition;
    cardRef.current.style.transform  = `translateX(${dx}px)`;
  };

  const rubberDx = (raw: number) => {
    const abs = Math.abs(raw);
    if (abs <= SWIPE_THRESHOLD) return raw;
    return raw < 0
      ? -(SWIPE_THRESHOLD + (abs - SWIPE_THRESHOLD) * 0.22)
      : (SWIPE_THRESHOLD + (abs - SWIPE_THRESHOLD) * 0.22);
  };

  const snapBack = useCallback(() => {
    setTransform(0, "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)");
    setLeftOpacity(0);
    setRightOpacity(0);
    hapticFiredRef.current = false;
  }, []);

  const confirmDelete = useCallback(() => {
    haptics(22);
    setTransform(-440, "transform 0.22s cubic-bezier(0.55,0,1,0.45)");
    setTimeout(onDelete, 210);
  }, [haptics, onDelete]);

  const confirmPay = useCallback(() => {
    haptics(14);
    setTransform(0, "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)");
    setSnapped(null);
    setRightOpacity(0);
    setTimeout(onTogglePaid, 80);
  }, [haptics, onTogglePaid]);

  const resetSnap = useCallback(() => {
    setSnapped(null);
    snapBack();
  }, [snapBack]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    swipeX.current = 0;
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
    if (dy > 18 && !isSwiping.current) {
      clearTimeout(timerRef.current);
      onPressEnd?.();
      return;
    }
    if (Math.abs(dx) > 8) {
      clearTimeout(timerRef.current);
      if (!longFired.current) onPressEnd?.();
      isSwiping.current = true;
    }
    if (!isSwiping.current) return;
    swipeX.current = dx;
    setTransform(rubberDx(dx));
    const progress = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
    if (dx < 0) { setLeftOpacity(progress); setRightOpacity(0); }
    else         { setRightOpacity(progress); setLeftOpacity(0); }
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
      setSnapped("left");
      setTransform(-SWIPE_THRESHOLD, "transform 0.22s cubic-bezier(0.25,1,0.5,1)");
      setLeftOpacity(1); setRightOpacity(0);
    } else if (dx > SWIPE_THRESHOLD) {
      confirmPay();
    } else {
      setSnapped(null);
      snapBack();
    }
  }, [onPressEnd, confirmPay, snapBack]);

  return (
    <div className="relative overflow-hidden rounded-2xl" data-shift-card>

      {/* Pay bg */}
      <div className="absolute inset-0 flex items-center justify-start px-6 rounded-2xl pointer-events-none"
        style={{ opacity: rightOpacity, background: isPaid ? "linear-gradient(135deg,#f43f5e,#e11d48)" : "linear-gradient(135deg,#10b981,#059669)", transition: "opacity 0.06s" }}>
        <CheckCircle2 className="w-6 h-6 text-white drop-shadow" />
        <span className="ml-2 text-white text-sm font-bold">{isPaid ? "Unpaid" : "Paid ✓"}</span>
      </div>

      {/* Delete bg */}
      <div className="absolute inset-0 flex items-center justify-end px-6 rounded-2xl pointer-events-none"
        style={{ opacity: leftOpacity, background: "linear-gradient(135deg,#ef4444,#dc2626)", transition: "opacity 0.06s" }}>
        <span className="mr-2 text-white text-sm font-bold">Delete</span>
        <Trash2 className="w-6 h-6 text-white drop-shadow" />
      </div>

      {/* Card */}
      <div ref={cardRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        onContextMenu={e => e.preventDefault()}
        className="touch-pan-y select-none relative z-10"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}>
        {children}
      </div>

      {/* Delete confirm strip */}
      <div style={{ maxHeight: snapped === "left" ? "52px" : "0px", overflow: "hidden", transition: "max-height 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div className="flex rounded-b-2xl overflow-hidden">
          <button onClick={confirmDelete}
            className="flex-1 py-3 text-xs font-bold text-white bg-rose-500 tracking-widest active:brightness-90 flex items-center justify-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> DELETE
          </button>
          <button onClick={resetSnap}
            className="px-6 py-3 text-xs font-semibold text-muted-foreground bg-muted active:brightness-95">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card inner ────────────────────────────────────────────────────────────────
function ShiftCardInner({ shift, onToggleStatus, onEdit, onDelete, onLongPress, disableSwipe = false }: ShiftCardProps) {
  const haptics  = useHaptics();
  const isMobile = useIsMobile();

  const station      = isStationShift(shift);
  const isPaid       = shift.status === "Paid";
  const taxWithheld  = station ? parseStationTax(shift.notes) : 0;
  const afterTax     = station ? Math.max(0, parseFloat(shift.amountEarned) - taxWithheld) : 0;
  const userNote     = station ? parseStationUserNote(shift.notes) : shift.notes;
  const hasNotes     = Boolean(userNote?.trim());

  const [notesOpen, setNotesOpen] = useState(false);
  const [pressed,   setPressed]   = useState(false);

  // Desktop long press
  const deskTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deskEvents = isMobile ? {} : {
    onMouseDown: () => { deskTimer.current = setTimeout(() => { haptics(20); onLongPress?.(shift); }, 500); },
    onMouseUp:   () => clearTimeout(deskTimer.current),
    onMouseLeave:() => clearTimeout(deskTimer.current),
  };

  const card = (
    <div {...deskEvents}
      className={`select-none overflow-hidden rounded-2xl border transition-all duration-75 ${pressed ? "scale-[0.985] brightness-95" : ""} ${
        station ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
                : "bg-card border-border/60"
      }`}
    >
      {/* Status bar */}
      <div className={`h-[3px] w-full ${
        station ? "bg-gradient-to-r from-blue-400 to-blue-600"
        : isPaid ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                 : "bg-gradient-to-r from-rose-400 to-rose-500"
      }`} />

      <div className="p-3.5">
        {/* Row 1: date/name + amount */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Date row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[15px] font-bold tracking-tight">{formatShortDate(shift.shiftDate)}</span>
              <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
              {station && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                  <MapPin className="w-2.5 h-2.5" /> STN
                </span>
              )}
            </div>
            {/* Name */}
            <p className={`text-sm font-semibold mt-0.5 truncate ${station ? "text-blue-700 dark:text-blue-400" : "text-foreground"}`}>
              {shift.coveringFor}
            </p>
            {!station && <p className="text-[11px] text-muted-foreground truncate">{shift.locationName}</p>}
            {station  && <p className="text-[11px] text-muted-foreground">{shift.hoursWorked}h · tax {formatCurrency(taxWithheld)}</p>}
          </div>

          {/* Right: amount + status */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[22px] font-black tabular-nums leading-none tracking-tight">
              {formatCurrency(parseFloat(shift.amountEarned))}
            </span>
            {station && <span className="text-[11px] text-muted-foreground">net {formatCurrency(afterTax)}</span>}
            {/* Status pill — tappable */}
            <button
              onClick={e => { e.stopPropagation(); haptics(8); onToggleStatus(shift); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-90 transition-transform ${
                isPaid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                       : "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
              }`}
            >
              {isPaid ? "✓ Paid" : "Unpaid"}
            </button>
          </div>
        </div>

        {/* Row 2: notes + actions */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          {/* Notes toggle */}
          <div className="flex-1 min-w-0">
            {hasNotes ? (
              <button
                onClick={e => { e.stopPropagation(); setNotesOpen(v => !v); }}
                className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 active:opacity-70"
              >
                <StickyNote className="w-3 h-3 shrink-0" />
                <span className="font-medium">Note</span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              /* Long-press hint — subtle, only on mobile */
              isMobile ? (
                <span className="text-[10px] text-muted-foreground/40">Hold for more</span>
              ) : null
            )}
          </div>

          {/* Action buttons — smaller, right-aligned */}
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); haptics(6); onEdit(shift); }}
              className="w-7 h-7 rounded-lg bg-muted/70 flex items-center justify-center active:scale-90 transition-transform"
            >
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); haptics(12); onDelete(shift); }}
              className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center active:scale-90 transition-transform"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
            </button>
          </div>
        </div>

        {/* Notes expanded */}
        {hasNotes && notesOpen && (
          <p className="mt-2 text-xs text-muted-foreground bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl px-3 py-2.5 leading-relaxed">
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
        onPressStart={() => setPressed(true)}
        onPressEnd={() => setPressed(false)}
      >
        {card}
      </SwipeWrapper>
    );
  }

  return card;
}

export const ShiftCard = React.memo(ShiftCardInner);
