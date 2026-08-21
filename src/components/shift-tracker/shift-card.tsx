"use client";

import React, { useRef, useState, useCallback } from "react";
import { MapPin, StickyNote, CheckCircle2, Trash2, ChevronDown } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import { isStationShift, parseStationTax, parseStationUserNote } from "@/types/database.types";
import type { Shift } from "@/types/database.types";
import type { CardDensity } from "@/stores/settings-store";

interface ShiftCardProps {
  shift: Shift;
  userName?: string;
  onToggleStatus: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onLongPress?: (shift: Shift) => void;
  onTap?: (shift: Shift) => void;
  density?: CardDensity;
  disableSwipe?: boolean;
  index?: number;
}

const SWIPE_THRESHOLD = 80;
const LONG_PRESS_MS   = 460;

// ── Swipe wrapper ─────────────────────────────────────────────────────────────
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
  const haptics  = useHaptics();
  const cardRef  = useRef<HTMLDivElement>(null);
  const [snapped, setSnapped]           = useState<null | "left">(null);
  const [leftPct,  setLeftPct]          = useState(0);
  const [rightPct, setRightPct]         = useState(0);
  const hapticFiredRef = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startX      = useRef(0);
  const startY      = useRef(0);
  const swipeX      = useRef(0);
  const isSwiping   = useRef(false);
  const longFired   = useRef(false);

  const setTx = (dx: number, tr = "none") => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = tr;
    cardRef.current.style.transform  = `translateX(${dx}px)`;
  };
  const rubber = (raw: number) => {
    const a = Math.abs(raw);
    if (a <= SWIPE_THRESHOLD) return raw;
    const d = SWIPE_THRESHOLD + (a - SWIPE_THRESHOLD) * 0.2;
    return raw < 0 ? -d : d;
  };
  const snapBack = useCallback(() => {
    setTx(0, "transform 0.38s cubic-bezier(0.34,1.56,0.64,1)");
    setLeftPct(0); setRightPct(0);
    hapticFiredRef.current = false;
  }, []);
  const confirmDelete = useCallback(() => {
    haptics(22);
    setTx(-480, "transform 0.2s cubic-bezier(0.55,0,1,0.45)");
    setTimeout(onDelete, 200);
  }, [haptics, onDelete]);
  const confirmPay = useCallback(() => {
    haptics(14);
    setTx(0, "transform 0.38s cubic-bezier(0.34,1.56,0.64,1)");
    setSnapped(null); setRightPct(0);
    setTimeout(onTogglePaid, 80);
  }, [haptics, onTogglePaid]);
  const resetSnap = useCallback(() => { setSnapped(null); snapBack(); }, [snapBack]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX; startY.current = t.clientY;
    swipeX.current = 0; isSwiping.current = false;
    longFired.current = false; hapticFiredRef.current = false;
    onPressStart?.();
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        longFired.current = true; haptics(20);
        onPressEnd?.(); onLongPress();
      }, LONG_PRESS_MS);
    }
  }, [onLongPress, onPressStart, onPressEnd, haptics]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = Math.abs(t.clientY - startY.current);
    if (dy > 16 && !isSwiping.current) { clearTimeout(timerRef.current); onPressEnd?.(); return; }
    if (Math.abs(dx) > 8) {
      clearTimeout(timerRef.current);
      if (!longFired.current) onPressEnd?.();
      isSwiping.current = true;
    }
    if (!isSwiping.current) return;
    swipeX.current = dx;
    setTx(rubber(dx));
    const p = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
    dx < 0 ? (setLeftPct(p), setRightPct(0)) : (setRightPct(p), setLeftPct(0));
    if (!hapticFiredRef.current && Math.abs(dx) >= SWIPE_THRESHOLD) {
      hapticFiredRef.current = true;
      // Different haptic: stronger for delete (left), softer for pay (right)
      dx < 0 ? haptics(14) : haptics(8);
    }
  }, [onPressEnd, haptics]);

  const onTouchEnd = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!longFired.current) onPressEnd?.();
    if (!isSwiping.current) return;
    const dx = swipeX.current;
    if (dx < -SWIPE_THRESHOLD) {
      setSnapped("left");
      setTx(-SWIPE_THRESHOLD, "transform 0.2s cubic-bezier(0.25,1,0.5,1)");
      setLeftPct(1); setRightPct(0);
    } else if (dx > SWIPE_THRESHOLD) { confirmPay(); }
    else { setSnapped(null); snapBack(); }
  }, [onPressEnd, confirmPay, snapBack]);

  return (
    <div className="relative rounded-2xl overflow-hidden" data-shift-card>
      {/* Pay bg */}
      <div className="absolute inset-0 flex items-center justify-start pl-5 pointer-events-none rounded-2xl"
        style={{ opacity: rightPct, background: isPaid ? "linear-gradient(135deg,#f43f5e,#e11d48)" : "linear-gradient(135deg,#10b981,#059669)", transition: "opacity 0.06s" }}>
        <CheckCircle2 className="w-5 h-5 text-white" />
        <span className="ml-2 text-white text-xs font-bold">{isPaid ? "Unpaid" : "Paid ✓"}</span>
      </div>
      {/* Delete bg */}
      <div className="absolute inset-0 flex items-center justify-end pr-5 pointer-events-none rounded-2xl"
        style={{ opacity: leftPct, background: "linear-gradient(135deg,#ef4444,#dc2626)", transition: "opacity 0.06s" }}>
        <span className="mr-2 text-white text-xs font-bold">Delete</span>
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      {/* Card */}
      <div ref={cardRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        onContextMenu={e => e.preventDefault()}
        className="touch-pan-y select-none relative z-10"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}>
        {children}
      </div>
      {/* Delete confirm */}
      <div style={{ maxHeight: snapped === "left" ? "48px" : "0px", overflow: "hidden", transition: "max-height 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div className="flex">
          <button onClick={confirmDelete}
            className="flex-1 py-3 text-xs font-bold text-white bg-rose-500 tracking-widest active:brightness-90 flex items-center justify-center gap-1.5 rounded-bl-2xl">
            <Trash2 className="w-3.5 h-3.5" /> DELETE
          </button>
          <button onClick={resetSnap}
            className="px-6 py-3 text-xs font-semibold text-muted-foreground bg-muted active:brightness-95 rounded-br-2xl">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card inner — compact, single-row layout ───────────────────────────────────
function ShiftCardInner({ shift, onToggleStatus, onEdit, onDelete, onLongPress, onTap, disableSwipe = false, userName = "Suraj" }: ShiftCardProps) {
  const isSelfName = (n: string) => n.toLowerCase() === userName.toLowerCase() || n.toLowerCase() === "myself";
  const haptics  = useHaptics();
  const isMobile = useIsMobile();
  const station  = isStationShift(shift);
  const isPaid   = shift.status === "Paid";
  const covered  = Boolean(shift.coveredBy);
  const isSelf   = !covered && (isSelfName(shift.coveringFor));
  const tax      = station ? parseStationTax(shift.notes) : 0;
  const net      = station ? Math.max(0, parseFloat(shift.amountEarned) - tax) : 0;
  const userNote = station ? parseStationUserNote(shift.notes) : shift.notes;
  const hasNote  = Boolean(userNote?.trim());
  const [noteOpen, setNoteOpen] = useState(false);
  const [pressed,  setPressed]  = useState(false);

  const deskTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deskEvents = isMobile ? {} : {
    onMouseDown: () => { deskTimer.current = setTimeout(() => { haptics(20); onLongPress?.(shift); }, 500); },
    onMouseUp:   () => clearTimeout(deskTimer.current),
    onMouseLeave:() => clearTimeout(deskTimer.current),
  };

  const card = (
    <div
      {...deskEvents}
      onClick={() => { if (isMobile) onTap?.(shift); else onEdit(shift); }}
      className={`select-none rounded-2xl border overflow-hidden transition-all duration-75 ${pressed ? "scale-[0.983] brightness-95" : ""} ${
        covered ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900"
        : isSelf  ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900"
        : station ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
                  : "bg-white dark:bg-card border-border/50 shadow-sm shadow-black/[0.04]"
      }`}
    >
      {/* Top status stripe */}
      <div className={`h-[2.5px] ${
        covered   ? "bg-gradient-to-r from-amber-400 to-orange-400"
        : isSelf  ? "bg-gradient-to-r from-purple-400 to-violet-500"
        : station ? "bg-gradient-to-r from-blue-400 to-blue-500"
        : isPaid  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : "bg-gradient-to-r from-rose-400 to-rose-500"
      }`} />

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: date + name + location */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-bold">{formatShortDate(shift.shiftDate)}</span>
            <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
            {station && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center gap-0.5"><MapPin className="w-2 h-2" />STN</span>}
            {covered && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">💸 by {shift.coveredBy}</span>}
            {isSelf && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">✦ You</span>}
            {hasNote && <StickyNote className="w-3 h-3 text-amber-400 shrink-0" />}
          </div>
          <p className={`text-sm font-semibold truncate ${covered ? "text-amber-700 dark:text-amber-300" : isSelf ? "text-purple-700 dark:text-purple-300" : station ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}>
            {covered ? "Your shift" : isSelf ? `${userName} (You)` : shift.coveringFor}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {station ? `${shift.hoursWorked}h · tax ${formatCurrency(tax)}` : shift.locationName}
          </p>
        </div>

        {/* Right: amount + status */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[18px] font-black tabular-nums leading-none tracking-tight">
            {formatCurrency(parseFloat(shift.amountEarned))}
          </span>
          {station && <span className="text-[10px] text-muted-foreground">net {formatCurrency(net)}</span>}
          <button
            onClick={e => { e.stopPropagation(); haptics(8); onToggleStatus(shift); }}
            aria-label={isPaid ? "Mark as unpaid" : "Mark as paid"}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full active:scale-90 transition-transform ${
              isPaid
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
            }`}
          >
            {isPaid ? "✓ Paid" : "Unpaid"}
          </button>
        </div>
      </div>

      {/* Note row — only if exists */}
      {hasNote && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setNoteOpen(v => !v); }}
            className="flex items-center gap-1 px-4 pb-2.5 text-[11px] text-amber-600 dark:text-amber-400 active:opacity-70"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${noteOpen ? "rotate-180" : ""}`} />
            {noteOpen ? "Hide note" : "Show note"}
          </button>
          {noteOpen && (
            <p className="mx-3 mb-3 text-[11px] text-muted-foreground bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl px-3 py-2 leading-relaxed">
              {userNote}
            </p>
          )}
        </>
      )}
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
