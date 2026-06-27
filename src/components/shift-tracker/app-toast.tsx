"use client";

// ─── Discord/modern-style action toast ───────────────────────────────────────
// Single global toast that slides from bottom. One at a time.
// Usage:
//   const { showToast } = useAppToast();
//   showToast({ type: "success", title: "Shift added!", description: "Central · 25 Jun" })

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, Trash2, Pencil, Train, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "delete" | "edit" | "station";

export interface ToastData {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 3000
}

interface ToastContextValue {
  showToast: (data: ToastData) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useAppToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  delete: Trash2,
  edit: Pencil,
  station: Train,
};

const COLORS: Record<ToastType, { bg: string; icon: string; bar: string }> = {
  success: { bg: "bg-emerald-500/20", icon: "text-emerald-400", bar: "bg-emerald-500" },
  error:   { bg: "bg-rose-500/20",    icon: "text-rose-400",    bar: "bg-rose-500" },
  info:    { bg: "bg-blue-500/20",    icon: "text-blue-400",    bar: "bg-blue-500" },
  delete:  { bg: "bg-rose-500/20",    icon: "text-rose-400",    bar: "bg-rose-500" },
  edit:    { bg: "bg-amber-500/20",   icon: "text-amber-400",   bar: "bg-amber-500" },
  station: { bg: "bg-blue-500/20",    icon: "text-blue-400",    bar: "bg-blue-500" },
};

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastData & { id: number }) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((data: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++idRef.current;
    setToast({ ...data, id });
    timerRef.current = setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t));
    }, data.duration ?? 3000);
  }, []);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const Icon = toast ? ICONS[toast.type] : CheckCircle2;
  const colors = toast ? COLORS[toast.type] : COLORS.success;
  const duration = toast?.duration ?? 3000;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 440, damping: 36, mass: 0.7 }}
            className="fixed bottom-20 left-4 right-4 z-[60] md:left-auto md:right-6 md:w-80"
          >
            <div className="relative flex items-center gap-3 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-black/40 overflow-hidden">

              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}>
                <Icon className={`w-4 h-4 ${colors.icon}`} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-zinc-100 leading-tight">{toast.title}</p>
                {toast.description && (
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{toast.description}</p>
                )}
              </div>

              {/* Close */}
              <button
                onClick={dismiss}
                className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px]">
                <motion.div
                  className={`h-full ${colors.bar} opacity-70`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: duration / 1000, ease: "linear" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}