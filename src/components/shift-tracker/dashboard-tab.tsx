"use client";
import { useSettingsStore } from "@/stores/settings-store";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, ChevronRight, MapPin,
  StickyNote, Clock, ChevronDown, TrendingUp,
} from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { DashboardSkeleton } from "./loading-skeleton";
import { parseStationTax, parseStationUserNote } from "@/types/database.types";
import { AnimatedCurrency } from "./animated-number";
import { EarningsChart } from "./earnings-chart";
import type { Shift, AnalyticsSummary } from "@/types/database.types";

// ─── Fortnight logic ──────────────────────────────────────────────────────────
const DAY_MS       = 86400000;
const FORTNIGHT_MS = DAY_MS * 14;

function getAnchor(anchorStr: string) {
  return new Date(anchorStr + "T00:00:00");
}
function fortnightBounds(index: number, anchor: Date) {
  const payslipMs = anchor.getTime() + index * FORTNIGHT_MS;
  return {
    payslipDate: new Date(payslipMs),
    start:       new Date(payslipMs - FORTNIGHT_MS),
    end:         new Date(payslipMs - DAY_MS),
    payDate:     new Date(payslipMs + DAY_MS),
  };
}
function fortnightIndexForDate(date: Date, anchor: Date) {
  return Math.floor((date.getTime() - anchor.getTime()) / FORTNIGHT_MS) + 1;
}
function isInFortnight(shiftDate: string, index: number, anchor: Date) {
  const { start, end } = fortnightBounds(index, anchor);
  const d = new Date(shiftDate + "T00:00:00");
  return d >= start && d <= end;
}
function fmt(d: Date) {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
function daysUntil(d: Date) {
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / DAY_MS);
}

interface FortnightData {
  index: number; start: Date; end: Date; payslipDate: Date; payDate: Date;
  shifts: Shift[]; gross: number; tax: number; net: number; isPast: boolean; isCurrent: boolean;
}

