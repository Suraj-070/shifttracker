"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Briefcase, MapPin, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface CalendarTabProps {
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
  onAddShift?: (date: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function CalendarTab({ shifts, onShiftClick, onAddShift }: CalendarTabProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const shiftMap = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const key = shift.shiftDate.slice(0, 10);
      const existing = map.get(key) ?? [];
      existing.push(shift);
      map.set(key, existing);
    }
    return map;
  }, [shifts]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedKey = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,"0")}-${String(selectedDay.getDate()).padStart(2,"0")}`
    : null;
  const selectedShifts = selectedKey ? (shiftMap.get(selectedKey) ?? []) : [];

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
    let hall = 0, station = 0, total = 0;
    for (const [key, dayShifts] of shiftMap) {
      if (!key.startsWith(prefix)) continue;
      for (const s of dayShifts) {
        total += parseFloat(s.amountEarned);
        if (isStationShift(s)) station++; else hall++;
      }
    }
    return { hall, station, total, days: hall + station };
  }, [shiftMap, year, month]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold tracking-tight">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month stats strip */}
      {monthStats.days > 0 && (
        <div className="flex items-center justify-between bg-muted/40 rounded-2xl px-4 py-3">
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">{monthStats.days}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">shifts</p>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums text-primary">{formatCurrency(monthStats.total)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">earned</p>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">
              <span className="text-emerald-500">{monthStats.hall}</span>
              <span className="text-muted-foreground/40 mx-1">·</span>
              <span className="text-blue-500">{monthStats.station}</span>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hall · Stn</p>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const key = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const dayShifts = shiftMap.get(key) ?? [];
            const hasHall = dayShifts.some(s => !isStationShift(s));
            const hasStation = dayShifts.some(s => isStationShift(s));
            const hasAny = dayShifts.length > 0;
            const isToday = isSameDay(date, today);
            const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;

            return (
              <button key={day}
                onClick={() => setSelectedDay(isSelected ? null : date)}
                className={`relative flex flex-col items-center justify-start py-2 rounded-xl transition-colors min-h-[60px] ${
                  isSelected ? "bg-primary text-primary-foreground"
                  : isToday ? "bg-primary/10 text-primary"
                  : hasAny ? "bg-muted/60 hover:bg-muted"
                  : "hover:bg-muted/40"
                }`}
              >
                <span className="text-sm font-semibold leading-none">{day}</span>
                {hasAny && (
                  <div className="flex gap-0.5 mt-1 justify-center">
                    {hasHall && <Briefcase className="w-2.5 h-2.5 text-emerald-500" />}
                    {hasStation && <MapPin className="w-2.5 h-2.5 text-blue-500" />}
                  </div>
                )}
                {hasAny && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayShifts.slice(0,3).map((s, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full ${
                        s.status === "Paid" ? "bg-emerald-500" : "bg-rose-400"
                      } ${isSelected ? "opacity-70" : ""}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3 h-3 text-emerald-500" /> Hall
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-blue-500" /> Station
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Paid
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Unpaid
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              {onAddShift && (
                <button
                  onClick={() => {
                    const k = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,"0")}-${String(selectedDay.getDate()).padStart(2,"0")}`;
                    onAddShift(k);
                  }}
                  className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </button>
              )}
            </div>
            {selectedShifts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No shifts this day</p>
            )}
            {selectedShifts.map(shift => {
              const station = isStationShift(shift);
              const isPaid = shift.status === "Paid";
              return (
                <div key={shift.id} onClick={() => onShiftClick(shift)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer active:bg-muted transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${station ? "bg-blue-100 dark:bg-blue-950/40" : "bg-emerald-100 dark:bg-emerald-950/40"}`}>
                    {station
                      ? <MapPin className="w-4 h-4 text-blue-600" />
                      : <Briefcase className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {station ? shift.coveringFor : `${shift.coveringFor} · ${shift.locationName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(parseFloat(shift.amountEarned))}
                      {station ? ` · ${shift.hoursWorked}h` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    isPaid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {shift.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
