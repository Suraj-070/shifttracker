"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";

// Maps each accent color to its oklch CSS values
const ACCENT_MAP: Record<string, { primary: string; primaryForeground: string; ring: string }> = {
  emerald: {
    primary: "oklch(0.5 0.17 155)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.5 0.17 155)",
  },
  rose: {
    primary: "oklch(0.55 0.22 15)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.55 0.22 15)",
  },
  amber: {
    primary: "oklch(0.65 0.18 75)",
    primaryForeground: "oklch(0.145 0 0)",
    ring: "oklch(0.65 0.18 75)",
  },
  violet: {
    primary: "oklch(0.55 0.22 280)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.55 0.22 280)",
  },
  sky: {
    primary: "oklch(0.55 0.18 220)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.55 0.18 220)",
  },
  orange: {
    primary: "oklch(0.65 0.2 50)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.65 0.2 50)",
  },
};

// Card density → padding class applied to the root
const DENSITY_MAP = {
  compact: "density-compact",
  comfortable: "density-comfortable",
  spacious: "density-spacious",
};

export function SettingsApplier() {
  const { accentColor, cardDensity, enableAnimations } = useSettingsStore();

  // Apply accent color as CSS variables on :root
  useEffect(() => {
    const colors = ACCENT_MAP[accentColor] ?? ACCENT_MAP.emerald;
    const root = document.documentElement;
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", colors.primaryForeground);
    root.style.setProperty("--ring", colors.ring);
  }, [accentColor]);

  // Apply card density class to body
  useEffect(() => {
    const body = document.body;
    Object.values(DENSITY_MAP).forEach((cls) => body.classList.remove(cls));
    body.classList.add(DENSITY_MAP[cardDensity]);
  }, [cardDensity]);

  // Toggle animations
  useEffect(() => {
    if (!enableAnimations) {
      document.documentElement.classList.add("no-animations");
    } else {
      document.documentElement.classList.remove("no-animations");
    }
  }, [enableAnimations]);

  return null;
}