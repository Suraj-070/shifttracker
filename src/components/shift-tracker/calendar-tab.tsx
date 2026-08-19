"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface CalendarTabProps {
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
  onAddShift?: (date?: string) => void;
}

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function CalendarTab({ shifts, onShiftClick, onAddShift }: CalendarTabProps) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelectedDay(null); };

  // ALL shifts mapped by date
  const shiftMap = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const k = s.shiftDate.slice(0,10);
      map.set(k, [...(map.get(k)??[]), s]);
    }
    return map;
  }, [shifts]);

  const daysInMonth   = new Date(year, month+1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Month stats
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
    let total=0, hall=0, station=0, paid=0;
    for (const [k, dayShifts] of shiftMap) {
      if (!k.startsWith(prefix)) continue;
      for (const s of dayShifts) {
        total += parseFloat(s.amountEarned);
        if (isStationShift(s)) station++; else hall++;
        if (s.status==="Paid") paid++;
      }
    }
    return { total, hall, station, paid, days: hall+station };
  }, [shiftMap, year, month]);

  // Weekly stats for the month
  const weeklyStats = useMemo(() => {
    const weeks: { week: number; days: number; earned: number }[] = [];
    for (let d=1; d<=daysInMonth; d++) {
      const k = dateKey(year, month, d);
      const dayShifts = shiftMap.get(k)??[];
      if (dayShifts.length===0) continue;
      const date = new Date(year, month, d);
      const weekNum = Math.floor((d + firstDayOfWeek - 1) / 7);
      const existing = weeks.find(w => w.week===weekNum);
      const earned = dayShifts.reduce((s,sh)=>s+parseFloat(sh.amountEarned),0);
      if (existing) { existing.days++; existing.earned+=earned; }
      else weeks.push({ week: weekNum, days: 1, earned });
    }
    return weeks;
  }, [shiftMap, year, month, daysInMonth, firstDayOfWeek]);

  const selectedShifts = selectedDay ? (shiftMap.get(selectedDay)??[]) : [];

  return (
    <div className="space-y-4">

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold">{MONTHS[month]} {year}</h2>
          {monthStats.days > 0 && (
            <p className="text-[11px] text-muted-foreground">{monthStats.days} shifts · {formatCurrency(monthStats.total)}</p>
          )}
        </div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month summary strip */}
      {monthStats.days > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Shifts", value: String(monthStats.days), color: "text-foreground" },
            { label: "Earned", value: formatCurrency(monthStats.total), color: "text-primary" },
            { label: "Hall", value: String(monthStats.hall), color: "text-emerald-600" },
            { label: "Paid", value: String(monthStats.paid), color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="bg-muted/50 rounded-xl p-2.5 text-center">
              <p className={`text-sm font-black tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border/40">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({length: firstDayOfWeek}).map((_,i) => (
            <div key={`e${i}`} className="min-h-[52px] border-b border-r border-border/20" />
          ))}

          {Array.from({length: daysInMonth}).map((_,i) => {
            const day = i+1;
            const isLastRow = Math.floor((i+firstDayOfWeek)/7) === Math.floor((daysInMonth+firstDayOfWeek-1)/7);
            const k = dateKey(year, month, day);
            const dayShifts = shiftMap.get(k)??[];
            const hasShifts = dayShifts.length > 0;
            const allPaid = hasShifts && dayShifts.every(s=>s.status==="Paid");
            const hasCovered = dayShifts.some(s=>s.coveredBy);
            const hasSelf = dayShifts.some(s=>s.coveringFor?.toLowerCase()==="suraj"||s.coveringFor?.toLowerCase()==="myself");
            const isToday_ = isSameDay(new Date(year,month,day), today);
            const isSelected = selectedDay===k;
            const col = (i+firstDayOfWeek)%7;
            const isLastCol = col===6;

            return (
              <button key={day}
                onClick={() => setSelectedDay(isSelected ? null : k)}
                className={`relative min-h-[52px] flex flex-col items-center pt-1.5 transition-colors
                  ${isLastCol ? "" : "border-r border-border/20"}
                  ${isLastRow ? "" : "border-b border-border/20"}
                  ${isSelected ? "bg-primary/10" : hasShifts ? "active:bg-muted/60" : "active:bg-muted/30"}
                `}
              >
                {/* Day number */}
                <span className={`text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                  isToday_ ? "bg-primary text-primary-foreground"
                  : isSelected ? "bg-primary/20 text-primary"
                  : "text-foreground"
                }`}>
                  {day}
                </span>

                {/* Shift dots */}
                {hasShifts && (
                  <div className="flex flex-col gap-0.5 w-full px-1">
                    {dayShifts.slice(0,2).map((s,idx) => {
                      const isCovered = Boolean(s.coveredBy);
                      const isSelf = s.coveringFor?.toLowerCase()==="suraj"||s.coveringFor?.toLowerCase()==="myself";
                      const isStation = isStationShift(s);
                      const color = isCovered ? "bg-amber-400"
                        : isSelf ? "bg-purple-400"
                        : isStation ? "bg-blue-400"
                        : s.status==="Paid" ? "bg-emerald-400" : "bg-rose-400";
                      return <div key={idx} className={`h-1 rounded-full w-full ${color}`} />;
                    })}
                    {dayShifts.length>2 && (
                      <span className="text-[8px] text-muted-foreground text-center">+{dayShifts.length-2}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {[
          { color: "bg-emerald-400", label: "Hall unpaid" },
          { color: "bg-emerald-400 opacity-100", label: "Paid" },
          { color: "bg-purple-400", label: "You (Suraj)" },
          { color: "bg-amber-400", label: "Covered by" },
          { color: "bg-blue-400", label: "Station" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Weekly breakdown */}
      {weeklyStats.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Weekly Breakdown</p>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden divide-y divide-border/40">
            {weeklyStats.map((w,i) => (
              <div key={w.week} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">W{i+1}</span>
                  </div>
                  <span className="text-sm font-semibold">{w.days} shift{w.days!==1?"s":""}</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-primary">{formatCurrency(w.earned)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected day panel */}
      {selectedDay && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <p className="text-sm font-bold">
              {new Date(selectedDay+"T00:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}
            </p>
            {onAddShift && (
              <button onClick={()=>onAddShift(selectedDay)}
                className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg bg-primary/10 active:scale-95 transition-transform">
                + Add
              </button>
            )}
          </div>
          {selectedShifts.length===0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No shifts this day</p>
          ) : (
            <div className="divide-y divide-border/40">
              {selectedShifts.map(shift => {
                const isPaid = shift.status==="Paid";
                const isCovered = Boolean(shift.coveredBy);
                const isSelf = shift.coveringFor?.toLowerCase()==="suraj"||shift.coveringFor?.toLowerCase()==="myself";
                const isStation = isStationShift(shift);
                const stripeColor = isCovered ? "bg-amber-400" : isSelf ? "bg-purple-400" : isStation ? "bg-blue-400" : isPaid ? "bg-emerald-400" : "bg-rose-400";
                const name = isCovered ? `Your shift · by ${shift.coveredBy}` : isSelf ? "Suraj (You)" : shift.coveringFor;
                return (
                  <div key={shift.id} onClick={()=>onShiftClick(shift)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 cursor-pointer transition-colors">
                    <div className={`w-1 h-9 rounded-full shrink-0 ${stripeColor}`} />
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