function buildFortnightData(stationShifts: Shift[], anchorStr: string): FortnightData[] {
  const anchor = getAnchor(anchorStr);
  const today  = new Date(); today.setHours(0,0,0,0);
  const currentIdx = fortnightIndexForDate(today, anchor);
  const indices = new Set<number>();
  for (let i = currentIdx - 5; i <= currentIdx; i++) indices.add(i);
  for (const s of stationShifts) {
    indices.add(fortnightIndexForDate(new Date(s.shiftDate + "T00:00:00"), anchor));
  }
  return Array.from(indices).sort((a,b) => b-a).map(idx => {
    const { start, end, payslipDate, payDate } = fortnightBounds(idx, anchor);
    const shifts = stationShifts.filter(s => isInFortnight(s.shiftDate, idx, anchor));
    const gross  = shifts.reduce((s,sh) => s + parseFloat(sh.amountEarned), 0);
    const tax    = shifts.reduce((s,sh) => s + parseStationTax(sh.notes), 0);
    return { index: idx, start, end, payslipDate, payDate, shifts, gross, tax, net: Math.max(0, gross-tax), isPast: idx < currentIdx, isCurrent: idx === currentIdx };
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DashKind = "hall" | "station";

interface DashboardTabProps {
  summary: AnalyticsSummary;
  recentShifts: Shift[];
  stationShifts: Shift[];
  hallShifts: Shift[];
  isLoading: boolean;
  onToggleStatus: (shift: Shift) => void;
  onBulkMarkPaid: (shifts: Shift[]) => void;
  onAddShift: () => void;
  onViewAllShifts: () => void;
  onEditShift: (shift: Shift) => void;
  allShifts: Shift[];
  userName?: string;
  compact?: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? "bg-primary text-primary-foreground" : "bg-card border border-border/50"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{label}</p>
      <p className={`text-xl font-black tabular-nums ${accent ? "text-primary-foreground" : ""}`}>{value}</p>
      {sub && <p className={`text-[11px] mt-1 ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

function OweCard({ oweData, totalOwe }: { oweData: { name: string; shifts: Shift[]; total: number }[]; totalOwe: number }) {
  if (!oweData.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.98 0.03 85), oklch(0.96 0.04 75))" }}>
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-lg">💸</div>
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">To Pay Out</p>
            <p className="text-[11px] text-amber-600/70">{oweData.reduce((s,d) => s+d.shifts.length,0)} covered shifts</p>
          </div>
        </div>
        <p className="text-xl font-black tabular-nums text-amber-700 dark:text-amber-300">{formatCurrency(totalOwe)}</p>
      </div>
      <div className="border-t border-amber-200/70 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900/50">
        {oweData.map(d => (
          <div key={d.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-black text-amber-700 dark:text-amber-300">
                {d.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="text-[10px] text-muted-foreground">{d.shifts.length} shift{d.shifts.length!==1?"s":""}</p>
              </div>
            </div>
            <p className="text-sm font-black tabular-nums text-amber-700 dark:text-amber-400">{formatCurrency(d.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function DashboardTab({
  summary, recentShifts, stationShifts, hallShifts,
  isLoading, onToggleStatus, onBulkMarkPaid,
  onAddShift, onViewAllShifts, onEditShift,
  allShifts, userName = "Suraj",
}: DashboardTabProps) {
  const [dashKind, setDashKind]             = useState<DashKind>("hall");
  const [expandedFortnight, setExpanded]    = useState<number | null>(null);
  const fortnightAnchor                     = useSettingsStore(s => s.fortnightAnchor);
  const isSelfName = (n: string) => n.toLowerCase() === userName.toLowerCase() || n.toLowerCase() === "myself";

  const oweData = useMemo(() => {
    const map = new Map<string, { shifts: Shift[]; total: number }>();
    for (const s of allShifts) {
      if (!s.coveredBy) continue;
      const ex = map.get(s.coveredBy) ?? { shifts: [], total: 0 };
      ex.shifts.push(s); ex.total += parseFloat(s.amountEarned);
      map.set(s.coveredBy, ex);
    }
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d }));
  }, [allShifts]);

  const totalOwe      = useMemo(() => oweData.reduce((s,d) => s+d.total, 0), [oweData]);
  const fortnights    = useMemo(() => buildFortnightData(stationShifts, fortnightAnchor), [stationShifts, fortnightAnchor]);
  const currentFN     = fortnights.find(f => f.isCurrent);
  const pastFNs       = fortnights.filter(f => f.isPast && f.shifts.length > 0);
  const stationCount  = stationShifts.length;
  const stationGross  = stationShifts.reduce((s,sh) => s + parseFloat(sh.amountEarned), 0);
  const stationTax    = stationShifts.reduce((s,sh) => s + parseStationTax(sh.notes), 0);
  const stationNet    = Math.max(0, stationGross - stationTax);
  const stationUnpaid = stationShifts.filter(s => s.status === "Unpaid").length;
  const paidPct       = summary.totalShifts > 0 ? Math.round((summary.paidShifts / summary.totalShifts) * 100) : 0;

  if (isLoading) return <DashboardSkeleton />;

  if (!hallShifts.length && !stationShifts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 flex items-center justify-center">
          <span className="text-4xl">📋</span>
        </div>
        <div>
          <p className="text-xl font-black mb-1">No shifts yet</p>
          <p className="text-sm text-muted-foreground leading-relaxed">Add your first shift to start tracking your earnings</p>
        </div>
        <button onClick={onAddShift} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25">
          + Add First Shift
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Sticky segmented control ── */}
      <div className="sticky top-0 z-30">
        <div className="absolute inset-0 -mx-4" style={{ background: "color-mix(in oklch, var(--background) 88%, transparent)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
        <div className="relative flex justify-center py-2.5">
          <div className="flex gap-0.5 p-1 bg-muted/90 rounded-2xl shadow-sm">
            {[
              { key: "hall", label: "Hall", badge: hallShifts.length, dot: "bg-emerald-500", active: "text-emerald-700" },
              { key: "station", label: "Station", badge: stationCount, dot: null, active: "text-blue-700" },
            ].map(t => (
              <button key={t.key} onClick={() => setDashKind(t.key as DashKind)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${dashKind === t.key ? `bg-white dark:bg-card ${t.active} shadow-sm` : "text-muted-foreground"}`}>
                {t.dot ? <span className={`w-2 h-2 rounded-full ${t.dot} shrink-0`} /> : <MapPin className="w-3.5 h-3.5 shrink-0" />}
                {t.label}
                <span className={`text-[11px] font-bold tabular-nums ${dashKind === t.key ? "" : "opacity-40"}`}>{t.badge}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ HALL ══════════════════════════════════════════════════════════════ */}
      {dashKind === "hall" && (
        <div className="space-y-3">

          {/* Hero — unpaid amount */}
          {summary.totalUnpaid > 0 ? (
            <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.55 0.17 162), oklch(0.42 0.15 162))" }}>
              {/* Background decoration */}
              <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-10 bg-white" style={{ transform: "translate(30%, -30%)" }} />
              <div className="absolute right-8 bottom-0 w-20 h-20 rounded-full opacity-10 bg-white" style={{ transform: "translate(0%, 40%)" }} />
              <div className="relative">
                <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">Unpaid</p>
                <AnimatedCurrency value={summary.totalUnpaid} className="text-5xl font-black text-white tabular-nums tracking-tight" duration={600} />
                <p className="text-white/60 text-[12px] mt-1.5">{summary.unpaidShifts} shift{summary.unpaidShifts !== 1 ? "s" : ""} outstanding</p>
                {/* Progress bar showing paid % */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-white/50 mb-1.5">
                    <span>{paidPct}% collected</span>
                    <span>{formatCurrency(summary.totalEarned - summary.totalUnpaid)} paid</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.55 0.15 162), oklch(0.42 0.13 162))" }}>
              <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-10 bg-white" style={{ transform: "translate(30%, -30%)" }} />
              <div className="relative">
                <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">All Paid 🎉</p>
                <p className="text-4xl font-black text-white tabular-nums">{formatCurrency(summary.totalEarned)}</p>
                <p className="text-white/60 text-[12px] mt-1.5">{summary.totalShifts} shifts · fully collected</p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
<StatCard label="Your Earnings" value={formatCurrency(summary.totalEarned)} sub={`${summary.totalShifts} shifts worked`} />
<StatCard label="Per Shift" value={formatCurrency(summary.averagePerShift)} sub={`${paidPct}% collected`} />
          </div>

          {/* Owe card */}
          <OweCard oweData={oweData} totalOwe={totalOwe} />

          {/* Recent shifts */}
          <div className="rounded-2xl overflow-hidden bg-card border border-border/50">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
              <div>
                <p className="text-sm font-bold">Recent Shifts</p>
                <p className="text-[11px] text-muted-foreground">{recentShifts.length} of {summary.totalShifts}</p>
              </div>
              <button onClick={onViewAllShifts} className="flex items-center gap-1 text-xs text-primary font-bold px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-transform">
                See all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentShifts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No shifts yet</div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentShifts.map(shift => {
                  const isPaid    = shift.status === "Paid";
                  const isCovered = Boolean(shift.coveredBy);
                  const isSelf    = !isCovered && isSelfName(shift.coveringFor ?? "");
                  const name      = isCovered ? `Your shift · by ${shift.coveredBy}` : isSelf ? `${userName} (You)` : shift.coveringFor;
                  const stripe    = isCovered ? "bg-amber-400" : isSelf ? "bg-purple-500" : isPaid ? "bg-emerald-500" : "bg-rose-400";
                  const nameColor = isCovered ? "text-amber-600 dark:text-amber-400" : isSelf ? "text-purple-600 dark:text-purple-400" : "";
                  return (
                    <button key={shift.id} onClick={() => onEditShift(shift)}
                      className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors text-left">
                      <div className={`w-1 h-9 rounded-full shrink-0 ${stripe}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${nameColor}`}>{name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatShortDate(shift.shiftDate)} · {shift.shiftDay}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</p>
                        <p className={`text-[10px] font-bold ${isPaid ? "text-emerald-600" : isCovered ? "text-amber-500" : "text-rose-500"}`}>
                          {isPaid ? "✓ Paid" : isCovered ? "Owed" : "Unpaid"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Earnings chart */}
          {hallShifts.length > 2 && (
            <div className="rounded-2xl bg-card border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold">6-Week Earnings</p>
              </div>
              <EarningsChart shifts={hallShifts} weeks={6} />
            </div>
          )}
        </div>
      )}

      {/* ══ STATION ═══════════════════════════════════════════════════════════ */}
      {dashKind === "station" && (
        <div className="space-y-3">
          {stationCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-base font-bold">No station shifts yet</p>
              <button onClick={onAddShift} className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold active:scale-95 transition-transform">
                + Add Station Shift
              </button>
            </div>
          ) : (
            <>
              {/* Station hero */}
              <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.52 0.15 255), oklch(0.40 0.13 255))" }}>
                <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-10 bg-white" style={{ transform: "translate(30%, -30%)" }} />
                <div className="relative">
                  <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">{stationUnpaid > 0 ? "Unpaid Net" : "Net Take-home"}</p>
                  <AnimatedCurrency value={stationNet} className="text-5xl font-black text-white tabular-nums tracking-tight" duration={600} />
                  <p className="text-white/60 text-[12px] mt-1.5">{stationCount} shifts · {formatCurrency(stationTax)} tax withheld</p>
                </div>
              </div>

              {/* Station stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Gross Earned" value={formatCurrency(stationGross)} sub={`${stationCount} shifts`} />
                <StatCard label="Tax Withheld" value={formatCurrency(stationTax)} sub={`${Math.round((stationTax/stationGross)*100)||0}% rate`} />
              </div>

              {/* Current fortnight */}
              {currentFN && (
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800 overflow-hidden bg-blue-50/50 dark:bg-blue-950/10">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Current Fortnight</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{fmt(currentFN.start)} – {fmt(currentFN.end)}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Countdown */}
                    <div className="flex items-center justify-between bg-white/70 dark:bg-blue-900/20 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {daysUntil(currentFN.payslipDate) <= 0 ? "Payslip today! 🎉" : `Payslip in ${daysUntil(currentFN.payslipDate)} day${daysUntil(currentFN.payslipDate)!==1?"s":""}`}
                        </p>
                        <p className="text-[11px] text-blue-500/70 mt-0.5">
                          {daysUntil(currentFN.payDate) <= 0 ? "Money in account today! 💰" : `Pay in ${daysUntil(currentFN.payDate)} days (Thu ${fmt(currentFN.payDate)})`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-700 dark:text-blue-300 tabular-nums">{Math.max(0, daysUntil(currentFN.payslipDate))}</p>
                        <p className="text-[10px] text-muted-foreground">days</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                        <span>{fmt(currentFN.start)}</span>
                        <span>{Math.min(14, Math.max(0, Math.ceil((Date.now() - currentFN.start.getTime()) / DAY_MS)))} / 14 days</span>
                        <span>{fmt(currentFN.end)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-blue-100 dark:bg-blue-900 overflow-hidden">
                        <motion.div className="h-full rounded-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, Math.ceil((Date.now() - currentFN.start.getTime()) / DAY_MS) / 14 * 100))}%` }}
                          transition={{ duration: 0.9, ease: "easeOut" }} />
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Shifts", value: String(currentFN.shifts.length) },
                        { label: "Gross",  value: formatCurrency(currentFN.gross) },
                        { label: "Net",    value: formatCurrency(currentFN.net) },
                      ].map(item => (
                        <div key={item.label} className="bg-white/60 dark:bg-blue-900/20 rounded-xl p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">{item.label}</p>
                          <p className="text-sm font-black tabular-nums">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {currentFN.shifts.some(s => s.status === "Unpaid") && (
                      <button onClick={() => onBulkMarkPaid(currentFN.shifts.filter(s => s.status === "Unpaid"))}
                        className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20">
                        ✓ Mark {currentFN.shifts.filter(s => s.status === "Unpaid").length} shifts as paid
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Past fortnights */}
              {pastFNs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Past Fortnights</p>
                  {pastFNs.map(fn => {
                    const isExpanded = expandedFortnight === fn.index;
                    const allPaid = fn.shifts.every(s => s.status === "Paid");
                    return (
                      <div key={fn.index} className="rounded-2xl border border-blue-100 dark:border-blue-900 bg-card overflow-hidden">
                        <button className="w-full text-left" onClick={() => setExpanded(isExpanded ? null : fn.index)}>
                          <div className="flex items-center gap-3 px-4 py-3.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold">{fmt(fn.start)} – {fmt(fn.end)}</p>
                                {allPaid
                                  ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Paid</span>
                                  : <button onClick={e => { e.stopPropagation(); onBulkMarkPaid(fn.shifts.filter(s => s.status==="Unpaid")); }}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white active:scale-95">Mark paid</button>
                                }
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{fn.shifts.length} shift{fn.shifts.length!==1?"s":""} · Pay {fmt(fn.payDate)}</p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-3">
                              <div>
                                <p className="text-sm font-bold tabular-nums">{formatCurrency(fn.gross)}</p>
                                <p className="text-[11px] text-muted-foreground">net {formatCurrency(fn.net)}</p>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-blue-100 dark:border-blue-900 divide-y divide-border/40">
                            {fn.shifts.map(shift => {
                              const isPaid = shift.status === "Paid";
                              const tax    = parseStationTax(shift.notes);
                              const note   = parseStationUserNote(shift.notes);
                              return (
                                <div key={shift.id} onClick={() => onEditShift(shift)} className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-muted/40 transition-colors">
                                  <div className={`w-1 h-8 rounded-full shrink-0 ${isPaid ? "bg-blue-500" : "bg-rose-400"}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold">{formatShortDate(shift.shiftDate)}</p>
                                      <p className="text-[11px] text-muted-foreground">{shift.shiftDay}</p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">{shift.hoursWorked}h · tax {formatCurrency(tax)}{note ? ` · ${note}` : ""}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</p>
                                    <p className="text-[11px] text-muted-foreground">net {formatCurrency(Math.max(0, parseFloat(shift.amountEarned)-tax))}</p>
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); onToggleStatus(shift); }}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                                    {shift.status}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

export default React.memo(DashboardTab);
export { DashboardTab };
