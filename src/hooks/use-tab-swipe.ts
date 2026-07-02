"use client";

import { useEffect, useRef } from "react";

/**
 * Detects horizontal swipe gestures on the given element ref
 * and calls onSwipeLeft / onSwipeRight.
 *
 * Tuned to feel like native iOS/Android tab switching:
 * - 40px minimum horizontal movement to register
 * - Must be more horizontal than vertical (ratio check)
 * - Velocity check so slow drags don't accidentally switch
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

  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  useEffect(() => { onSwipeLeftRef.current = onSwipeLeft; }, [onSwipeLeft]);
  useEffect(() => { onSwipeRightRef.current = onSwipeRight; }, [onSwipeRight]);

  useEffect(() => {
    if (disabled) return;

    const MIN_DISTANCE = 50;   // px — minimum horizontal travel
    const MAX_VERTICAL = 60;   // px — if vertical > this, it's a scroll not a swipe
    const MIN_VELOCITY = 0.3;  // px/ms — must move fast enough

    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startTime.current = Date.now();
      tracking.current = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;

      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      const dt = Date.now() - startTime.current;
      const velocity = Math.abs(dx) / dt;

      const isHorizontal = Math.abs(dx) > Math.abs(dy);
      const enoughDistance = Math.abs(dx) >= MIN_DISTANCE;
      const notTooVertical = Math.abs(dy) < MAX_VERTICAL;
      const fastEnough = velocity >= MIN_VELOCITY;

      if (isHorizontal && enoughDistance && notTooVertical && fastEnough) {
        if (dx < 0) {
          onSwipeLeftRef.current();   // swipe left → next tab
        } else {
          onSwipeRightRef.current();  // swipe right → prev tab
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return;
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      // If clearly scrolling vertically, cancel swipe tracking
      if (dy > dx * 1.5 && dy > 20) {
        tracking.current = false;
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
  }, [disabled]);
}
