"use client";

import React, { useCallback, useRef, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  return (
    <div className="space-y-3">
      {/* Search + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search shifts..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-9 pr-9 h-9"
          />
          {searchQuery && (
            <button
              onClick={() => { onSearchChange(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="gap-1.5 h-9"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filters</span>
        </Button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
          {/* Status */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {(["all", "Paid", "Unpaid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => onStatusFilterChange(f)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === f
                    ? f === "Paid"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : f === "Unpaid"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {/* Date */}
          <Select value={dateFilter} onValueChange={(v) => onDateFilterChange(v as DateFilter)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortOption} onValueChange={(v) => onSortOptionChange(v as SortOption)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Amount</SelectItem>
              <SelectItem value="lowest">Lowest Amount</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto text-xs">
            {totalResults} result{totalResults !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}
    </div>
  );
}
