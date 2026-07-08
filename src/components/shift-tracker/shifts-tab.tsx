"use client";

import React, { useState, useMemo, useCallback } from "react";

import {
  LayoutGrid, List, Table2, Users, DollarSign,
  CheckCircle2, Clock, Train, CheckSquare, Square, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShiftCard } from "./shift-card";
import { ShiftListView } from "./shift-list-view";
import { ShiftTableView } from "./shift-table-view";
import { FilterToolbar, type StatusFilter, type DateFilter, type SortOption } from "./filter-toolbar";
import { ShiftsSkeleton } from "./loading-skeleton";
import { useSettingsStore } from "@/stores/settings-store";
import { formatCurrency, isToday, isThisWeek, isThisMonth } from "@/lib/utils";
import { isStationShift, parseStationTax } from "@/types/database.types";
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
      const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });
      const totalEarned = monthShifts.reduce((sum, s) => sum + parseFloat(s.amountEarned), 0);
      const paidCount = monthShifts.filter((s) => s.status === "Paid").length;
      const unpaidCount = monthShifts.filter((s) => s.status === "Unpaid").length;
      monthShifts.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
      return { monthKey, monthLabel, shifts: monthShifts, totalEarned, paidCount, unpaidCount };
    });
}

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
  onBulkPaid?: (ids: string[]) => Promise<void>;
  onLongPress?: (shift: Shift) => void;
}

type ShiftKind = "hall" | "station";

// ── Bulk action bar ────────────────────────────────────────────────────────

