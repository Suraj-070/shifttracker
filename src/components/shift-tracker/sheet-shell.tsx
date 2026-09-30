"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const EXIT_MS = 320;

interface SheetShellProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name announced by screen readers */
  label: string;
  children: React.ReactNode;
  /** Rendered above the drag handle (e.g. a colour stripe) */
  topSlot?: React.ReactNode;
  maxHeight?: string;
  backdropOpacity?: number;
}

/**
 * Shared bottom sheet with real dialog semantics:
 * role=dialog + aria-modal, focus trap, Escape to close, focus restore,
 * body scroll lock, swipe-down on the handle, and unmount (not just hide)
 * once the exit animation finishes so closed sheets are never tabbable.
 */
export function SheetShell({
  open,
  onClose,
  label,
  children,
  topSlot,
  maxHeight = "94dvh",
  backdropOpacity = 0.5,
}: SheetShellProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dragStart = useRef<number | null>(null);

  // Mount on open, unmount after the exit transition
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    setDragY(0);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Focus management + scroll lock
  useEffect(() => {
    if (!open || !mounted) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
    return () => {
      clearTimeout(id);
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, mounted]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null
      );
      if (nodes.length === 0) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  // Swipe-down on the handle to dismiss
  const onHandleTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  };
  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onHandleTouchEnd = () => {
    if (dragY > 100) onClose();
    else setDragY(0);
    dragStart.current = null;
  };

  if (!mounted) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[54]"
        onClick={onClose}
        style={{
          background: `rgba(0,0,0,${backdropOpacity})`,
          backdropFilter: visible ? "blur(4px)" : "none",
          WebkitBackdropFilter: visible ? "blur(4px)" : "none",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.22s ease",
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ inert: !open } as any)}
        className="fixed bottom-0 left-0 right-0 z-[55] bg-background rounded-t-3xl shadow-2xl outline-none"
        style={{
          transform: visible ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragY ? "none" : `transform ${EXIT_MS}ms cubic-bezier(0.32,0.72,0,1)`,
          maxHeight,
          overflowY: "auto",
          overscrollBehavior: "contain",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        {topSlot}
        <div
          className="flex justify-center pt-3 pb-1 sticky top-0 bg-background/95 backdrop-blur-sm z-10 touch-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>
        {children}
      </div>
    </>
  );
}
