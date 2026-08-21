"use client";

import React, { useCallback, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

export type StatusFilter = "all" | "Paid" | "Unpaid";
export type SortOption   = "newest" | "oldest" | "highest" | "lowest";
export type DateFilter   = "all" | "today" | "week" | "month";

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

function Chip({ label, active, onClick, activeClass }: {
  label: string; active: boolean; onClick: () => void; activeClass?: string;
}) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 h-7 rounded-full text-[11px] font-semibold border transition-all active:scale-95 ${
        active
          ? activeClass ?? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border/70 text-muted-foreground"
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = statusFilter !== "all" || sortOption !== "newest" || dateFilter !== "all" || searchQuery;

  const clearAll = useCallback(() => {
    onSearchChange("");
    onStatusFilterChange("all");
    onSortOptionChange("newest");
    onDateFilterChange("all");
  }, [onSearchChange, onStatusFilterChange, onSortOptionChange, onDateFilterChange]);

  return (
    <div className="space-y-2">
      {/* Search + filter toggle row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value), [onSearchChange])}
            placeholder="Search shifts…"
            className="w-full h-11 pl-9 pr-9 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-90">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter icon button */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-all active:scale-90 shrink-0 ${
            filtersOpen || hasFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border/70 text-muted-foreground"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Results count + clear */}
        {hasFilters && (
          <button onClick={clearAll}
            className="h-11 px-3 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-500 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold flex items-center gap-1 active:scale-90 transition-transform shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Expandable filter chips */}
      <div style={{
        maxHeight: filtersOpen ? "200px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div className="space-y-2.5 pt-1 pb-0.5">
          {/* Status */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">Status</p>
            <div className="flex gap-1.5">
              <Chip label="All" active={statusFilter === "all"} onClick={() => onStatusFilterChange("all")} />
              <Chip label="✓ Paid" active={statusFilter === "Paid"} onClick={() => onStatusFilterChange("Paid")} activeClass="bg-emerald-500 text-white border-emerald-500" />
              <Chip label="Unpaid" active={statusFilter === "Unpaid"} onClick={() => onStatusFilterChange("Unpaid")} activeClass="bg-rose-500 text-white border-rose-500" />
            </div>
          </div>

          {/* Date */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">Date</p>
            <div className="flex gap-1.5 flex-wrap">
              <Chip label="Today" active={dateFilter === "today"} onClick={() => onDateFilterChange(dateFilter === "today" ? "all" : "today")} />
              <Chip label="This week" active={dateFilter === "week"} onClick={() => onDateFilterChange(dateFilter === "week" ? "all" : "week")} />
              <Chip label="This month" active={dateFilter === "month"} onClick={() => onDateFilterChange(dateFilter === "month" ? "all" : "month")} />
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">Sort</p>
            <div className="flex gap-1.5 flex-wrap">
              <Chip label="Newest" active={sortOption === "newest"} onClick={() => onSortOptionChange("newest")} />
              <Chip label="Oldest" active={sortOption === "oldest"} onClick={() => onSortOptionChange("oldest")} />
              <Chip label="Highest $" active={sortOption === "highest"} onClick={() => onSortOptionChange("highest")} />
              <Chip label="Lowest $" active={sortOption === "lowest"} onClick={() => onSortOptionChange("lowest")} />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="text-[11px] text-muted-foreground px-0.5">
          {totalResults} result{totalResults !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
