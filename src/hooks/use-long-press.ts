"use client";

import { useCallback, useRef } from "react";

/**
 * Returns props to spread onto any element to detect long press.
 * Works on both mobile (touch) and desktop (mouse).
 */
export function useLongPress(
  onLongPress: () => void,
  delay = 500,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggeredRef = useRef(false);

  const start = useCallback(() => {
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };
}