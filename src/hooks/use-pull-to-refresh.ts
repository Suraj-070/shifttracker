"use client";

import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const startY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const progress = useRef(0);

  // Higher threshold = less sensitive. 120px feels intentional on mobile.
  const THRESHOLD = 120;
  // Min distance before we even start tracking — filters accidental micro-pulls
  const DEAD_ZONE = 12;

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only track if we're truly at the top
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = false;
        progress.current = 0;
      } else {
        startY.current = -1; // sentinel — ignore this touch sequence
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing.current || startY.current < 0) return;
      const dy = e.touches[0].clientY - startY.current;
      // Dead zone — ignore tiny movements
      if (dy < DEAD_ZONE) return;
      // Only downward pull
      if (dy > 0 && window.scrollY <= 0) {
        const p = Math.min((dy - DEAD_ZONE) / THRESHOLD, 1);
        progress.current = p;
        if (!pulling.current) { pulling.current = true; setIsPulling(true); }
        setPullProgress(p);
      }
    };

    const onTouchEnd = async () => {
      if (startY.current < 0) return;
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
      startY.current = -1;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return { isPulling, isRefreshing, pullProgress };
}