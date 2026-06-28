"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { isStationShift } from "@/types/database.types";
import type { Shift } from "@/types/database.types";

interface CalendarTabProps {
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
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

export function CalendarTab({ shifts, onShiftClick }: CalendarTabProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("left");

  // Build shift map: "YYYY-MM-DD" → Shift[]
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

  // Days in this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  // Prev/next month
  const prevMonth = () => {
    setDirection("right");
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setDirection("left");
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Shifts for selected day
  const selectedKey = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,"0")}-${String(selectedDay.getDate()).padStart(2,"0")}`
    : null;
  const selectedShifts = selectedKey ? (shiftMap.get(selectedKey) ?? []) : [];

  // Stats for this month
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
    let hall = 0, station = 0, total = 0;
    for (const [key, dayShifts] of shiftMap) {
      if (!key.startsWith(prefix)) continue;
      for (const s of dayShifts) {
        total += parseFloat(s.amountEarned);
        if (isStationShift(s)) station++;
        else hall++;
      }
    }
    return { hall, station, total, days: hall + station };
  }, [shiftMap, year, month]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <motion.h2
          key={`${year}-${month}`}
          initial={{ opacity: 0, y: direction === "left" ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="text-lg font-semibold tracking-tight"
        >
          {MONTHS[month]} {year}
        </motion.h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month stats strip */}
      {monthStats.days > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Shifts</p>
            <p className="text-base font-bold">{monthStats.days}</p>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Earned</p>
            <p className="text-base font-bold">{formatCurrency(monthStats.total)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">🎬/🚉</p>
            <p className="text-base font-bold">{monthStats.hall}/{monthStats.station}</p>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: direction === "left" ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction === "left" ? -30 : 30 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty cells for first day offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

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
                <motion.button
                  key={day}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className={`relative flex flex-col items-center justify-start py-1.5 rounded-xl transition-colors min-h-[52px] ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "bg-primary/10 text-primary"
                      : hasAny
                      ? "bg-muted/60 hover:bg-muted"
                      : "hover:bg-muted/40"
                  }`}
                >
                  {/* Date number */}
                  <span className={`text-sm font-semibold leading-none ${
                    hasAny && !isSelected && !isToday
                      ? "text-foreground"
                      : ""
                  }`}>
                    {day}
                  </span>

                  {/* Shift icons */}
                  {hasAny && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {hasHall && (
                        <span className="text-[10px] leading-none">🎬</span>
                      )}
                      {hasStation && (
                        <span className="text-[10px] leading-none">🚉</span>
                      )}
                    </div>
                  )}

                  {/* Dot indicator for paid/unpaid */}
                  {hasAny && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {dayShifts.map((s, idx) => (
                        <span
                          key={idx}
                          className={`w-1 h-1 rounded-full ${
                            s.status === "Paid"
                              ? "bg-emerald-500"
                              : "bg-rose-400"
                          } ${isSelected ? "opacity-70" : ""}`}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <span>🎬</span> Hall shift
        </div>
        <div className="flex items-center gap-1.5">
          <span>🚉</span> Station shift
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
      <AnimatePresence>
        {selectedDay && selectedShifts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">
                  {selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {selectedShifts.map((shift) => {
                  const station = isStationShift(shift);
                  const isPaid = shift.status === "Paid";
                  return (
                    <div
                      key={shift.id}
                      onClick={() => onShiftClick(shift)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer active:bg-muted transition-colors"
                    >
                      <span className="text-lg">{station ? "🚉" : "🎬"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {station ? shift.coveringFor : `${shift.coveringFor} · ${shift.locationName}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {station
                            ? `${shift.hoursWorked}h · ${formatCurrency(parseFloat(shift.amountEarned))} gross`
                            : formatCurrency(parseFloat(shift.amountEarned))}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {shift.status}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}