"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh hook for mobile.
 * onRefresh must be stable (wrapped in useCallback at call site).
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const startY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const progress = useRef(0);
  const THRESHOLD = 72;

  // Keep onRefresh in a ref so the effect never needs to re-run due to it
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        const p = Math.min(dy / THRESHOLD, 1);
        progress.current = p;
        if (!pulling.current) { pulling.current = true; setIsPulling(true); }
        setPullProgress(p);
      }
    };

    const onTouchEnd = async () => {
      if (progress.current >= 1 && !refreshing.current) {
        refreshing.current = true;
        pulling.current = false;
        setIsRefreshing(true);
        setIsPulling(false);
        setPullProgress(0);
        try {
          await onRefreshRef.current();
        } finally {
          refreshing.current = false;
          setIsRefreshing(false);
        }
      } else {
        pulling.current = false;
        progress.current = 0;
        setIsPulling(false);
        setPullProgress(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []); // ← stable: no deps, uses refs

  return { isPulling, isRefreshing, pullProgress };
}