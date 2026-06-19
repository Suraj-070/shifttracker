"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  List,
  Table2,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShiftCard } from "./shift-card";
import { ShiftListView } from "./shift-list-view";
import { ShiftTableView } from "./shift-table-view";
import {
  FilterToolbar,
  type StatusFilter,
  type DateFilter,
  type SortOption,
} from "./filter-toolbar";
import { ShiftsSkeleton } from "./loading-skeleton";
import { useSettingsStore } from "@/stores/settings-store";
import { formatCurrency, isToday, isThisWeek, isThisMonth } from "@/lib/utils";
import type { Shift, MonthGroup } from "@/types/database.types";

function groupShiftsByMonth(shifts: Shift[]): MonthGroup[] {
  const map = new Map<string, Shift[]>();
  for (const shift of shifts) {
    const d = new Date(shift.shiftDate + "T00:00:00");
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = map.get(monthKey) ?? [];
    existing.push(shift);
    map.set(monthKey, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthShifts]) => {
      const [year, month] = monthKey.split("-");
      const monthLabel = new Date(
        parseInt(year),
        parseInt(month) - 1,
      ).toLocaleDateString("en-US", { year: "numeric", month: "long" });
      const totalEarned = monthShifts.reduce(
        (sum, s) => sum + parseFloat(s.amountEarned),
        0,
      );
      const paidCount = monthShifts.filter((s) => s.status === "Paid").length;
      const unpaidCount = monthShifts.filter(
        (s) => s.status === "Unpaid",
      ).length;
      monthShifts.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
      return {
        monthKey,
        monthLabel,
        shifts: monthShifts,
        totalEarned,
        paidCount,
        unpaidCount,
      };
    });
}

