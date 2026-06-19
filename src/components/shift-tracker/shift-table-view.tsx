"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpDown, Trash2, ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { Shift } from "@/types/database.types";

type SortCol = "date" | "day" | "location" | "amount" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

interface ShiftTableViewProps {
  shifts: Shift[];
  onToggleStatus: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
}

export function ShiftTableView({ shifts, onToggleStatus, onDelete, onEdit }: ShiftTableViewProps) {
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const s = [...shifts].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "date": cmp = a.shiftDate.localeCompare(b.shiftDate); break;
        case "day": cmp = a.shiftDay.localeCompare(b.shiftDay); break;
        case "location": cmp = a.locationName.localeCompare(b.locationName); break;
        case "amount": cmp = parseFloat(a.amountEarned) - parseFloat(b.amountEarned); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return s;
  }, [shifts, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
    setPage(0);
  };

  const badgeClass = (isPaid: boolean) =>
    isPaid
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 cursor-pointer"
      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800 cursor-pointer";

  const cols: { key: SortCol; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "day", label: "Day" },
    { key: "location", label: "Location" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Covering For</th>
                {cols.map((c) => (
                  <th key={c.key} className="text-left py-3 px-4 font-medium text-muted-foreground">
                    <button onClick={() => handleSort(c.key)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      {c.label}
                      <ArrowUpDown className="w-3 h-3" />
                      {sortCol === c.key && <span className="text-xs text-emerald-600">{sortDir === "asc" ? "↑" : "↓"}</span>}
                    </button>
                  </th>
                ))}
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((shift, i) => {
                const isPaid = shift.status === "Paid";
                return (
                  <tr
                    key={shift.id}
                    className={`border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${i % 2 === 1 ? "bg-muted/20" : ""}`}
                    onClick={() => onEdit(shift)}
                  >
                    <td className="py-3 px-4 font-medium truncate max-w-[140px]">{shift.coveringFor}</td>
                    <td className="py-3 px-4 tabular-nums">{formatShortDate(shift.shiftDate)}</td>
                    <td className="py-3 px-4">{shift.shiftDay}</td>
                    <td className="py-3 px-4 truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{shift.locationName}</span>
                        {shift.notes && shift.notes.trim() && (
                          <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 tabular-nums font-semibold">{formatCurrency(parseFloat(shift.amountEarned))}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={badgeClass(isPaid)} onClick={(e) => { e.stopPropagation(); onToggleStatus(shift); }}>
                        {shift.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(shift); }}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-rose-600 transition-colors"
                        aria-label="Delete shift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs px-2">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
