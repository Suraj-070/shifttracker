"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: { value: number; label: string; up: boolean } | null;
  accent: "emerald" | "rose" | "amber";
}

const accentClasses = {
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
};

export function SummaryCard({ title, value, icon: Icon, trend, accent }: SummaryCardProps) {
  return (
    <Card className="py-0 gap-0 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${accentClasses[accent]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            {trend.up ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-rose-600" />
            )}
            <span className={trend.up ? "text-emerald-600" : "text-rose-600"}>{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  accent: "default" | "emerald" | "rose";
}

const iconClass = {
  default: "bg-muted text-muted-foreground",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
};

export function StatCard({ title, value, icon: Icon, accent }: StatCardProps) {
  return (
    <Card className="py-0 gap-0 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconClass[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
