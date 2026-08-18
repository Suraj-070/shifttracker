"use client";

import { useEffect, useRef } from "react";

/**
 * Detects horizontal swipe gestures for tab switching.
 *
 * Ignores swipes that start on a shift card — those cards
 * handle their own horizontal swipe for pay/delete.
 */
export function useTabSwipe({
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const tracking = useRef(false);
  const blockedRef = useRef(false);

  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  useEffect(() => { onSwipeLeftRef.current = onSwipeLeft; }, [onSwipeLeft]);
  useEffect(() => { onSwipeRightRef.current = onSwipeRight; }, [onSwipeRight]);

  useEffect(() => {
    if (disabled) return;

    const MIN_DISTANCE = 50;   // px
    const MAX_VERTICAL = 60;   // px
    const MIN_VELOCITY = 0.3;  // px/ms

    // Check if touch started inside a shift card swipe zone
    const isOnShiftCard = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Element)) return false;
      return !!(
        target.closest("[data-shift-card]") ||
        target.closest(".touch-pan-y")      // SwipeWrapper cards use this class
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      // If finger lands on a swipeable card, block tab swipe entirely
      if (isOnShiftCard(e.target)) {
        blockedRef.current = true;
        tracking.current = false;
        return;
      }
      blockedRef.current = false;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startTime.current = Date.now();
      tracking.current = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current || blockedRef.current) return;
      tracking.current = false;

      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      const dt = Date.now() - startTime.current;
      const velocity = Math.abs(dx) / dt;

      const isHorizontal   = Math.abs(dx) > Math.abs(dy);
      const enoughDistance = Math.abs(dx) >= MIN_DISTANCE;
      const notTooVertical = Math.abs(dy) < MAX_VERTICAL;
      const fastEnough     = velocity >= MIN_VELOCITY;

      if (isHorizontal && enoughDistance && notTooVertical && fastEnough) {
        if (dx < 0) onSwipeLeftRef.current();
        else        onSwipeRightRef.current();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return;
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      if (dy > dx * 1.5 && dy > 20) tracking.current = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: true });
    document.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   onTouchEnd);
    };
  }, [disabled]);
}
