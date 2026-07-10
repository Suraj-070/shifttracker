"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign, CheckCircle2, XCircle, TrendingUp,
  Plus, CalendarDays, ChevronRight, User, MapPin,
  StickyNote, Wallet, Receipt, Clock, ChevronDown, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { DashboardSkeleton } from "./loading-skeleton";
import { parseStationTax, parseStationUserNote } from "@/types/database.types";
import { AnimatedCurrency } from "./animated-number";
import { EarningsChart } from "./earnings-chart";
import type { Shift, AnalyticsSummary } from "@/types/database.types";

// ─── Fortnight logic ─────────────────────────────────────────────────────────
//
// Anchor: Wed 24 Jun 2026 = actual payslip Wednesday (verified)
// Period: Wednesday → Tuesday (14 days)
//   - Work period idx 0: Wed 10 Jun → Tue 23 Jun | payslip Wed 24 Jun | pay Thu 25 Jun
//   - Work period idx 1: Wed 24 Jun → Tue 7 Jul  | payslip Wed 8 Jul  | pay Thu 9 Jul
//
// Formula:
//   payslip(idx) = ANCHOR + idx * 14
//   start(idx)   = payslip(idx) - 14   (Wednesday, 2 weeks before payslip)
//   end(idx)     = payslip(idx) - 1    (Tuesday, day before payslip)
//   pay(idx)     = payslip(idx) + 1    (Thursday, day after payslip)

const ANCHOR_PAYSLIP = new Date("2026-06-24T00:00:00"); // Wednesday 24 Jun 2026

const DAY_MS = 24 * 60 * 60 * 1000;
const FORTNIGHT_MS = 14 * DAY_MS;

function fortnightBounds(index: number): { start: Date; end: Date; payslipDate: Date; payDate: Date } {
  const payslipMs = ANCHOR_PAYSLIP.getTime() + index * FORTNIGHT_MS;
  return {
    payslipDate: new Date(payslipMs),                    // Wednesday
    start:       new Date(payslipMs - FORTNIGHT_MS),     // Wednesday 2 weeks before
    end:         new Date(payslipMs - DAY_MS),           // Tuesday before payslip
    payDate:     new Date(payslipMs + DAY_MS),           // Thursday after payslip
  };
}

function fortnightIndexForDate(date: Date): number {
  // Which index does this date fall into?
  // date is in period idx N if: start(N) <= date <= end(N)
  // start(N) = ANCHOR + N*14 - 14, end(N) = ANCHOR + N*14 - 1
  // => ANCHOR + (N-1)*14 <= date <= ANCHOR + N*14 - 1
  // => (date - ANCHOR) / 14 gives fractional index, ceil it
  const msSinceAnchor = date.getTime() - ANCHOR_PAYSLIP.getTime();
  // Days since anchor (can be negative for past periods)
  const daysSinceAnchor = msSinceAnchor / DAY_MS;
  // Index: anchor period (idx 0) covers days -14 to -1 relative to anchor
  // idx 1 covers days 0 to 13, idx 2 covers 14 to 27, etc.
  return Math.floor(daysSinceAnchor / 14) + 1;
}

