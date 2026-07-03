"use client";

import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";

const SENSITIVITY_THRESHOLD = {
  low: 160,
  medium: 110,
  high: 70,
};

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const sensitivity = useSettingsStore((s) => s.swipeSensitivity);
  const sensitivityRef = useRef(sensitivity);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);

  const startY = useRef(-1);
  const startX = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const progress = useRef(0);
  const DEAD_ZONE = 14;

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (window.scrollY < 2) {
        startY.current = touch.clientY;
        startX.current = touch.clientX;
        pulling.current = false;
        progress.current = 0;
      } else {
        startY.current = -1;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing.current || startY.current < 0) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startY.current;
      const dx = Math.abs(touch.clientX - startX.current);
      if (dx > dy * 1.5 && dx > 20) { startY.current = -1; return; }
      if (dy > DEAD_ZONE && window.scrollY < 2) {
        const threshold = SENSITIVITY_THRESHOLD[sensitivityRef.current];
        const p = Math.min((dy - DEAD_ZONE) / threshold, 1);
        progress.current = p;
        if (!pulling.current) { pulling.current = true; setIsPulling(true); }
        setPullProgress(p);
      }
    };

    const onTouchEnd = async () => {
      if (startY.current < 0) return;
      const didComplete = progress.current >= 1;
      pulling.current = false;
      startY.current = -1;
      if (didComplete && !refreshing.current) {
        refreshing.current = true;
        setIsRefreshing(true);
        setIsPulling(false);
        setPullProgress(0);
        progress.current = 0;
        try { await onRefreshRef.current(); }
        finally { refreshing.current = false; setIsRefreshing(false); }
      } else {
        progress.current = 0;
        setIsPulling(false);
        setPullProgress(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return { isPulling, isRefreshing, pullProgress };
}
