"use client";

import { useCallback, useRef } from "react";
import { useSettingsStore } from "@/stores/settings-store";

export function useLongPress(onLongPress: () => void) {
  const delay = useSettingsStore((s) => s.longPressDelay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const start = useCallback(() => {
    timerRef.current = setTimeout(onLongPress, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  return { start, cancel };
}