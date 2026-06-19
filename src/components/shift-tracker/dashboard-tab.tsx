"use client";

import React from "react";
import { motion } from "framer-motion";
import { DollarSign, CheckCircle2, XCircle, TrendingUp, Plus, CalendarDays, ChevronRight, User, MapPin, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { DashboardSkeleton } from "./loading-skeleton";
import type { Shift, AnalyticsSummary } from "@/types/database.types";

interface DashboardTabProps {
  summary: AnalyticsSummary;
  recentShifts: Shift[];
  isLoading: boolean;
  onToggleStatus: (shift: Shift) => void;
  onAddShift: () => void;
  onViewAllShifts: () => void;
}

export function DashboardTab({ summary, recentShifts, isLoading, onToggleStatus, onAddShift, onViewAllShifts }: DashboardTabProps) {
  if (isLoading) return <DashboardSkeleton />;

  const paidPercent = summary.totalShifts > 0 ? Math.round((summary.paidShifts / summary.totalShifts) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats grid — 2x2 on mobile, 4 across on desktop */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { title: "Total Earned", value: formatCurrency(summary.totalEarned), icon: DollarSign, color: "emerald" },
          { title: "Paid", value: formatCurrency(summary.totalPaid), icon: CheckCircle2, color: "emerald" },
          { title: "Unpaid", value: formatCurrency(summary.totalUnpaid), icon: XCircle, color: "rose" },
          { title: "Avg / Shift", value: formatCurrency(summary.averagePerShift), icon: TrendingUp, color: "amber" },
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
                    <div className={`p-1.5 rounded-lg ${colorMap[stat.color]}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-lg font-bold tabular-nums tracking-tight">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Collection progress */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Collection rate</p>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{paidPercent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${paidPercent}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">{summary.paidShifts} paid</span>
            <span className="text-xs text-muted-foreground">{summary.unpaidShifts} unpaid</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button className="h-12 gap-2 text-sm" onClick={onAddShift}>
          <Plus className="w-4 h-4" /> Add Shift
        </Button>
        <Button variant="outline" className="h-12 gap-2 text-sm" onClick={onViewAllShifts}>
          <CalendarDays className="w-4 h-4" /> All Shifts
        </Button>
      </div>

      {/* Recent shifts */}
      <Card className="py-0 gap-0">
        <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
          <CardTitle className="text-sm font-semibold">Recent Shifts</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground -mr-2" onClick={onViewAllShifts}>
            View all <ChevronRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No shifts recorded yet</p>
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
                        {shift.notes && shift.notes.trim() && (
                          <StickyNote className="w-3 h-3 shrink-0 text-amber-500 ml-0.5" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{shift.locationName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 h-5 cursor-pointer ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800"
                        }`}
                        onClick={() => onToggleStatus(shift)}
                      >
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
    </div>
  );
}