// short display name — "John S." if duplicate first names exist, else "John"
function shortName(name: string, allNames: string[]): string {
  const parts = name.split(" ");
  if (parts.length === 1) return name;
  const firstNames = allNames.map((n) => n.split(" ")[0]);
  const hasDuplicate = firstNames.filter((f) => f === parts[0]).length > 1;
  return hasDuplicate ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

interface PersonSummary {
  name: string;
  totalShifts: number;
  totalEarned: number;
  paidShifts: number;
  unpaidShifts: number;
  unpaidAmount: number;
}

interface ShiftsTabProps {
  shifts: Shift[];
  isLoading: boolean;
  onToggleStatus: (shift: Shift) => void;
  onDeleteShift: (shift: Shift) => void;
  onEditShift: (shift: Shift) => void;
  onAddShift: (defaultPerson?: string, defaultLocation?: string) => void;
}

export function ShiftsTab({
  shifts,
  isLoading,
  onToggleStatus,
  onDeleteShift,
  onEditShift,
  onAddShift,
}: ShiftsTabProps) {
  const { viewMode, setViewMode } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [selectedPerson, setSelectedPerson] = useState<string>("__all__");

  // Build person summaries from actual shifts
  const persons = useMemo<PersonSummary[]>(() => {
    const map = new Map<string, PersonSummary>();
    for (const s of shifts) {
      const existing = map.get(s.coveringFor) ?? {
        name: s.coveringFor,
        totalShifts: 0,
        totalEarned: 0,
        paidShifts: 0,
        unpaidShifts: 0,
        unpaidAmount: 0,
      };
      existing.totalShifts++;
      existing.totalEarned += parseFloat(s.amountEarned);
      if (s.status === "Paid") existing.paidShifts++;
      else {
        existing.unpaidShifts++;
        existing.unpaidAmount += parseFloat(s.amountEarned);
      }
      map.set(s.coveringFor, existing);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.totalShifts - a.totalShifts,
    );
  }, [shifts]);

  const allNames = useMemo(() => persons.map((p) => p.name), [persons]);
  const selectedPersonSummary = useMemo(
    () => persons.find((p) => p.name === selectedPerson),
    [persons, selectedPerson],
  );

  const filtered = useMemo(() => {
    let result = [...shifts];

    // Person filter
    if (selectedPerson !== "__all__") {
      result = result.filter((s) => s.coveringFor === selectedPerson);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.locationName.toLowerCase().includes(q) ||
          s.coveringFor.toLowerCase().includes(q) ||
          (s.notes ?? "").toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q),
      );
    }

    // Status
    if (statusFilter !== "all")
      result = result.filter((s) => s.status === statusFilter);

    // Date
    if (dateFilter !== "all") {
      result = result.filter((s) => {
        switch (dateFilter) {
          case "today":
            return isToday(s.shiftDate);
          case "week":
            return isThisWeek(s.shiftDate);
          case "month":
            return isThisMonth(s.shiftDate);
          default:
            return true;
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return b.shiftDate.localeCompare(a.shiftDate);
        case "oldest":
          return a.shiftDate.localeCompare(b.shiftDate);
        case "highest":
          return parseFloat(b.amountEarned) - parseFloat(a.amountEarned);
        case "lowest":
          return parseFloat(a.amountEarned) - parseFloat(b.amountEarned);
        default:
          return 0;
      }
    });

    return result;
  }, [
    shifts,
    selectedPerson,
    searchQuery,
    statusFilter,
    dateFilter,
    sortOption,
  ]);

  const monthGroups = useMemo(() => groupShiftsByMonth(filtered), [filtered]);

  if (isLoading) return <ShiftsSkeleton />;

  const viewButtons: {
    key: "card" | "list" | "table";
    icon: React.ElementType;
    label: string;
  }[] = [
    { key: "card", icon: LayoutGrid, label: "Cards" },
    { key: "list", icon: List, label: "List" },
    { key: "table", icon: Table2, label: "Table" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Shift Log</h2>
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
          {viewButtons.map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={v.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Person tabs — only show if there are shifts */}
      {persons.length > 0 && (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* All tab */}
            <button
              onClick={() => setSelectedPerson("__all__")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border whitespace-nowrap shrink-0 transition-all ${
                selectedPerson === "__all__"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              All
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selectedPerson === "__all__"
                    ? "bg-white/20 text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {shifts.length}
              </span>
            </button>

            {/* One tab per person */}
            {persons.map((person) => {
              const isActive = selectedPerson === person.name;
              return (
                <button
                  key={person.name}
                  onClick={() =>
                    setSelectedPerson(isActive ? "__all__" : person.name)
                  }
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {shortName(person.name, allNames)}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/25 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {person.totalShifts}
                  </span>
                  {/* Red dot = has unpaid shifts */}
                  {person.unpaidShifts > 0 && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Person summary card — slides in when a person is selected */}
      <AnimatePresence>
        {selectedPerson !== "__all__" && selectedPersonSummary && (
          <motion.div
            key="person-summary"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">
                    {selectedPersonSummary.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedPersonSummary.totalShifts} shifts
                    </Badge>
                    <button
                      onClick={() => {
                        const lastShift = shifts
                          .filter((s) => s.coveringFor === selectedPerson)
                          .sort((a, b) =>
                            b.shiftDate.localeCompare(a.shiftDate),
                          )[0];
                        onAddShift(selectedPerson, lastShift?.locationName);
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      + Add shift
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-xs">Total</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums">
                      {formatCurrency(selectedPersonSummary.totalEarned)}
                    </p>
                  </div>
                  <div className="border-x border-border/50">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-xs">Paid</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-primary">
                      {selectedPersonSummary.paidShifts}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">Owing</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                      {formatCurrency(selectedPersonSummary.unpaidAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        totalResults={filtered.length}
      />

      {/* Content */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {selectedPerson !== "__all__"
                ? `No shifts found for ${shortName(selectedPerson, allNames)}.`
                : "No shifts found matching your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === "card" && (
            <motion.div
              key="card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="space-y-8">
                {monthGroups.map((group) => (
                  <div key={group.monthKey}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {group.monthLabel}
                      </h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-primary font-medium">
                          {formatCurrency(group.totalEarned)}
                        </span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">
                          {group.paidCount} paid / {group.unpaidCount} unpaid
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {group.shifts.map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          shift={shift}
                          onToggleStatus={onToggleStatus}
                          onDelete={onDeleteShift}
                          onEdit={onEditShift}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {viewMode === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ShiftListView
                monthGroups={monthGroups}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteShift}
                onEdit={onEditShift}
              />
            </motion.div>
          )}
          {viewMode === "table" && (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ShiftTableView
                shifts={filtered}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteShift}
                onEdit={onEditShift}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
