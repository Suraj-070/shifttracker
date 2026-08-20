"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface CalendarTabProps {
  shifts: Shift[];
  userName?: string;
  onShiftClick: (shift: Shift) => void;
  onAddShift?: (date?: string) => void;
}

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type ShiftFilter = "all" | "mine" | "covered";

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function CalendarTab({ shifts, onShiftClick, onAddShift, userName = "Suraj" }: CalendarTabProps) {
  const isSelfName = (n: string) => n.toLowerCase() === userName.toLowerCase() || n.toLowerCase() === "myself";
  const today = new Date();
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filter,      setFilter]      = useState<ShiftFilter>("all");

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelectedDay(null); };

  // Apply filter
  const filteredShifts = useMemo(() => {
    if (filter === "mine")    return shifts.filter(s => !s.coveredBy);
    if (filter === "covered") return shifts.filter(s => Boolean(s.coveredBy));
    return shifts;
  }, [shifts, filter]);

  const shiftMap = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of filteredShifts) {
      const k = s.shiftDate.slice(0,10);
      map.set(k, [...(map.get(k)??[]), s]);
    }
    return map;
  }, [filteredShifts]);

  const daysInMonth    = new Date(year, month+1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
    let total=0, count=0, paid=0, owed=0;
    for (const [k, dayShifts] of shiftMap) {
      if (!k.startsWith(prefix)) continue;
      for (const s of dayShifts) {
        total += parseFloat(s.amountEarned);
        count++;
        if (s.status==="Paid") paid++;
        if (s.coveredBy) owed += parseFloat(s.amountEarned);
      }
    }
    return { total, count, paid, owed };
  }, [shiftMap, year, month]);

  const selectedShifts = selectedDay ? (shiftMap.get(selectedDay)??[]) : [];

  const getDotColor = (s: Shift) => {
    if (s.coveredBy) return "bg-amber-400";
    if (isSelfName(s.coveringFor ?? "")) return "bg-purple-500";
    if (isStationShift(s)) return "bg-blue-400";
    return s.status==="Paid" ? "bg-emerald-400" : "bg-rose-400";
  };

  return (
    <div className="space-y-4">

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-black">{MONTHS[month]} {year}</h2>
          {monthStats.count > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {monthStats.count} shifts · {formatCurrency(monthStats.total)}
              {monthStats.paid > 0 && ` · ${monthStats.paid} paid`}
            </p>
          )}
        </div>
        <button onClick={nextMonth}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 p-1 bg-muted/60 rounded-2xl">
        {([
          { key: "all",     label: "All shifts" },
          { key: "mine",    label: "My shifts" },
          { key: "covered", label: "Covered" },
        ] as { key: ShiftFilter; label: string }[]).map(f => (
          <button key={f.key} onClick={() => { setFilter(f.key); setSelectedDay(null); }}
            className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
              filter === f.key
                ? f.key === "covered"
                  ? "bg-amber-500 text-white shadow-sm"
                  : f.key === "mine"
                  ? "bg-purple-500 text-white shadow-sm"
                  : "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border/30">
          {DAYS.map((d,i) => (
            <div key={i} className="text-center text-[10px] font-bold text-muted-foreground py-2.5 uppercase tracking-wide">{d.slice(0,1)}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({length: firstDayOfWeek}).map((_,i) => (
            <div key={`e${i}`} className="min-h-[54px] border-b border-r border-border/20 last:border-r-0" />
          ))}

          {Array.from({length: daysInMonth}).map((_,i) => {
            const day       = i+1;
            const k         = dateKey(year, month, day);
            const dayShifts = shiftMap.get(k)??[];
            const hasShifts = dayShifts.length > 0;
            const isToday_  = year===today.getFullYear() && month===today.getMonth() && day===today.getDate();
            const isSelected = selectedDay===k;
            const col       = (i+firstDayOfWeek)%7;
            const isLastCol = col===6;
            const isLastRow = Math.floor((i+firstDayOfWeek)/7) === Math.floor((daysInMonth+firstDayOfWeek-1)/7);

            return (
              <button key={day}
                onClick={() => setSelectedDay(isSelected ? null : k)}
                className={`relative flex flex-col items-center min-h-[54px] pt-2 pb-1.5 transition-all active:scale-95
                  ${!isLastCol ? "border-r border-border/20" : ""}
                  ${!isLastRow ? "border-b border-border/20" : ""}
                  ${isSelected ? "bg-primary/10" : hasShifts ? "active:bg-muted/60" : "active:bg-muted/30"}
                `}
              >
                {/* Today ring */}
                <span className={`text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 transition-all ${
                  isSelected ? "bg-primary text-primary-foreground"
                  : isToday_  ? "bg-primary/15 text-primary ring-1.5 ring-primary/40"
                  : "text-foreground"
                }`}>
                  {day}
                </span>

                {/* Dots */}
                {hasShifts && (
                  <div className="flex gap-[3px] justify-center flex-wrap px-0.5">
                    {dayShifts.slice(0,3).map((s, idx) => (
                      <span key={idx} className={`w-[5px] h-[5px] rounded-full ${getDotColor(s)} ${isSelected ? "opacity-60" : ""}`} />
                    ))}
                    {dayShifts.length > 3 && (
                      <span className="text-[7px] font-black text-muted-foreground">+{dayShifts.length-3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-0.5">
        {[
          { color: "bg-emerald-400", label: "Paid" },
          { color: "bg-rose-400",    label: "Unpaid" },
          { color: "bg-purple-500",  label: "You" },
          { color: "bg-amber-400",   label: "Covered" },
          { color: "bg-blue-400",    label: "Station" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <span className="text-[11px] text-muted-foreground font-medium">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div>
              <p className="text-sm font-bold">
                {new Date(selectedDay+"T00:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}
              </p>
              <p className="text-[11px] text-muted-foreground">{selectedShifts.length} shift{selectedShifts.length!==1?"s":""}</p>
            </div>
            <div className="flex items-center gap-2">
              {onAddShift && (
                <button onClick={() => onAddShift?.(selectedDay)}
                  className="h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 active:scale-90 transition-transform">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
              <button onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {selectedShifts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No shifts this day</p>
              {onAddShift && (
                <button onClick={() => onAddShift?.(selectedDay)}
                  className="mt-3 text-xs text-primary font-semibold active:opacity-70">
                  + Add a shift
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {selectedShifts.map(shift => {
                const isPaid    = shift.status==="Paid";
                const isCovered = Boolean(shift.coveredBy);
                const isSelf    = isSelfName(shift.coveringFor ?? "");
                const isStation = isStationShift(shift);
                const stripe    = getDotColor(shift);
                const name      = isCovered ? `Your shift` : isSelf ? `${userName} (You)` : shift.coveringFor;
                return (
                  <div key={shift.id} onClick={()=>onShiftClick(shift)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 cursor-pointer transition-colors">
                    <div className={`w-1 h-9 rounded-full shrink-0 ${stripe}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{name}</p>
                        {isCovered && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">by {shift.coveredBy}</span>}
                        {isStation && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0">STN</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{shift.locationName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(parseFloat(shift.amountEarned))}</p>
                      <p className={`text-[10px] font-bold ${isPaid?"text-emerald-600":isCovered?"text-amber-500":"text-rose-500"}`}>
                        {isPaid?"✓ Paid":isCovered?"Owed":"Unpaid"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}

export default React.memo(CalendarTab);
export { CalendarTab };
