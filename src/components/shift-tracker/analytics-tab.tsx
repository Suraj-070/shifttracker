"use client";

import React from "react";
import { Calendar, CheckCircle2, XCircle, CircleDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart as RechartsPieChart } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CHART_CONFIG } from "@/lib/constants";
import { StatCard } from "./summary-card";
import { DashboardSkeleton } from "./loading-skeleton";
import type { AnalyticsSummary, MonthlyEarning } from "@/types/database.types";

interface AnalyticsTabProps {
  summary: AnalyticsSummary;
  monthlyEarnings: MonthlyEarning[];
  isLoading: boolean;
}

export function AnalyticsTab({ summary, monthlyEarnings, isLoading }: AnalyticsTabProps) {
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
                      <td className="py-3 text-right tabular-nums text-emerald-600">{formatCurrency(m.paid)}</td>
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
