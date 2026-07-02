"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface WeekData {
  label: string;   // "Mon 23"
  earned: number;
  paid: number;
}

interface EarningsChartProps {
  shifts: import("@/types/database.types").Shift[];
  weeks?: number; // how many weeks to show, default 6
}

export function EarningsChart({ shifts, weeks = 6 }: EarningsChartProps) {
  const data = useMemo<WeekData[]>(() => {
    const result: WeekData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = weeks - 1; i >= 0; i--) {
      // Week start = Monday
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1 - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekShifts = shifts.filter(s => {
        const d = new Date(s.shiftDate + "T00:00:00");
        return d >= weekStart && d <= weekEnd;
      });

      const earned = weekShifts.reduce((sum, s) => sum + parseFloat(s.amountEarned), 0);
      const paid = weekShifts
        .filter(s => s.status === "Paid")
        .reduce((sum, s) => sum + parseFloat(s.amountEarned), 0);

      const label = weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
      result.push({ label, earned, paid });
    }
    return result;
  }, [shifts, weeks]);

  const maxEarned = Math.max(...data.map(d => d.earned), 1);

  if (data.every(d => d.earned === 0)) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
        No shifts in the last {weeks} weeks
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bars */}
      <div className="flex items-end gap-1.5 h-28">
        {data.map((week, i) => {
          const heightPct = maxEarned > 0 ? (week.earned / maxEarned) * 100 : 0;
          const paidPct = week.earned > 0 ? (week.paid / week.earned) * 100 : 0;
          const isCurrentWeek = i === data.length - 1;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              {/* Amount tooltip on hover */}
              {week.earned > 0 && (
                <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap">
                  {formatCurrency(week.earned)}
                </span>
              )}

              {/* Bar */}
              <div className="w-full relative flex items-end" style={{ height: "88px" }}>
                {week.earned > 0 ? (
                  <div className="w-full rounded-t-lg overflow-hidden relative" style={{ height: `${heightPct}%` }}>
                    {/* Unpaid portion */}
                    <div className="absolute inset-0 bg-muted-foreground/20 dark:bg-muted-foreground/30 rounded-t-lg" />
                    {/* Paid portion */}
                    <motion.div
                      className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${
                        isCurrentWeek ? "bg-primary" : "bg-primary/60"
                      }`}
                      initial={{ height: 0 }}
                      animate={{ height: `${paidPct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-1 rounded-full bg-muted/50" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex gap-1.5">
        {data.map((week, i) => (
          <div key={i} className="flex-1 text-center">
            <p className={`text-[9px] ${i === data.length - 1 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {week.label}
            </p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/60" />
          Paid
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/20" />
          Unpaid
        </div>
        <span className="ml-auto text-[10px]">Last {weeks} weeks</span>
      </div>
    </div>
  );
}
