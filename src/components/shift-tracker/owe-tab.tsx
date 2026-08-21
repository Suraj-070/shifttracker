"use client";

import React, { useState, useMemo, useCallback } from "react";
import { UserX, Calendar, SlidersHorizontal, X, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { Shift } from "@/types/database.types";

interface OweTabProps {
  shifts: Shift[];
  isLoading?: boolean;
  onToggleStatus: (shift: Shift) => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shift: Shift) => void;
  onBulkPaid?: (ids: string[]) => Promise<void>;
  userName?: string;
}

type OweFilter = "all" | "unpaid" | "paid";

function OweTab({ shifts, isLoading, onToggleStatus, onEditShift, onDeleteShift, onBulkPaid, userName = "Suraj" }: OweTabProps) {
  const isSelfName = (n: string) => n.toLowerCase() === userName.toLowerCase() || n.toLowerCase() === "myself";
  const [personFilter, setPersonFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState<OweFilter>("all");
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [selecting, setSelecting]       = useState(false);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading]   = useState(false);

  // Only covered-by shifts
  const oweShifts = useMemo(() => shifts.filter(s => s.coveredBy), [shifts]);

  // Unique people
  const people = useMemo(() => {
    const names = new Set(oweShifts.map(s => s.coveredBy!));
    return Array.from(names).sort();
  }, [oweShifts]);

  const filtered = useMemo(() => {
    let result = [...oweShifts];
    if (personFilter !== "__all__") result = result.filter(s => s.coveredBy === personFilter);
    if (statusFilter === "unpaid")  result = result.filter(s => s.status === "Unpaid");
    if (statusFilter === "paid")    result = result.filter(s => s.status === "Paid");
    return result.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
  }, [oweShifts, personFilter, statusFilter]);

  // Group by month
  const monthGroups = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of filtered) {
      const d = new Date(s.shiftDate + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, monthShifts]) => {
        const [yr, mo] = key.split("-");
        const label = new Date(+yr, +mo - 1).toLocaleDateString("en-AU", { year: "numeric", month: "long" });
        const total   = monthShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned), 0);
        const unpaid  = monthShifts.filter(s => s.status === "Unpaid").length;
        return { key, label, shifts: monthShifts, total, unpaid };
      });
  }, [filtered]);

  // Per-person summary
  const personSummary = useMemo(() => {
    const map = new Map<string, { total: number; unpaid: number; count: number }>();
    for (const s of oweShifts) {
      const name = s.coveredBy!;
      const ex = map.get(name) ?? { total: 0, unpaid: 0, count: 0 };
      ex.total += parseFloat(s.amountEarned);
      if (s.status === "Unpaid") ex.unpaid += parseFloat(s.amountEarned);
      ex.count++;
      map.set(name, ex);
    }
    return Array.from(map.entries()).map(([name, d]) => ({ name, ...d }));
  }, [oweShifts]);

  const totalOwe    = useMemo(() => oweShifts.filter(s => s.status === "Unpaid").reduce((s, sh) => s + parseFloat(sh.amountEarned), 0), [oweShifts]);
  const totalPaid   = useMemo(() => oweShifts.filter(s => s.status === "Paid").reduce((s, sh) => s + parseFloat(sh.amountEarned), 0), [oweShifts]);
  const hasFilters  = personFilter !== "__all__" || statusFilter !== "all";


  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-32 rounded-2xl bg-amber-50 dark:bg-amber-950/20" />
        <div className="h-10 rounded-2xl bg-muted" />
        {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted/60" />)}
      </div>
    );
  }

  if (oweShifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-8">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shadow-sm">
          <span className="text-4xl">🤝</span>
        </div>
        <div>
          <p className="text-xl font-black mb-2">All clear!</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When someone covers your shift, toggle "Covered by" when adding — it'll appear here so you never forget to pay them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Hero summary ── */}
      <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.72 0.14 75), oklch(0.58 0.12 65))" }}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3">Total to Pay Out</p>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-5xl font-black tabular-nums text-white tracking-tight">{formatCurrency(totalOwe)}</p>
            <p className="text-white/60 text-[12px] mt-1.5">still owed</p>
          </div>
          {totalPaid > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">already paid</p>
            </div>
          )}
        </div>

        {/* Per-person breakdown */}
        <div className="space-y-2">
          {personSummary.map(p => (
            <button key={p.name}
              onClick={() => setPersonFilter(personFilter === p.name ? "__all__" : p.name)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-95 ${
                personFilter === p.name
                  ? "bg-amber-200/60 dark:bg-amber-800/40 border-amber-300 dark:border-amber-700"
                  : "bg-white/60 dark:bg-white/5 border-amber-100 dark:border-amber-900"
              }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-black text-white">
                  {p.name[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <p className="text-[11px] text-white/60">{p.count} shift{p.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="text-right">
                {p.unpaid > 0 && <p className="text-sm font-black tabular-nums text-white">{formatCurrency(p.unpaid)}</p>}
                {p.unpaid === 0 && <p className="text-xs font-bold text-emerald-300">All paid ✓</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Select + Bulk bar ── */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1">
          {(["all", "unpaid", "paid"] as OweFilter[]).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`flex-1 h-8 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                statusFilter === f
                  ? f === "unpaid" ? "bg-amber-500 text-white border-amber-500"
                    : f === "paid" ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-foreground text-background border-foreground"
                  : "bg-background border-border text-muted-foreground"
              }`}>
              {f === "all" ? "All" : f === "unpaid" ? "Owed" : "Paid"}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <button onClick={() => { setSelecting(v => !v); setSelected(new Set()); }}
            className={`px-3 h-8 rounded-xl text-[11px] font-bold transition-all active:scale-90 shrink-0 ${selecting ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
            {selecting ? "Done" : "Select"}
          </button>
        )}
      </div>

      {/* Bulk paid bar */}
      <div style={{ maxHeight: selecting && selected.size > 0 ? "60px" : "0px", overflow: "hidden", transition: "max-height 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-500 text-white">{selected.size}</span>
          <span className="text-sm font-medium flex-1">shift{selected.size !== 1 ? "s" : ""} selected</span>
          <button onClick={async () => {
            if (!onBulkPaid) return;
            setBulkLoading(true);
            try { await onBulkPaid(Array.from(selected)); setSelected(new Set()); setSelecting(false); }
            finally { setBulkLoading(false); }
          }} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 active:scale-95 disabled:opacity-60">
            {bulkLoading ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "✓"}
            {bulkLoading ? "Saving…" : "Mark Paid"}
          </button>
          <button onClick={() => setSelected(new Set())} className="w-7 h-7 rounded-xl bg-muted/60 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>



      {/* ── Month groups ── */}
      {monthGroups.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">No shifts match filters</div>
      ) : (
        <div className="space-y-5">
          {monthGroups.map(group => (
            <div key={group.key}>
              {/* Month header */}
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground/60">{group.shifts.length} day{group.shifts.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(group.total)}</span>
                  {group.unpaid > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      {group.unpaid} unpaid
                    </span>
                  )}
                </div>
              </div>

              {/* Shift rows */}
              <div className="rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-card overflow-hidden divide-y divide-amber-50 dark:divide-amber-900/30">
                {group.shifts.map(shift => {
                  const isPaid = shift.status === "Paid";
                  return (
                    <div key={shift.id} onClick={() => onEditShift(shift)}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-amber-100/70 dark:active:bg-amber-950/30 transition-all duration-75 cursor-pointer select-none">
                      {/* Stripe */}
                      <div className={`w-1 h-9 rounded-full shrink-0 ${isPaid ? "bg-emerald-500" : "bg-amber-400"}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold">{formatShortDate(shift.shiftDate)}</span>
                          <span className="text-[11px] text-muted-foreground">{shift.shiftDay}</span>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">by {shift.coveredBy}</p>
                      </div>

                      {/* Amount + status */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-black tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</span>
                        <button onClick={e => { e.stopPropagation(); onToggleStatus(shift); }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full active:scale-90 transition-transform ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                          }`}>
                          {isPaid ? "✓ Paid" : "Owed"}
                        </button>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-20" />


    </div>
  );
}

export default React.memo(OweTab);
export { OweTab };
