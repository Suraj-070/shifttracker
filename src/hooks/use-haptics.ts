"use client";

import { useSettingsStore } from "@/stores/settings-store";

const STRENGTH_MULTIPLIER = {
  light: 0.5,
  medium: 1,
  strong: 1.8,
};

export function useHaptics() {
  const enabled = useSettingsStore((s) => s.enableHaptics);
  const strength = useSettingsStore((s) => s.hapticsStrength);

  return (duration = 8) => {
    if (!enabled) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      const adjusted = Math.round(duration * STRENGTH_MULTIPLIER[strength]);
      navigator.vibrate(adjusted);
    }
  };
}
