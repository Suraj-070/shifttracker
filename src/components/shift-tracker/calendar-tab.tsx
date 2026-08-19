"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface CalendarTabProps {
  shifts: Shift[];
  userName?: string;
  onShiftClick: (shift: Shift) => void;
  onAddShift?: (date?: string) => void;
}

const DAYS   = ["S","M","T","W","T","F","S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function CalendarTab({ shifts, onShiftClick, onAddShift, userName = "Suraj" }: CalendarTabProps) {
  const isSelfName = (n: string) => n.toLowerCase() === userName.toLowerCase() || n.toLowerCase() === "myself";
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelectedDay(null); };

  const shiftMap = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const k = s.shiftDate.slice(0,10);
      map.set(k, [...(map.get(k)??[]), s]);
    }
    return map;
  }, [shifts]);

  const daysInMonth    = new Date(year, month+1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
    let total=0, count=0, paid=0;
    for (const [k, dayShifts] of shiftMap) {
      if (!k.startsWith(prefix)) continue;
      for (const s of dayShifts) {
        total += parseFloat(s.amountEarned);
        count++;
        if (s.status==="Paid") paid++;
      }
    }
    return { total, count, paid };
  }, [shiftMap, year, month]);

  const selectedShifts = selectedDay ? (shiftMap.get(selectedDay)??[]) : [];

  return (
    <div className="space-y-4">

      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold">{MONTHS[month]} {year}</h2>
          {monthStats.count > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {monthStats.count} shifts · {formatCurrency(monthStats.total)} · {monthStats.paid} paid
            </p>
          )}
        </div>
        <button onClick={nextMonth}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d,i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length: firstDayOfWeek}).map((_,i) => <div key={`e${i}`} />)}

          {Array.from({length: daysInMonth}).map((_,i) => {
            const day    = i+1;
            const k      = dateKey(year, month, day);
            const dayShifts = shiftMap.get(k)??[];
            const hasShifts = dayShifts.length > 0;
            const allPaid   = hasShifts && dayShifts.every(s=>s.status==="Paid");
            const isToday_  = year===today.getFullYear() && month===today.getMonth() && day===today.getDate();
            const isSelected = selectedDay===k;

            // Dot colors
            const dots = dayShifts.slice(0,3).map(s => {
              if (s.coveredBy) return "bg-amber-400";
              const self = isSelfName(s.coveringFor ?? "");
              if (self) return "bg-purple-400";
              if (isStationShift(s)) return "bg-blue-400";
              return s.status==="Paid" ? "bg-emerald-400" : "bg-rose-400";
            });

            return (
              <button key={day}
                onClick={() => setSelectedDay(isSelected ? null : k)}
                className={`flex flex-col items-center justify-start pt-1.5 pb-2 rounded-xl transition-all min-h-[58px] active:scale-95 ${
                  isSelected  ? "bg-primary text-primary-foreground shadow-sm"
                  : isToday_  ? "bg-primary/12 ring-1 ring-primary/30"
                  : hasShifts ? "bg-muted/70"
                  : "bg-transparent"
                }`}
              >
                <span className={`text-[13px] font-bold leading-none mb-1.5 ${
                  isSelected ? "text-primary-foreground"
                  : isToday_ ? "text-primary"
                  : "text-foreground"
                }`}>
                  {day}
                </span>

                {/* Shift dots */}
                {hasShifts && (
                  <div className="flex gap-0.5 flex-wrap justify-center px-1">
                    {dots.map((color, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full ${color} ${isSelected?"opacity-70":""}`} />
                    ))}
                    {dayShifts.length > 3 && (
                      <span className={`text-[8px] font-bold leading-none mt-0.5 ${isSelected?"text-primary-foreground/70":"text-muted-foreground"}`}>
                        +{dayShifts.length-3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap px-1">
        {[
          { color: "bg-emerald-400", label: "Paid" },
          { color: "bg-rose-400",    label: "Unpaid" },
          { color: "bg-purple-400",  label: "You" },
          { color: "bg-amber-400",   label: "Covered" },
          { color: "bg-blue-400",    label: "Station" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day */}
      {selectedDay && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <p className="text-sm font-bold">
              {new Date(selectedDay+"T00:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}
            </p>
            {onAddShift && (
              <button onClick={() => onAddShift?.(selectedDay)}
                className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center active:scale-90 transition-transform">
                <Plus className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
          </div>

          {selectedShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No shifts this day</p>
          ) : (
            <div className="divide-y divide-border/40">
              {selectedShifts.map(shift => {
                const isPaid    = shift.status==="Paid";
                const isCovered = Boolean(shift.coveredBy);
                const isSelf    = isSelfName(shift.coveringFor ?? "");
                const isStation = isStationShift(shift);
                const stripe    = isCovered?"bg-amber-400":isSelf?"bg-purple-400":isStation?"bg-blue-400":isPaid?"bg-emerald-400":"bg-rose-400";
                const name      = isCovered?`Your shift · by ${shift.coveredBy}`:isSelf?`${userName} (You)`:shift.coveringFor;
                return (
                  <div key={shift.id} onClick={()=>onShiftClick(shift)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 cursor-pointer transition-colors">
                    <div className={`w-1 h-8 rounded-full shrink-0 ${stripe}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{name}</p>
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
