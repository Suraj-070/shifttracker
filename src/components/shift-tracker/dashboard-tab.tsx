"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, CheckCircle2, XCircle, TrendingUp,
  Plus, CalendarDays, ChevronRight, User, MapPin,
  StickyNote, Train, Wallet, Receipt, Clock, ChevronDown,
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
          <Train className="w-3.5 h-3.5" />
          Station
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${dashKind === "station" ? "bg-blue-100 text-blue-700" : "bg-muted-foreground/20 text-muted-foreground"}`}>
            {stationCount}
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ── HALL DASHBOARD ─────────────────────────────────── */}
        {dashKind === "hall" && (
          <motion.div key="hall" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: "Total Earned", value: summary.totalEarned, icon: DollarSign, color: "emerald" },
                { title: "Paid", value: summary.totalPaid, icon: CheckCircle2, color: "emerald" },
                { title: "Unpaid", value: summary.totalUnpaid, icon: XCircle, color: "rose" },
                { title: "Avg / Shift", value: summary.averagePerShift, icon: TrendingUp, color: "amber" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                const colorMap: Record<string, string> = {
                  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
                  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
                  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                };
                return (
                  <motion.div key={stat.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="py-0 gap-0">
                      <CardContent className="p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                          <div className={`p-1.5 rounded-lg ${colorMap[stat.color]}`}><Icon className="w-3.5 h-3.5" /></div>
                        </div>
                        <AnimatedCurrency value={stat.value} className="text-lg font-bold tabular-nums tracking-tight" duration={600} />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <Card className="py-0 gap-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Collection rate</p>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{paidPercent}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${paidPercent}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{summary.paidShifts} paid</span>
                  <span className="text-xs text-muted-foreground">{summary.unpaidShifts} unpaid</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button className="h-12 gap-2 text-sm" onClick={onAddShift}><Plus className="w-4 h-4" /> Add Shift</Button>
              <Button variant="outline" className="h-12 gap-2 text-sm" onClick={onViewAllShifts}><CalendarDays className="w-4 h-4" /> All Shifts</Button>
            </div>

            <Card className="py-0 gap-0">
              <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
                <CardTitle className="text-sm font-semibold">Recent Shifts</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground -mr-2" onClick={onViewAllShifts}>
                  View all <ChevronRight className="w-3 h-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {recentShifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No hall shifts recorded yet</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {recentShifts.map((shift) => {
                      const isPaid = shift.status === "Paid";
                      return (
                        <div key={shift.id} className="flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors">
                          <div className={`w-1 h-10 rounded-full shrink-0 ${isPaid ? "bg-primary" : "bg-rose-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold">{formatShortDate(shift.shiftDate)}</span>
                              <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">{shift.coveringFor}</span>
                              {shift.notes && shift.notes.trim() && <StickyNote className="w-3 h-3 shrink-0 text-amber-500 ml-0.5" />}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{shift.locationName}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</span>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 cursor-pointer ${isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"}`} onClick={() => onToggleStatus(shift)}>
                              {shift.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Earnings chart */}
            {hallShifts.length > 0 && (
              <Card className="py-0 gap-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Weekly Earnings</p>
                    <span className="text-xs text-muted-foreground">Hall shifts</span>
                  </div>
                  <EarningsChart shifts={hallShifts} weeks={6} />
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── STATION DASHBOARD ──────────────────────────────── */}
        {dashKind === "station" && (
          <motion.div key="station" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">

            {stationCount === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Train className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No station shifts yet.</p>
                  <Button className="mt-4 gap-2" onClick={onAddShift}><Plus className="w-4 h-4" /> Add Station Shift</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overall station stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: "Gross Earned", value: stationGross, icon: Wallet, color: "blue" },
                    { title: "Tax Withheld", value: stationTax, icon: Receipt, color: "amber" },
                    { title: "Net Take-home", value: stationNet, icon: DollarSign, color: "blue" },
                    { title: "Avg / Shift", value: stationCount > 0 ? stationGross / stationCount : 0, icon: TrendingUp, color: "blue" },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    const colorMap: Record<string, string> = {
                      blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
                      amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                    };
                    return (
                      <motion.div key={stat.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="py-0 gap-0 border-blue-100 dark:border-blue-900">
                          <CardContent className="p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                              <div className={`p-1.5 rounded-lg ${colorMap[stat.color]}`}><Icon className="w-3.5 h-3.5" /></div>
                            </div>
                            <AnimatedCurrency value={stat.value} className="text-lg font-bold tabular-nums tracking-tight" duration={600} />
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Collection progress */}
                <Card className="py-0 gap-0 border-blue-100 dark:border-blue-900">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Collection rate</p>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{stationPaidPct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full rounded-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${stationPaidPct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{stationPaid} paid</span>
                      <span className="text-xs text-muted-foreground">{stationUnpaid} unpaid</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button className="h-12 gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={onAddShift}><Plus className="w-4 h-4" /> Add Shift</Button>
                  <Button variant="outline" className="h-12 gap-2 text-sm border-blue-200 text-blue-700 hover:bg-blue-50" onClick={onViewAllShifts}><CalendarDays className="w-4 h-4" /> All Shifts</Button>
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
                          <motion.div className="h-full rounded-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${cfProgress}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
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
                                  {allPaid && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">Paid ✓</Badge>}
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
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
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
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Recent station shifts */}
                <Card className="py-0 gap-0 border-blue-100 dark:border-blue-900">
                  <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Train className="w-3.5 h-3.5 text-blue-500" /> Recent Station Shifts
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
                                <Train className="w-3 h-3 shrink-0 text-blue-400" />
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}