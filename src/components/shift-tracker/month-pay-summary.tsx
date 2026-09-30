"use client";

import React, { useMemo } from "react";
import { Briefcase, MapPin, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCurrency } from "./animated-number";
import { isStationShift, effectiveAmount, parseStationTax } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface MonthPaySummaryProps {
  shifts: Shift[];
  year: number;
  month: number; // 0-based
}

function keyOf(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Month-to-date pay for Hall + Station (station shown net of tax).
 * Current month counts up to today; past months count the full month;
 * future months have nothing to date yet. Shifts covered by someone else
 * are excluded (they're tracked in the Owe tab, not your earnings).
 */
export function MonthPaySummary({ shifts, year, month }: MonthPaySummaryProps) {
  const now = new Date();
  const ty = now.getFullYear();
  const tm = now.getMonth();
  const td = now.getDate();
  const isCurrent = year === ty && month === tm;
  const isFuture = year > ty || (year === ty && month > tm);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = isFuture ? 0 : isCurrent ? td : daysInMonth;

  const s = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const cutoff = keyOf(year, month, lastDay);
    const r = {
      hall: 0, hallCount: 0, hallPaid: 0, fines: 0,
      stationNet: 0, stationGross: 0, stationTax: 0, stationCount: 0, stationPaid: 0,
      excluded: 0,
    };
    if (lastDay === 0) return r;
    for (const sh of shifts) {
      const k = sh.shiftDate.slice(0, 10);
      if (!k.startsWith(prefix) || k > cutoff) continue;
      if (sh.coveredBy) { r.excluded++; continue; }
      const paid = sh.status === "Paid";
      if (isStationShift(sh)) {
        const gross = parseFloat(sh.amountEarned) || 0;
        const tax = parseStationTax(sh.notes ?? "");
        const net = Math.max(0, gross - tax);
        r.stationNet += net; r.stationGross += gross; r.stationTax += tax; r.stationCount++;
        if (paid) r.stationPaid += net;
      } else {
        const amt = effectiveAmount(sh);
        r.hall += amt; r.hallCount++;
        if (paid) r.hallPaid += amt;
        r.fines += Math.max(0, (parseFloat(sh.amountEarned) || 0) - amt);
      }
    }
    return r;
  }, [shifts, year, month, lastDay]);

  const total = s.hall + s.stationNet;
  const received = s.hallPaid + s.stationPaid;
  const pending = Math.max(0, total - received);
  const count = s.hallCount + s.stationCount;
  const hallPct = total > 0 ? (s.hall / total) * 100 : 0;
  const stationPct = total > 0 ? (s.stationNet / total) * 100 : 0;
  const receivedPct = total > 0 ? (received / total) * 100 : 0;

  const label = isFuture ? "Upcoming month" : isCurrent ? "Month to date" : "Full month";
  const range = lastDay === 0
    ? `${MONTHS_SHORT[month]} ${year}`
    : lastDay === 1
    ? `${MONTHS_SHORT[month]} 1`
    : `${MONTHS_SHORT[month]} 1 – ${lastDay}`;

  return (
    <section
      aria-label={`${label} pay summary`}
      className="relative rounded-3xl overflow-hidden text-white card-hero"
      style={{ background: "linear-gradient(140deg, oklch(0.5 0.14 162), oklch(0.34 0.1 175))" }}
    >
      {/* Decorative glow */}
      <div aria-hidden="true" className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 blur-xl" />
      <div aria-hidden="true" className="absolute -left-12 -bottom-16 w-40 h-40 rounded-full bg-sky-300/10 blur-2xl" />

      <div className="relative p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/85">{label}</p>
              <p className="text-[11px] text-white/75">{range}</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15">
            {count} shift{count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Total */}
        <div>
          <AnimatedCurrency value={total} className="block text-4xl font-black tabular-nums tracking-tight leading-none" />
          <p className="text-xs text-white/80 mt-1.5">
            {count === 0
              ? isFuture ? "Nothing earned yet — month hasn't started" : "No shifts yet this month"
              : "Hall + Station take-home"}
          </p>
        </div>

        {/* Split bar */}
        {total > 0 && (
          <div>
            <div
              role="img"
              aria-label={`Hall ${formatCurrency(s.hall)}, Station ${formatCurrency(s.stationNet)}`}
              className="h-2.5 rounded-full bg-black/20 overflow-hidden flex"
            >
              <div className="h-full bg-emerald-300 transition-[width] duration-700 ease-out" style={{ width: `${hallPct}%` }} />
              <div className="h-full bg-sky-300 transition-[width] duration-700 ease-out" style={{ width: `${stationPct}%` }} />
            </div>
          </div>
        )}

        {/* Hall + Station tiles */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/12 backdrop-blur-sm border border-white/15 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/85">
              <span className="w-2 h-2 rounded-full bg-emerald-300" aria-hidden="true" />
              <Briefcase className="w-3 h-3" aria-hidden="true" />
              Hall
            </div>
            <p className="text-xl font-black tabular-nums mt-1.5 leading-none">{formatCurrency(s.hall)}</p>
            <p className="text-[11px] text-white/80 mt-1.5">
              {s.hallCount} shift{s.hallCount !== 1 ? "s" : ""}
              {s.fines > 0 && <> · <span className="font-semibold text-rose-200">−{formatCurrency(s.fines)} fines</span></>}
            </p>
          </div>

          <div className="rounded-2xl bg-white/12 backdrop-blur-sm border border-white/15 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/85">
              <span className="w-2 h-2 rounded-full bg-sky-300" aria-hidden="true" />
              <MapPin className="w-3 h-3" aria-hidden="true" />
              Station
            </div>
            <p className="text-xl font-black tabular-nums mt-1.5 leading-none">{formatCurrency(s.stationNet)}</p>
            <p className="text-[11px] text-white/80 mt-1.5">
              {s.stationCount} shift{s.stationCount !== 1 ? "s" : ""}
              {s.stationTax > 0 && <> · net of {formatCurrency(s.stationTax)} tax</>}
            </p>
          </div>
        </div>

        {/* Received vs pending */}
        {total > 0 && (
          <div className="rounded-2xl bg-black/15 p-3">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-white/90">Received <span className="tabular-nums font-black">{formatCurrency(received)}</span></span>
              <span className="text-white/80">Pending <span className="tabular-nums font-black text-amber-200">{formatCurrency(pending)}</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mt-2">
              <div className="h-full rounded-full bg-white transition-[width] duration-700 ease-out" style={{ width: `${receivedPct}%` }} />
            </div>
          </div>
        )}

        {s.excluded > 0 && (
          <p className="text-[11px] text-white/75">
            {s.excluded} covered shift{s.excluded !== 1 ? "s" : ""} not included — see the Owe tab.
          </p>
        )}
      </div>
    </section>
  );
}
