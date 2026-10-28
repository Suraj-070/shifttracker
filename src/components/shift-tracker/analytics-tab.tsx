"use client";

import React, { useMemo, useState } from "react";
import { Calendar, CheckCircle2, XCircle, CircleDollarSign, Download, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart as RechartsPieChart } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_CONFIG } from "@/lib/constants";
import { StatCard } from "./summary-card";
import { DashboardSkeleton } from "./loading-skeleton";
import { effectiveAmount, parseHallFine, parseHallUserNote } from "@/types/database.types";
import type { Shift, AnalyticsSummary, MonthlyEarning } from "@/types/database.types";

interface AnalyticsTabProps {
  shifts: Shift[];
  isLoading: boolean;
}

function AnalyticsTab({ shifts, isLoading }: AnalyticsTabProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const reportShifts = useMemo(
    () => shifts.filter((shift) =>
      !shift.coveredBy &&
      (!fromDate || shift.shiftDate >= fromDate) &&
      (!toDate || shift.shiftDate <= toDate)
    ),
    [shifts, fromDate, toDate],
  );

  const summary = useMemo<AnalyticsSummary>(() => {
    const totalEarned = reportShifts.reduce((sum, shift) => sum + effectiveAmount(shift), 0);
    const paid = reportShifts.filter((shift) => shift.status === "Paid");
    const unpaid = reportShifts.filter((shift) => shift.status !== "Paid");
    return {
      totalEarned,
      totalPaid: paid.reduce((sum, shift) => sum + effectiveAmount(shift), 0),
      totalUnpaid: unpaid.reduce((sum, shift) => sum + effectiveAmount(shift), 0),
      totalShifts: reportShifts.length,
      paidShifts: paid.length,
      unpaidShifts: unpaid.length,
      averagePerShift: reportShifts.length ? totalEarned / reportShifts.length : 0,
    };
  }, [reportShifts]);

  const monthlyEarnings = useMemo<MonthlyEarning[]>(() => {
    const map = new Map<string, { earned: number; paid: number; unpaid: number; shiftCount: number }>();
    for (const shift of reportShifts) {
      const date = new Date(shift.shiftDate + "T00:00:00");
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(monthKey) ?? { earned: 0, paid: 0, unpaid: 0, shiftCount: 0 };
      const amount = effectiveAmount(shift);
      row.earned += amount;
      row.shiftCount += 1;
      if (shift.status === "Paid") row.paid += amount;
      else row.unpaid += amount;
      map.set(monthKey, row);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([monthKey, row]) => {
      const [year, month] = monthKey.split("-");
      const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-AU", { year: "numeric", month: "long" });
      return { monthKey, monthLabel, ...row };
    });
  }, [reportShifts]);

  const exportReport = () => {
    if (!reportShifts.length || (fromDate && toDate && fromDate > toDate)) return;
    const csvCell = (value: unknown) => {
      const raw = String(value ?? "");
      const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const headers = ["Date", "Day", "Location", "Covering For", "Gross Earned", "Fine", "Fine Deducted", "Net Earned", "Status", "Notes"];
    const rows = reportShifts.map((shift) => {
      const fine = parseHallFine(shift.notes);
      return [
        shift.shiftDate, shift.shiftDay, shift.locationName, shift.coveringFor,
        Number.parseFloat(shift.amountEarned) || 0, fine.amount || "",
        fine.amount > 0 ? (fine.included ? "Yes" : "No") : "",
        effectiveAmount(shift), shift.status, parseHallUserNote(shift.notes),
      ].map(csvCell).join(",");
    });
    const blob = new Blob(["\uFEFF", [headers.map(csvCell).join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shift-report-${fromDate || "all"}-to-${toDate || "all"}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (isLoading) return <DashboardSkeleton />;

  const chartData = [...monthlyEarnings].reverse().map((m) => ({
    month: m.monthLabel.split(" ")[0].substring(0, 3),
    paid: Math.round(m.paid),
    unpaid: Math.round(m.unpaid),
  }));

  const pieData = [
    { name: "Paid", value: Math.round(summary.totalPaid), fill: "oklch(0.7 0.17 155)" },
    { name: "Unpaid", value: Math.round(summary.totalUnpaid), fill: "oklch(0.65 0.2 25)" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom date-range report</CardTitle>
          <CardDescription>Filter your hall shifts and export the exact report as a spreadsheet-ready CSV.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm font-medium">
              From date
              <input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              To date
              <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setFromDate(""); setToDate(""); }} disabled={!fromDate && !toDate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-semibold disabled:opacity-40">
              <RotateCcw className="h-4 w-4" /> Clear dates
            </button>
            <button type="button" onClick={exportReport} disabled={!reportShifts.length || (!!fromDate && !!toDate && fromDate > toDate)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              <Download className="h-4 w-4" /> Export report CSV
            </button>
            <span className="text-sm text-muted-foreground">{reportShifts.length} shift{reportShifts.length === 1 ? "" : "s"} in report</span>
          </div>
          {fromDate && toDate && fromDate > toDate && <p role="alert" className="text-sm text-destructive">The start date must be on or before the end date.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Shifts" value={summary.totalShifts.toString()} icon={Calendar} accent="default" />
        <StatCard title="Paid Shifts" value={summary.paidShifts.toString()} icon={CheckCircle2} accent="emerald" />
        <StatCard title="Unpaid Shifts" value={summary.unpaidShifts.toString()} icon={XCircle} accent="rose" />
        <StatCard title="Total Earned" value={formatCurrency(summary.totalEarned)} icon={CircleDollarSign} accent="emerald" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Earnings</CardTitle>
            <CardDescription>Paid vs Unpaid breakdown by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={CHART_CONFIG as ChartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="paid" radius={[4, 4, 0, 0]} fill="var(--color-paid)" />
                <Bar dataKey="unpaid" radius={[4, 4, 0, 0]} fill="var(--color-unpaid)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paid vs Unpaid</CardTitle>
            <CardDescription>Collection status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={CHART_CONFIG as ChartConfig} className="h-[220px] w-full">
              <RechartsPieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2} stroke="var(--color-background)">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.7 0.17 155)" }} />
                Paid {formatCurrency(summary.totalPaid)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.65 0.2 25)" }} />
                Unpaid {formatCurrency(summary.totalUnpaid)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
          <CardDescription>Detailed earnings by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Shifts</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Earned</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Paid</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Unpaid</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyEarnings.map((m) => {
                  const rate = m.earned > 0 ? Math.round((m.paid / m.earned) * 100) : 0;
                  return (
                    <tr key={m.monthKey} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium">{m.monthLabel}</td>
                      <td className="py-3 text-right tabular-nums">{m.shiftCount}</td>
                      <td className="py-3 text-right tabular-nums font-semibold">{formatCurrency(m.earned)}</td>
                      <td className="py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(m.paid)}</td>
                      <td className="py-3 text-right tabular-nums text-rose-600">{formatCurrency(m.unpaid)}</td>
                      <td className="py-3 text-right">
                        <Badge variant="outline" className={
                          rate >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                            : rate >= 50 ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                        }>
                          {rate}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default React.memo(AnalyticsTab);
export { AnalyticsTab };
