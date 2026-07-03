"use client";

import React, { useCallback, useRef, useState } from "react";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type StatusFilter = "all" | "Paid" | "Unpaid";
export type DateFilter = "all" | "today" | "week" | "month";
export type SortOption = "newest" | "oldest" | "highest" | "lowest";

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  totalResults: number;
}

function FilterChip<T extends string>({
  value,
  active,
  onClick,
  label,
  activeClass,
}: {
  value: T;
  active: boolean;
  onClick: (v: T) => void;
  label: string;
  activeClass?: string;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
        active
          ? activeClass ?? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background text-muted-foreground border-border hover:border-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  sortOption,
  onSortOptionChange,
  totalResults,
}: FilterToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = statusFilter !== "all" || dateFilter !== "all" || sortOption !== "newest";
  const clearAll = () => {
    onStatusFilterChange("all");
    onDateFilterChange("all");
    onSortOptionChange("newest");
    onSearchChange("");
  };

  return (
    <div className="space-y-2">
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value), [onSearchChange])}
            placeholder="Search shifts..."
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
            showFilters || hasActiveFilters
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background border-border text-muted-foreground"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hasActiveFilters && !showFilters && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>
      </div>

      {/* Filter chips — expandable */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden space-y-2"
          >
            {/* Status */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">Status</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                <FilterChip value="all" active={statusFilter === "all"} onClick={onStatusFilterChange} label="All" />
                <FilterChip value="Paid" active={statusFilter === "Paid"} onClick={onStatusFilterChange} label="✓ Paid"
                  activeClass="bg-emerald-500 text-white border-emerald-500 shadow-sm" />
                <FilterChip value="Unpaid" active={statusFilter === "Unpaid"} onClick={onStatusFilterChange} label="Unpaid"
                  activeClass="bg-rose-500 text-white border-rose-500 shadow-sm" />
              </div>
            </div>

            {/* Date */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">Period</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {(["all", "today", "week", "month"] as DateFilter[]).map(v => (
                  <FilterChip key={v} value={v} active={dateFilter === v} onClick={onDateFilterChange}
                    label={v === "all" ? "Any time" : v.charAt(0).toUpperCase() + v.slice(1)} />
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">Sort by</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {([
                  { key: "newest", label: "Newest" },
                  { key: "oldest", label: "Oldest" },
                  { key: "highest", label: "Highest $" },
                  { key: "lowest", label: "Lowest $" },
                ] as { key: SortOption; label: string }[]).map(o => (
                  <FilterChip key={o.key} value={o.key} active={sortOption === o.key} onClick={onSortOptionChange} label={o.label} />
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearAll}
                className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      {(searchQuery || hasActiveFilters) && (
        <p className="text-xs text-muted-foreground px-0.5">
          {totalResults} shift{totalResults !== 1 ? "s" : ""} found
        </p>
      )}
    </div>
  );
}