function isInFortnight(shiftDate: string, index: number): boolean {
  const { start, end } = fortnightBounds(index);
  const d = new Date(shiftDate + "T00:00:00");
  return d >= start && d <= end;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function daysUntil(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function currentFortnightIndex(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return fortnightIndexForDate(today);
}

interface FortnightData {
  index: number;
  start: Date;
  end: Date;
  payslipDate: Date;
  payDate: Date;
  shifts: Shift[];
  gross: number;
  tax: number;
  net: number;
  isPast: boolean;
  isCurrent: boolean;
}

function buildFortnightData(stationShifts: Shift[]): FortnightData[] {
  const currentIdx = currentFortnightIndex();

  // Find range of fortnight indices needed
  const indices = new Set<number>();
  // Always include current and previous 5
  for (let i = currentIdx - 5; i <= currentIdx; i++) indices.add(i);
  // Also include any index that has shifts
  for (const s of stationShifts) {
    const d = new Date(s.shiftDate + "T00:00:00");
    const idx = fortnightIndexForDate(d);
    indices.add(idx);
  }

  return Array.from(indices)
    .sort((a, b) => b - a) // newest first
    .map((idx) => {
      const { start, end, payslipDate, payDate } = fortnightBounds(idx);
      const shifts = stationShifts.filter((s) => isInFortnight(s.shiftDate, idx));
      const gross = shifts.reduce((sum, s) => sum + parseFloat(s.amountEarned), 0);
      const tax = shifts.reduce((sum, s) => sum + parseStationTax(s.notes), 0);
      const net = Math.max(0, gross - tax);
      const isPast = idx < currentIdx;
      const isCurrent = idx === currentIdx;
      return { index: idx, start, end, payslipDate, payDate, shifts, gross, tax, net, isPast, isCurrent };
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
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardTab({
  summary,
  recentShifts,
  stationShifts,
  hallShifts,
  isLoading,
  onToggleStatus,
  onBulkMarkPaid,
  onAddShift,
  onViewAllShifts,
  compact = false,
}: DashboardTabProps) {
  const [dashKind, setDashKind] = useState<DashKind>("hall");
  const [expandedFortnight, setExpandedFortnight] = useState<number | null>(null);

  const fortnights = useMemo(() => buildFortnightData(stationShifts), [stationShifts]);
  const currentFortnight = useMemo(() => fortnights.find((f) => f.isCurrent), [fortnights]);
  const pastFortnights = useMemo(() => fortnights.filter((f) => f.isPast), [fortnights]);

  if (isLoading) return <DashboardSkeleton />;

  const paidPercent = summary.totalShifts > 0
    ? Math.round((summary.paidShifts / summary.totalShifts) * 100)
    : 0;

  const stationGross = stationShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned), 0);
  const stationTax = stationShifts.reduce((s, sh) => s + parseStationTax(sh.notes), 0);
  const stationNet = Math.max(0, stationGross - stationTax);
  const stationCount = stationShifts.length;
  const stationPaid = stationShifts.filter((s) => s.status === "Paid").length;
  const stationUnpaid = stationShifts.filter((s) => s.status === "Unpaid").length;
  const stationPaidPct = stationCount > 0 ? Math.round((stationPaid / stationCount) * 100) : 0;
  const recentStation = [...stationShifts]
    .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))
    .slice(0, 5);

  // Current fortnight progress
  const cfDaysTotal = 14;
  const cfDaysGone = currentFortnight
    ? Math.min(14, Math.max(0, Math.ceil((new Date().getTime() - currentFortnight.start.getTime()) / (24 * 60 * 60 * 1000))))
    : 0;
  const cfProgress = Math.round((cfDaysGone / cfDaysTotal) * 100);
  const daysToPayslip = currentFortnight ? daysUntil(currentFortnight.payslipDate) : 0;
  const daysToPayment = currentFortnight ? daysUntil(currentFortnight.payDate) : 0;

  return (
    <div className="space-y-4">

      {/* Hall / Station tab switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setDashKind("hall")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            dashKind === "hall"
              ? "bg-background text-emerald-700 shadow-sm ring-1 ring-emerald-200"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Hall
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${dashKind === "hall" ? "bg-emerald-100 text-emerald-700" : "bg-muted-foreground/20 text-muted-foreground"}`}>
            {summary.totalShifts}
          </span>
        </button>
        <button
          onClick={() => setDashKind("station")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            dashKind === "station"
              ? "bg-background text-blue-700 shadow-sm ring-1 ring-blue-200"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Station
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${dashKind === "station" ? "bg-blue-100 text-blue-700" : "bg-muted-foreground/20 text-muted-foreground"}`}>
            {stationCount}
          </span>
        </button>
      </div>

      <>

        {/* ── HALL DASHBOARD ─────────────────────────────────── */}
        {dashKind === "hall" && (
          <div>

            {/* ── Unpaid hero — only when unpaid shifts exist ── */}
            {summary.totalUnpaid > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary/60 uppercase tracking-widest mb-1">Unpaid</p>
                  <AnimatedCurrency value={summary.totalUnpaid} className="text-3xl font-bold text-primary tabular-nums" duration={500} />
                  <p className="text-[11px] text-primary/50 mt-1">{summary.unpaidShifts} shift{summary.unpaidShifts !== 1 ? "s" : ""} outstanding</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </div>
            )}

            {/* ── 2 key stats only ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Total Earned</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(summary.totalEarned)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{summary.totalShifts} shifts</p>
              </div>
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avg / Shift</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(summary.averagePerShift)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{paidPercent}% collected</p>
              </div>
            </div>

            {/* ── Recent shifts — clean 1-line rows ── */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <p className="text-sm font-bold">Recent</p>
                <button onClick={onViewAllShifts} className="text-xs text-primary font-semibold flex items-center gap-0.5">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {recentShifts.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2">
                  <span className="text-3xl"></span>
                  <p className="text-sm text-muted-foreground">No shifts yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentShifts.map((shift) => {
                    const isPaid = shift.status === "Paid";
                    return (
                      <div key={shift.id} className="flex items-center gap-3 px-4 py-2.5 active:bg-muted/30 transition-colors">
                        <div className={`w-2 h-8 rounded-full shrink-0 ${isPaid ? "bg-gradient-to-b from-emerald-400 to-emerald-600" : "bg-gradient-to-b from-rose-400 to-rose-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{shift.coveringFor}</p>
                          <p className="text-[11px] text-muted-foreground">{formatShortDate(shift.shiftDate)} · {shift.shiftDay}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</span>
                          <span className={`text-[10px] font-bold ${isPaid ? "text-emerald-600" : "text-rose-500"}`}>
                            {isPaid ? "✓ Paid" : "Unpaid"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Earnings chart — collapsible ── */}
            {hallShifts.length > 1 && (
              <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold">6-Week Earnings</p>
                  <span className="text-xs text-muted-foreground">Hall</span>
                </div>
                <EarningsChart shifts={hallShifts} weeks={6} />
              </div>
            )}
          </div>
        )}

        {/* ── STATION DASHBOARD ──────────────────────────────── */}
        {dashKind === "station" && (
          <div>

            {stationCount === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No station shifts yet.</p>
                  <Button className="mt-4 gap-2" onClick={onAddShift}><Plus className="w-4 h-4" /> Add Station Shift</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* ── Net take-home hero ── */}
                {stationUnpaid > 0 && (
                  <div>
                    <div>
                      <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">Unpaid</p>
                      <AnimatedCurrency value={stationUnpaid > 0 ? stationNet * (stationUnpaid / stationCount) : 0} className="text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums" duration={500} />
                      <p className="text-[11px] text-blue-400 mt-1">{stationUnpaid} shift{stationUnpaid !== 1 ? "s" : ""} outstanding</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                )}

                {/* ── 2 key stats ── */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border/50 rounded-2xl p-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Net Take-home</p>
                    <p className="text-2xl font-bold tabular-nums">{formatCurrency(stationNet)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{stationCount} shifts</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-2xl p-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tax Withheld</p>
                    <p className="text-2xl font-bold tabular-nums text-amber-600">{formatCurrency(stationTax)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{stationPaidPct}% collected</p>
                  </div>
                </div>

                {/* ── Current Fortnight card ────────────────────── */}
                {currentFortnight && (
                  <Card className="border-blue-200 dark:border-blue-700 py-0 gap-0">
                    <CardHeader className="px-4 py-3 border-b border-blue-100 dark:border-blue-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">Current Fortnight</CardTitle>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDateShort(currentFortnight.start)} – {formatDateShort(currentFortnight.end)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">

                      {/* Countdown */}
                      <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-900/30/30 px-4 py-3">
                        <div>
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            {daysToPayslip <= 0 ? "Payslip today! 🎉" : daysToPayslip === 1 ? "Payslip tomorrow!" : `Payslip in ${daysToPayslip} days`}
                          </p>
                          <p className="text-[11px] text-blue-600/70 dark:text-blue-500 mt-0.5">
                            {daysToPayment <= 0 ? "Money in account today! 💰" : `Money in account ${daysToPayment === 1 ? "tomorrow" : `in ${daysToPayment} days`} (Thu ${formatDateShort(currentFortnight.payDate)})`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{Math.max(0, daysToPayslip)}</p>
                          <p className="text-[10px] text-muted-foreground">days left</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>{formatDateShort(currentFortnight.start)}</span>
                          <span>{cfDaysGone} of {cfDaysTotal} days</span>
                          <span>{formatDateShort(currentFortnight.end)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${cfProgress}%` }} />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Shifts", value: String(currentFortnight.shifts.length) },
                          { label: "Gross", value: formatCurrency(currentFortnight.gross) },
                          { label: "Net", value: formatCurrency(currentFortnight.net) },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-muted/50 p-2.5 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{item.label}</p>
                            <p className="text-sm font-bold tabular-nums">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {currentFortnight.shifts.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No station shifts recorded this fortnight yet.</p>
                      )}

                      {/* ── Bulk mark paid ── */}
                      {currentFortnight.shifts.some(s => s.status === "Unpaid") && (
                        <button
                          onClick={() => onBulkMarkPaid(currentFortnight.shifts.filter(s => s.status === "Unpaid"))}
                          className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold active:scale-95 transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          ✓ Mark all {currentFortnight.shifts.filter(s => s.status === "Unpaid").length} shifts as paid
                        </button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* ── Past Fortnights ───────────────────────────── */}
                {pastFortnights.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Past Fortnights</p>
                    {pastFortnights.map((fn) => {
                      const isExpanded = expandedFortnight === fn.index;
                      const allPaid = fn.shifts.length > 0 && fn.shifts.every((s) => s.status === "Paid");
                      const hasShifts = fn.shifts.length > 0;
                      return (
                        <Card key={fn.index} className={`py-0 gap-0 overflow-hidden ${hasShifts ? "border-blue-100 dark:border-blue-900" : "opacity-50"}`}>
                          <button
                            className="w-full text-left"
                            onClick={() => hasShifts && setExpandedFortnight(isExpanded ? null : fn.index)}
                          >
                            <div className="flex items-center gap-3 px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{formatDateShort(fn.start)} – {formatDateShort(fn.end)}</span>
                                  {allPaid
                                    ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">Paid ✓</Badge>
                                    : fn.shifts.some(s => s.status === "Unpaid") && (
                                      <button
                                        onClick={e => { e.stopPropagation(); onBulkMarkPaid(fn.shifts.filter(s => s.status === "Unpaid")); }}
                                        className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold active:scale-95 transition-all"
                                      >
                                        ✓ Mark paid
                                      </button>
                                    )
                                  }
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {hasShifts
                                    ? `${fn.shifts.length} shift${fn.shifts.length !== 1 ? "s" : ""} · Payslip ${formatDateShort(fn.payslipDate)} · Pay ${formatDateShort(fn.payDate)}`
                                    : "No shifts this fortnight"}
                                </p>
                              </div>
                              {hasShifts && (
                                <div className="text-right shrink-0 flex items-center gap-3">
                                  <div>
                                    <p className="text-sm font-bold tabular-nums">{formatCurrency(fn.gross)}</p>
                                    <p className="text-[11px] text-muted-foreground">net {formatCurrency(fn.net)}</p>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                              )}
                            </div>
                          </button>

                          {/* Expanded shifts */}
                          <AnimatePresence>
                            {isExpanded && (
                              <div>
                                <div className="border-t border-blue-100 dark:border-blue-900 divide-y divide-border/50">
                                  {fn.shifts.map((shift) => {
                                    const isPaid = shift.status === "Paid";
                                    const tax = parseStationTax(shift.notes);
                                    const net = Math.max(0, parseFloat(shift.amountEarned) - tax);
                                    const userNote = parseStationUserNote(shift.notes);
                                    return (
                                      <div key={shift.id} className="flex items-center gap-3 px-4 py-2.5">
                                        <div className={`w-1 h-8 rounded-full shrink-0 ${isPaid ? "bg-blue-500" : "bg-rose-400"}`} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{formatShortDate(shift.shiftDate)}</span>
                                            <span className="text-[11px] text-muted-foreground">{shift.shiftDay}</span>
                                            <span className="text-[11px] text-blue-600 dark:text-blue-300 font-medium truncate">{shift.coveringFor}</span>
                                          </div>
                                          <p className="text-[11px] text-muted-foreground">{shift.hoursWorked}h · tax {formatCurrency(tax)}{userNote ? ` · ${userNote}` : ""}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</p>
                                          <p className="text-[11px] text-muted-foreground">net {formatCurrency(net)}</p>
                                        </div>
                                        <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 cursor-pointer shrink-0 ${isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`} onClick={() => onToggleStatus(shift)}>
                                          {shift.status}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Recent station shifts */}
                <Card className="py-0 gap-0 border-blue-100 dark:border-blue-900">
                  <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" /> Recent Station Shifts
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground -mr-2" onClick={onViewAllShifts}>
                      View all <ChevronRight className="w-3 h-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {recentStation.map((shift) => {
                        const isPaid = shift.status === "Paid";
                        const tax = parseStationTax(shift.notes);
                        const net = Math.max(0, parseFloat(shift.amountEarned) - tax);
                        const userNote = parseStationUserNote(shift.notes);
                        return (
                          <div key={shift.id} className="flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors">
                            <div className={`w-1 h-10 rounded-full shrink-0 ${isPaid ? "bg-blue-500" : "bg-rose-400"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-semibold">{formatShortDate(shift.shiftDate)}</span>
                                <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3 shrink-0 text-blue-400" />
                                <span className="truncate font-medium text-blue-600 dark:text-blue-300">{shift.coveringFor}</span>
                                {userNote && <StickyNote className="w-3 h-3 shrink-0 text-amber-500 ml-0.5" />}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <span>{shift.hoursWorked}h · tax: {formatCurrency(tax)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</span>
                              <span className="text-[11px] text-muted-foreground">net: {formatCurrency(net)}</span>
                              <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 cursor-pointer ${isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"}`} onClick={() => onToggleStatus(shift)}>
                                {shift.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
