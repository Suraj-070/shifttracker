"use client";

import React, { useCallback, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

export type StatusFilter = "all" | "Paid" | "Unpaid";
export type SortOption = "newest" | "oldest" | "highest" | "lowest";
export type DateFilter = "all" | "today" | "week" | "month";

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (s: SortOption) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  totalResults: number;
}

function Chip<T extends string>({ label, active, onClick, activeClass }: {
  label: string; active: boolean; onClick: () => void; activeClass?: string;
}) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
        active
          ? activeClass ?? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border text-muted-foreground"
      }`}>
      {label}
    </button>
  );
}

export function FilterToolbar({
  searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange,
  sortOption, onSortOptionChange,
  dateFilter, onDateFilterChange,
  totalResults,
}: FilterToolbarProps) {
  const hasFilters = statusFilter !== "all" || sortOption !== "newest" || dateFilter !== "all" || searchQuery;

  const clearAll = useCallback(() => {
    onSearchChange("");
    onStatusFilterChange("all");
    onSortOptionChange("newest");
    onDateFilterChange("all");
  }, [onSearchChange, onStatusFilterChange, onSortOptionChange, onDateFilterChange]);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value), [onSearchChange])}
          placeholder="Search shifts..."
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal filter chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {/* Status */}
        <Chip label="All" active={statusFilter === "all"} onClick={() => onStatusFilterChange("all")} />
        <Chip label="✓ Paid" active={statusFilter === "Paid"} onClick={() => onStatusFilterChange("Paid")}
          activeClass="bg-emerald-500 text-white border-emerald-500" />
        <Chip label="Unpaid" active={statusFilter === "Unpaid"} onClick={() => onStatusFilterChange("Unpaid")}
          activeClass="bg-rose-500 text-white border-rose-500" />

        {/* Divider */}
        <div className="w-px h-8 bg-border/60 shrink-0 self-center" />

        {/* Date */}
        <Chip label="Today" active={dateFilter === "today"} onClick={() => onDateFilterChange(dateFilter === "today" ? "all" : "today")} />
        <Chip label="This week" active={dateFilter === "week"} onClick={() => onDateFilterChange(dateFilter === "week" ? "all" : "week")} />
        <Chip label="This month" active={dateFilter === "month"} onClick={() => onDateFilterChange(dateFilter === "month" ? "all" : "month")} />

        {/* Divider */}
        <div className="w-px h-8 bg-border/60 shrink-0 self-center" />

        {/* Sort */}
        <Chip label="Newest" active={sortOption === "newest"} onClick={() => onSortOptionChange("newest")} />
        <Chip label="Highest $" active={sortOption === "highest"} onClick={() => onSortOptionChange("highest")} />
        <Chip label="Lowest $" active={sortOption === "lowest"} onClick={() => onSortOptionChange("lowest")} />
        <Chip label="Oldest" active={sortOption === "oldest"} onClick={() => onSortOptionChange("oldest")} />

        {/* Clear */}
        {hasFilters && (
          <button onClick={clearAll}
            className="shrink-0 px-3 h-8 rounded-full text-xs font-semibold border border-rose-200 text-rose-500 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 flex items-center gap-1 active:scale-95 transition-all">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="text-xs text-muted-foreground px-0.5">
          {totalResults} shift{totalResults !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
