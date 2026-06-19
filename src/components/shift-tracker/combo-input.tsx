"use client";

import React, { useId } from "react";
import { Input } from "@/components/ui/input";

interface ComboInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  icon?: React.ReactNode;
}

/**
 * A plain text input backed by a native <datalist> of suggestions.
 * Lets the person type any new value (a new person, a new location)
 * while still offering autocomplete from everything used before.
 * No portal/positioning logic needed — works the same on mobile and desktop.
 */
export function ComboInput({ value, onChange, suggestions, placeholder, icon }: ComboInputProps) {
  const listId = useId();

  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {icon}
        </span>
      )}
      <Input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={icon ? "pl-9" : undefined}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
