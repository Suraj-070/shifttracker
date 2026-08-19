"use client";

import React, { useState, useMemo, useCallback } from "react";
import { CalendarTab } from "./calendar-tab";

import {
  LayoutGrid, List, Users, DollarSign,
  CheckCircle2, Clock, MapPin, CheckSquare, Square, X, ChevronDown, CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShiftCard } from "./shift-card";
import { ShiftListView } from "./shift-list-view";
import { ShiftTableView } from "./shift-table-view";
import { FilterToolbar, type StatusFilter, type DateFilter, type SortOption } from "./filter-toolbar";
import { ShiftsSkeleton } from "./loading-skeleton";
import { useSettingsStore } from "@/stores/settings-store";
import { useIsMobile } from "@/hooks/use-mobile";
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
  onShiftClick?: (shift: Shift) => void;
}

type ShiftKind = "hall" | "station";

// ── Bulk action bar ────────────────────────────────────────────────────────

function BulkBar({
  visible, selected, total, onSelectAll, onClear, onMarkPaid, isLoading, accent,
}: {
  visible: boolean; selected: Set<string>; total: number;
  onSelectAll: () => void; onClear: () => void; onMarkPaid: () => void;
  isLoading: boolean; accent: "emerald" | "blue";
}) {
  const count = selected.size;
  const isEmerald = accent === "emerald";
  return (
    <div className="overflow-hidden" style={{
      maxHeight: visible ? "80px" : "0px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-8px)",
      transition: "max-height 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ring-1 ${isEmerald ? "ring-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : "ring-blue-200 bg-blue-50 dark:bg-blue-950/30"}`}>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isEmerald ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>{count}</span>
        <span className="text-sm font-medium flex-1 text-foreground">shift{count !== 1 ? "s" : ""} selected</span>
        <button onClick={onSelectAll} className="text-xs text-muted-foreground underline shrink-0">All {total}</button>
        <button onClick={onMarkPaid} disabled={isLoading || count === 0}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60 shrink-0 ${isEmerald ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" : "bg-blue-500 shadow-sm shadow-blue-500/30"}`}>
          {isLoading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {isLoading ? "Saving…" : "Mark Paid"}
        </button>
        <button onClick={onClear} className="w-7 h-7 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground active:scale-90 transition-transform shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Selectable shift card wrapper ──────────────────────────────────────────

function SelectableCard({
  shift, selected, selecting, onToggle, onToggleStatus, onDelete, onEdit, onLongPress, onTap,
}: {
  shift: Shift; selected: boolean; selecting: boolean;
  onToggle: () => void; onToggleStatus: (s: Shift) => void;
  onDelete: (s: Shift) => void; onEdit: (s: Shift) => void;
  onLongPress?: (s: Shift) => void; onTap?: (s: Shift) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Native-style checkbox — slides in from left */}
      <div
        style={{
          width: selecting ? 28 : 0,
          opacity: selecting ? 1 : 0,
          overflow: "hidden",
          transition: "width 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onToggle}
          className="w-7 h-7 flex items-center justify-center active:scale-90 transition-transform"
        >
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            selected
              ? "bg-emerald-500 border-emerald-500"
              : "border-border bg-background"
          }`}>
            {selected && (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Card */}
      <div
        className="flex-1 min-w-0"
        onClick={selecting ? onToggle : undefined}
        style={{
          cursor: selecting ? "pointer" : undefined,
          transform: selected ? "scale(0.984)" : "scale(1)",
          transition: "transform 0.15s ease",
          borderRadius: 16,
          outline: selected ? "2px solid oklch(0.6 0.17 162 / 70%)" : "2px solid transparent",
          outlineOffset: "1px",
        }}
      >
        <ShiftCard
          shift={shift}
          index={0}
          onToggleStatus={selecting ? () => {} : onToggleStatus}
          onDelete={selecting ? () => {} : onDelete}
          onEdit={selecting ? () => {} : onEdit}
          onLongPress={selecting ? undefined : onLongPress}
          onTap={selecting ? undefined : onTap}
          disableSwipe={selecting}
        />
      </div>
    </div>
  );
}


// ── Month header ──────────────────────────────────────────────────────────────
function MonthHeader({ group }: { group: MonthGroup }) {
  return (
    <div className="flex items-center justify-between px-1 mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{group.monthLabel}</span>
        <span className="text-[10px] text-muted-foreground/60">{group.shifts.length}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold tabular-nums text-primary">{formatCurrency(group.totalEarned)}</span>
        {group.unpaidCount > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">{group.unpaidCount} unpaid</span>
        )}
      </div>
    </div>
  );
}

function ShiftsTab({
  shifts, isLoading, onToggleStatus, onDeleteShift, onEditShift, onAddShift, onBulkPaid, onLongPress, onShiftClick,
}: ShiftsTabProps) {
  const { viewMode, setViewMode } = useSettingsStore();
  const isMobile = useIsMobile();
  const [shiftKind, setShiftKind] = useState<ShiftKind>("hall");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [selectedPerson, setSelectedPerson] = useState<string>("__all__");
  const [hallSelecting, setHallSelecting] = useState(false);
  const [stationSelecting, setStationSelecting] = useState(false);
  const [hallSelected, setHallSelected] = useState<Set<string>>(new Set());
  const [stationSelected, setStationSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const [calendarView, setCalendarView] = useState(false);
  // On mobile, only card and list views make sense
  const effectiveViewMode = isMobile && viewMode === "table" ? "card" : viewMode;

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
    if (selectedPerson !== "__all__" && shiftKind === "hall") result = result.filter((s) => s.coveringFor === selectedPerson);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.locationName.toLowerCase().includes(q) || s.coveringFor.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") result = result.filter((s) => s.status === statusFilter);
    if (dateFilter !== "all") result = result.filter((s) => {
      switch (dateFilter) {
        case "today": return isToday(s.shiftDate);
        case "week": return isThisWeek(s.shiftDate);
        case "month": return isThisMonth(s.shiftDate);
        default: return true;
      }
    });
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
      setHallSelected(new Set()); setStationSelected(new Set());
      setHallSelecting(false); setStationSelecting(false);
    } finally { setBulkLoading(false); }
  }, [onBulkPaid]);

  if (isLoading) return <ShiftsSkeleton />;

  const isSelecting = shiftKind === "hall" ? hallSelecting : stationSelecting;

  return (
    <div className="space-y-0">

      {/* ── Sticky segmented control ── */}
      <div className="sticky z-30" style={{ top: 0 }}>
        <div
          className="absolute inset-0 -mx-4"
          style={{
            background: "color-mix(in oklch, var(--background) 88%, transparent)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        />
        <div className="relative flex items-center justify-between py-2.5 gap-2">
          {/* Centered pill */}
          <div className="flex justify-center flex-1">
            <div className="flex gap-0.5 p-1 bg-muted/90 rounded-2xl shadow-sm">
              {[
                { key: "hall",    label: "Hall",    badge: hallShifts.length },
                { key: "station", label: "Station", badge: stationShifts.length },
              ].map(tab => (
                <button key={tab.key}
                  onClick={() => { setShiftKind(tab.key as "hall"|"station"); setCalendarView(false); }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                    shiftKind === tab.key && !calendarView
                      ? tab.key === "hall"
                        ? "bg-white dark:bg-card text-emerald-700 shadow-sm"
                        : "bg-white dark:bg-card text-blue-700 shadow-sm"
                      : "text-muted-foreground"
                  }`}>
                  {tab.key === "hall"
                    ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    : <MapPin className="w-3 h-3 shrink-0" />
                  }
                  {tab.label}
                  <span className={`text-[10px] font-bold tabular-nums ${
                    shiftKind === tab.key && !calendarView
                      ? tab.key === "hall" ? "text-emerald-600" : "text-blue-600"
                      : "text-muted-foreground/50"
                  }`}>{tab.badge}</span>
                </button>
              ))}
              <button
                onClick={() => setCalendarView(v => !v)}
                className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                  calendarView ? "bg-white dark:bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}>
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: view + select */}
          {!calendarView && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex gap-0.5 p-0.5 bg-muted/80 rounded-xl">
                <button onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-lg transition-all active:scale-90 ${effectiveViewMode === "card" ? "bg-white dark:bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all active:scale-90 ${effectiveViewMode === "list" ? "bg-white dark:bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
              {activeFiltered.length > 0 && (
                <button
                  onClick={() => {
                    if (shiftKind === "hall") { setHallSelecting(v => !v); setHallSelected(new Set()); }
                    else { setStationSelecting(v => !v); setStationSelected(new Set()); }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-90 ${
                    isSelecting ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}>
                  {isSelecting ? "Done" : "Select"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-1">
      {/* ── Below hidden in calendar view ── */}
      {!calendarView && <>

      {/* ── Station net strip ── */}
      {shiftKind === "station" && stationShifts.length > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">Net: {formatCurrency(stationNet)}</span>
          <span className="text-xs text-muted-foreground">· {stationShifts.length} shifts</span>
        </div>
      )}

      {/* ── Person filter tabs (hall only) — with fade edge ── */}
      {shiftKind === "hall" && persons.length > 1 && (
        <div className="relative -mx-4">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setSelectedPerson("__all__")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border whitespace-nowrap shrink-0 transition-all active:scale-95 ${selectedPerson === "__all__" ? "bg-foreground text-background border-foreground" : "bg-background border-border text-muted-foreground"}`}>
              <Users className="w-3.5 h-3.5" /> All
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedPerson === "__all__" ? "bg-white/20 text-background" : "bg-muted text-muted-foreground"}`}>{hallShifts.length}</span>
            </button>
            {persons.map((person) => {
              const isActive = selectedPerson === person.name;
              return (
                <button key={person.name} onClick={() => setSelectedPerson(isActive ? "__all__" : person.name)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border whitespace-nowrap shrink-0 transition-all active:scale-95 ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                  {shortName(person.name, allNames)}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{person.totalShifts}</span>
                  {person.unpaidShifts > 0 && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>
          {/* Fade edge hint */}
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-background to-transparent" />
        </div>
      )}

      {/* ── Person summary card ── */}
      {shiftKind === "hall" && selectedPerson !== "__all__" && selectedPersonSummary && (
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">{selectedPersonSummary.name}</p>
            <button
              onClick={() => { const last = hallShifts.filter((s) => s.coveringFor === selectedPerson).sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))[0]; onAddShift(selectedPerson, last?.locationName); }}
              className="text-xs text-primary font-semibold px-3 py-1.5 rounded-lg bg-primary/10 active:scale-95 transition-transform">
              + Add shift
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: DollarSign, label: "Total", value: formatCurrency(selectedPersonSummary.totalEarned), color: "" },
              { icon: CheckCircle2, label: "Paid", value: String(selectedPersonSummary.paidShifts), color: "text-emerald-600" },
              { icon: Clock, label: "Owing", value: formatCurrency(selectedPersonSummary.unpaidAmount), color: "text-rose-600 dark:text-rose-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-background/60 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter toolbar ── */}
      <FilterToolbar
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter} onDateFilterChange={setDateFilter}
        sortOption={sortOption} onSortOptionChange={setSortOption}
        totalResults={activeFiltered.length}
      />

      {/* ── Bulk bar ── */}
      <BulkBar
        visible={shiftKind === "hall" && hallSelecting && hallSelected.size > 0}
        selected={hallSelected} total={filteredHall.length}
        onSelectAll={() => setHallSelected(new Set(filteredHall.map((s) => s.id)))}
        onClear={() => setHallSelected(new Set())}
        onMarkPaid={() => handleBulkPaid(Array.from(hallSelected))}
        isLoading={bulkLoading} accent="emerald"
      />
      <BulkBar
        visible={shiftKind === "station" && stationSelecting && stationSelected.size > 0}
        selected={stationSelected} total={filteredStation.length}
        onSelectAll={() => setStationSelected(new Set(filteredStation.map((s) => s.id)))}
        onClear={() => setStationSelected(new Set())}
        onMarkPaid={() => handleBulkPaid(Array.from(stationSelected))}
        isLoading={bulkLoading} accent="blue"
      />



      </> }

      {/* ── Calendar view — shows ALL shifts across hall+station ── */}
      {calendarView && (
        <div className="mt-2">
          <CalendarTab
            shifts={shifts}
            onShiftClick={onShiftClick ?? onEditShift}
            onAddShift={onAddShift ? () => onAddShift() : undefined}
          />
        </div>
      )}

      {/* ── Content ── */}
      {!calendarView && shiftKind === "hall" ? (
        <div>
          {filteredHall.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center"><span className="text-2xl">🔍</span></div>
              <p className="text-sm font-semibold">No shifts found</p>
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                {selectedPerson !== "__all__" ? `No shifts for ${shortName(selectedPerson, allNames)}` : "Try adjusting your filters"}
              </p>
            </div>
          ) : effectiveViewMode === "card" ? (
            <div className="space-y-6">
              {hallMonthGroups.map((group) => (
                <div key={group.monthKey}>
                  <MonthHeader group={group} />
                  <div className="space-y-1.5">
                    {group.shifts.map((shift) => (
                      <SelectableCard
                        key={shift.id} shift={shift}
                        selected={hallSelected.has(shift.id)} selecting={hallSelecting}
                        onToggle={() => toggleHallSelect(shift.id)}
                        onToggleStatus={onToggleStatus} onDelete={onDeleteShift}
                        onEdit={onEditShift} onLongPress={onLongPress}
                        onTap={onEditShift}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : effectiveViewMode === "list" ? (
            <ShiftListView monthGroups={hallMonthGroups} onToggleStatus={onToggleStatus} onDelete={onDeleteShift} onEdit={onEditShift} />
          ) : (
            <ShiftTableView shifts={filteredHall} onToggleStatus={onToggleStatus} onDelete={onDeleteShift} onEdit={onEditShift} />
          )}
        </div>
      ) : (
        <div>
          {filteredStation.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center"><span className="text-2xl">📍</span></div>
              <p className="text-sm font-semibold">No station shifts found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : effectiveViewMode === "card" ? (
            <div className="space-y-6">
              {stationMonthGroups.map((group) => (
                <div key={group.monthKey}>
                  <MonthHeader group={group} />
                  <div className="space-y-1.5">
                    {group.shifts.map((shift) => (
                      <SelectableCard
                        key={shift.id} shift={shift}
                        selected={stationSelected.has(shift.id)} selecting={stationSelecting}
                        onToggle={() => toggleStationSelect(shift.id)}
                        onToggleStatus={onToggleStatus} onDelete={onDeleteShift}
                        onEdit={onEditShift} onLongPress={onLongPress}
                        onTap={onEditShift}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ShiftListView monthGroups={stationMonthGroups} onToggleStatus={onToggleStatus} onDelete={onDeleteShift} onEdit={onEditShift} />
          )}
        </div>
      )}
    <div className="h-20" />{/* FAB clearance */}
    </div>
  );
}

export default React.memo(ShiftsTab);
export { ShiftsTab };