function BulkBar({
  selected,
  total,
  onSelectAll,
  onClear,
  onMarkPaid,
  isLoading,
  accent,
}: {
  selected: Set<string>;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  onMarkPaid: () => void;
  isLoading: boolean;
  accent: "emerald" | "blue";
}) {
  const count = selected.size;
  const ringColor = accent === "emerald" ? "ring-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : "ring-blue-200 bg-blue-50 dark:bg-blue-950/30";
  const btnColor = accent === "emerald"
    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ring-1 ${ringColor}`}>
      <span className="text-sm font-medium flex-1">
        {count} shift{count !== 1 ? "s" : ""} selected
      </span>
      <button
        onClick={onSelectAll}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Select all {total}
      </button>
      <Button size="sm" className={`h-7 text-xs gap-1 ${btnColor}`} onClick={onMarkPaid} disabled={isLoading}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        {isLoading ? "Saving…" : "Mark Paid"}
      </Button>
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Selectable shift card wrapper ──────────────────────────────────────────

function SelectableCard({
  shift,
  selected,
  selecting,
  onToggle,
  onToggleStatus,
  onDelete,
  onEdit,
  onLongPress,
  index = 0,
}: {
  shift: Shift;
  selected: boolean;
  selecting: boolean;
  onToggle: () => void;
  onToggleStatus: (s: Shift) => void;
  onDelete: (s: Shift) => void;
  onEdit: (s: Shift) => void;
  onLongPress?: (s: Shift) => void;
  index?: number;
}) {
  return (
    <div className="relative">
      {selecting && (
        <button
          onClick={onToggle}
          className="absolute top-2 left-1 z-10 w-8 h-8 flex items-center justify-center rounded-xl active:bg-muted"
        >
          {selected
            ? <CheckSquare className="w-5 h-5 text-emerald-600" />
            : <Square className="w-5 h-5 text-muted-foreground" />}
        </button>
      )}
      <div
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 120px" }}
        className={`transition-all ${selecting ? "pl-6" : ""} ${selected ? "ring-2 ring-emerald-400 rounded-xl" : ""}`}
        onClick={selecting ? onToggle : undefined}
        style={selecting ? { cursor: "pointer" } : undefined}
      >
        <ShiftCard
          shift={shift}
          index={0}
          onToggleStatus={selecting ? () => {} : onToggleStatus}
          onDelete={selecting ? () => {} : onDelete}
          onEdit={selecting ? () => {} : onEdit}
          onLongPress={selecting ? undefined : onLongPress}
          disableSwipe={selecting}
        />
      </div>
    </div>
  );
}

// ── Selectable list row wrapper ────────────────────────────────────────────

function SelectableListView({
  monthGroups,
  selected,
  selecting,
  onToggle,
  onToggleStatus,
  onDelete,
  onEdit,
}: {
  monthGroups: MonthGroup[];
  selected: Set<string>;
  selecting: boolean;
  onToggle: (id: string) => void;
  onToggleStatus: (s: Shift) => void;
  onDelete: (s: Shift) => void;
  onEdit: (s: Shift) => void;
}) {
  if (!selecting) {
    return <ShiftListView monthGroups={monthGroups} onToggleStatus={onToggleStatus} onDelete={onDelete} onEdit={onEdit} />;
  }

  return (
    <div className="space-y-8">
      {monthGroups.map((group) => (
        <div key={group.monthKey}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold tracking-tight">{group.monthLabel}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-600 font-medium">{formatCurrency(group.totalEarned)}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground text-xs">{group.paidCount}p / {group.unpaidCount}u</span>
            </div>
          </div>
          <div className="rounded-lg border bg-card divide-y">
            {group.shifts.map((shift) => (
              <div
                key={shift.id}
                onClick={() => onToggle(shift.id)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  selected.has(shift.id) ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/50"
                }`}
              >
                {selected.has(shift.id)
                  ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="text-sm font-medium">{shift.shiftDate}</span>
                <span className="text-xs text-muted-foreground">{shift.shiftDay}</span>
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {isStationShift(shift) ? shift.coveringFor : `${shift.coveringFor} · ${shift.locationName}`}
                </span>
                <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(parseFloat(shift.amountEarned))}</span>
                <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 shrink-0 ${
                  shift.status === "Paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {shift.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShiftsTab({
  shifts,
  isLoading,
  onToggleStatus,
  onDeleteShift,
  onEditShift,
  onAddShift,
  onBulkPaid,
  onLongPress,
}: ShiftsTabProps) {
  const { viewMode, setViewMode } = useSettingsStore();
  const [shiftKind, setShiftKind] = useState<ShiftKind>("hall");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [selectedPerson, setSelectedPerson] = useState<string>("__all__");

  // Bulk selection state
  const [hallSelecting, setHallSelecting] = useState(false);
  const [stationSelecting, setStationSelecting] = useState(false);
  const [hallSelected, setHallSelected] = useState<Set<string>>(new Set());
  const [stationSelected, setStationSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const hallShifts = useMemo(() => shifts.filter((s) => !isStationShift(s)), [shifts]);
  const stationShifts = useMemo(() => shifts.filter(isStationShift), [shifts]);

  const persons = useMemo<PersonSummary[]>(() => {
    const map = new Map<string, PersonSummary>();
    for (const s of hallShifts) {
      const existing = map.get(s.coveringFor) ?? { name: s.coveringFor, totalShifts: 0, totalEarned: 0, paidShifts: 0, unpaidShifts: 0, unpaidAmount: 0 };
      existing.totalShifts++;
      existing.totalEarned += parseFloat(s.amountEarned);
      if (s.status === "Paid") existing.paidShifts++;
      else { existing.unpaidShifts++; existing.unpaidAmount += parseFloat(s.amountEarned); }
      map.set(s.coveringFor, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalShifts - a.totalShifts);
  }, [hallShifts]);

  const allNames = useMemo(() => persons.map((p) => p.name), [persons]);
  const selectedPersonSummary = useMemo(() => persons.find((p) => p.name === selectedPerson), [persons, selectedPerson]);

  const applyFilters = useCallback((list: Shift[]) => {
    let result = [...list];
    if (selectedPerson !== "__all__" && shiftKind === "hall") {
      result = result.filter((s) => s.coveringFor === selectedPerson);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.locationName.toLowerCase().includes(q) ||
        s.coveringFor.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") result = result.filter((s) => s.status === statusFilter);
    if (dateFilter !== "all") {
      result = result.filter((s) => {
        switch (dateFilter) {
          case "today": return isToday(s.shiftDate);
          case "week": return isThisWeek(s.shiftDate);
          case "month": return isThisMonth(s.shiftDate);
          default: return true;
        }
      });
    }
    result.sort((a, b) => {
      switch (sortOption) {
        case "newest": return b.shiftDate.localeCompare(a.shiftDate);
        case "oldest": return a.shiftDate.localeCompare(b.shiftDate);
        case "highest": return parseFloat(b.amountEarned) - parseFloat(a.amountEarned);
        case "lowest": return parseFloat(a.amountEarned) - parseFloat(b.amountEarned);
        default: return 0;
      }
    });
    return result;
  }, [selectedPerson, shiftKind, searchQuery, statusFilter, dateFilter, sortOption]);

  const filteredHall = useMemo(() => applyFilters(hallShifts), [applyFilters, hallShifts]);
  const filteredStation = useMemo(() => applyFilters(stationShifts), [applyFilters, stationShifts]);
  const hallMonthGroups = useMemo(() => groupShiftsByMonth(filteredHall), [filteredHall]);
  const stationMonthGroups = useMemo(() => groupShiftsByMonth(filteredStation), [filteredStation]);
  const stationNet = Math.max(0, stationShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned) - parseStationTax(sh.notes), 0));
  const activeFiltered = shiftKind === "hall" ? filteredHall : filteredStation;

  const toggleHallSelect = (id: string) => setHallSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleStationSelect = (id: string) => setStationSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkPaid = useCallback(async (ids: string[]) => {
    if (!onBulkPaid || ids.length === 0) return;
    setBulkLoading(true);
    try {
      await onBulkPaid(ids);
      setHallSelected(new Set());
      setStationSelected(new Set());
      setHallSelecting(false);
      setStationSelecting(false);
    } finally {
      setBulkLoading(false);
    }
  }, [onBulkPaid]);

  if (isLoading) return <ShiftsSkeleton />;

  const viewButtons: { key: "card" | "list" | "table"; icon: React.ElementType; label: string }[] = [
    { key: "card", icon: LayoutGrid, label: "Cards" },
    { key: "list", icon: List, label: "List" },
    { key: "table", icon: Table2, label: "Table" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Hall / Station switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setShiftKind("hall")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              shiftKind === "hall"
                ? "bg-background text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Hall
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${shiftKind === "hall" ? "bg-emerald-100 text-emerald-700" : "bg-muted-foreground/20 text-muted-foreground"}`}>
              {hallShifts.length}
            </span>
          </button>
          <button
            onClick={() => setShiftKind("station")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              shiftKind === "station"
                ? "bg-background text-blue-700 shadow-sm ring-1 ring-blue-200"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Train className="w-3.5 h-3.5" />
            Station
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${shiftKind === "station" ? "bg-blue-100 text-blue-700" : "bg-muted-foreground/20 text-muted-foreground"}`}>
              {stationShifts.length}
            </span>
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
          {viewButtons.map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.key;
            return (
              <button key={v.key} onClick={() => setViewMode(v.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                title={v.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Station net strip */}
      {shiftKind === "station" && stationShifts.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-sm">
          <Train className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-blue-700 dark:text-blue-400 font-medium">Net take-home: {formatCurrency(stationNet)}</span>
          <span className="text-muted-foreground text-xs">({stationShifts.length} shift{stationShifts.length !== 1 ? "s" : ""})</span>
        </div>
      )}

      {/* Hall person tabs */}
      {shiftKind === "hall" && persons.length > 0 && (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <button onClick={() => setSelectedPerson("__all__")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border whitespace-nowrap shrink-0 transition-all ${
                selectedPerson === "__all__" ? "bg-foreground text-background border-foreground" : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              <Users className="w-3.5 h-3.5" />All
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedPerson === "__all__" ? "bg-white/20 text-background" : "bg-muted text-muted-foreground"}`}>{hallShifts.length}</span>
            </button>
            {persons.map((person) => {
              const isActive = selectedPerson === person.name;
              return (
                <button key={person.name} onClick={() => setSelectedPerson(isActive ? "__all__" : person.name)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border whitespace-nowrap shrink-0 transition-all ${
                    isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {shortName(person.name, allNames)}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{person.totalShifts}</span>
                  {person.unpaidShifts > 0 && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hall person summary */}
      {shiftKind === "hall" && selectedPerson !== "__all__" && selectedPersonSummary && (
          <div>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">{selectedPersonSummary.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{selectedPersonSummary.totalShifts} shifts</Badge>
                    <button onClick={() => { const last = hallShifts.filter((s) => s.coveringFor === selectedPerson).sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))[0]; onAddShift(selectedPerson, last?.locationName); }} className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">+ Add shift</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><DollarSign className="w-3 h-3" /><span className="text-xs">Total</span></div><p className="text-sm font-bold tabular-nums">{formatCurrency(selectedPersonSummary.totalEarned)}</p></div>
                  <div className="border-x border-border/50"><div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><CheckCircle2 className="w-3 h-3" /><span className="text-xs">Paid</span></div><p className="text-sm font-bold tabular-nums text-primary">{selectedPersonSummary.paidShifts}</p></div>
                  <div><div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Clock className="w-3 h-3" /><span className="text-xs">Owing</span></div><p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(selectedPersonSummary.unpaidAmount)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
      )}

      {/* Filter + bulk toggle row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
            totalResults={activeFiltered.length}
          />
        </div>
        {/* Bulk select toggle */}
        {shiftKind === "hall" && filteredHall.length > 0 && (
          <Button
            variant={hallSelecting ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs shrink-0"
            onClick={() => { setHallSelecting((v) => !v); setHallSelected(new Set()); }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {hallSelecting ? "Cancel" : "Select"}
          </Button>
        )}
        {shiftKind === "station" && filteredStation.length > 0 && (
          <Button
            variant={stationSelecting ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs shrink-0"
            onClick={() => { setStationSelecting((v) => !v); setStationSelected(new Set()); }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {stationSelecting ? "Cancel" : "Select"}
          </Button>
        )}
      </div>

      {/* Bulk bar — hall */}
      {shiftKind === "hall" && hallSelecting && hallSelected.size > 0 && (
          <BulkBar
            selected={hallSelected}
            total={filteredHall.length}
            onSelectAll={() => setHallSelected(new Set(filteredHall.map((s) => s.id)))}
            onClear={() => setHallSelected(new Set())}
            onMarkPaid={() => handleBulkPaid(Array.from(hallSelected))}
            isLoading={bulkLoading}
            accent="emerald"
          />
      )}
      {shiftKind === "station" && stationSelecting && stationSelected.size > 0 && (
          <BulkBar
            selected={stationSelected}
            total={filteredStation.length}
            onSelectAll={() => setStationSelected(new Set(filteredStation.map((s) => s.id)))}
            onClear={() => setStationSelected(new Set())}
            onMarkPaid={() => handleBulkPaid(Array.from(stationSelected))}
            isLoading={bulkLoading}
            accent="blue"
          />
      )}

      {/* Content */}
      {shiftKind === "hall" ? (
          <div>
            {filteredHall.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
                <p className="text-sm font-semibold text-foreground">No shifts found</p>
                <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                  {selectedPerson !== "__all__"
                    ? `No shifts for ${shortName(selectedPerson, allNames)}`
                    : "Try adjusting your filters"}
                </p>
              </div>
            ) : viewMode === "card" ? (
              <div className="space-y-8">
                {hallMonthGroups.map((group) => (
                  <div key={group.monthKey}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold tracking-tight">{group.monthLabel}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-primary font-medium">{formatCurrency(group.totalEarned)}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">{group.paidCount} paid / {group.unpaidCount} unpaid</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {group.shifts.map((shift, i) => (
                        <SelectableCard
                          key={shift.id}
                          shift={shift}
                          index={i}
                          selected={hallSelected.has(shift.id)}
                          selecting={hallSelecting}
                          onToggle={() => toggleHallSelect(shift.id)}
                          onToggleStatus={onToggleStatus}
                          onDelete={onDeleteShift}
                          onEdit={onEditShift}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === "list" ? (
              <SelectableListView
                monthGroups={hallMonthGroups}
                selected={hallSelected}
                selecting={hallSelecting}
                onToggle={toggleHallSelect}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteShift}
                onEdit={onEditShift}
              />
            ) : (
              <ShiftTableView
                shifts={filteredHall}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteShift}
                onEdit={onEditShift}
              />
            )}
          </div>
        ) : (
          <div>
            {filteredStation.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <span className="text-2xl">🚉</span>
                </div>
                <p className="text-sm font-semibold text-foreground">No station shifts found</p>
                <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : viewMode === "card" ? (
              <div className="space-y-8">
                {stationMonthGroups.map((group) => (
                  <div key={group.monthKey}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold tracking-tight">{group.monthLabel}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{formatCurrency(group.totalEarned)}</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="text-muted-foreground">{group.paidCount} paid / {group.unpaidCount} unpaid</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {group.shifts.map((shift, i) => (
                        <SelectableCard
                          key={shift.id}
                          shift={shift}
                          index={i}
                          selected={stationSelected.has(shift.id)}
                          selecting={stationSelecting}
                          onToggle={() => toggleStationSelect(shift.id)}
                          onToggleStatus={onToggleStatus}
                          onDelete={onDeleteShift}
                          onEdit={onEditShift}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <SelectableListView
                monthGroups={stationMonthGroups}
                selected={stationSelected}
                selecting={stationSelecting}
                onToggle={toggleStationSelect}
                onToggleStatus={onToggleStatus}
                onDelete={onDeleteShift}
                onEdit={onEditShift}
              />
            )}
          </div>
        )}
    </div>
  );
}
