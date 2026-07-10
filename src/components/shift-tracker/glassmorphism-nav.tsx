"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/hooks/use-haptics";

interface NavTab {
  key: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface GlassmorphismNavProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function GlassmorphismNav({ tabs, activeTab, onTabChange }: GlassmorphismNavProps) {
  const haptics = useHaptics();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Frosted glass background */}
      <div
        className="relative border-t border-border/40"
        style={{
          background: "oklch(var(--background-raw, 1 0 0) / 0.92)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 -1px 0 oklch(0 0 0 / 0.06), 0 -8px 32px oklch(0 0 0 / 0.06)",
        }}
      >
        <div className="flex items-stretch justify-around h-[60px] max-w-lg mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (!isActive) haptics(8);
                  onTabChange(tab.key);
                }}
                className="flex flex-col items-center justify-center flex-1 relative touch-manipulation py-1 gap-0.5"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Icon */}
                <motion.div
                  animate={{
                    y: isActive ? -1 : 0,
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative z-10"
                >
                  <Icon
                    className={`transition-all duration-150 ${
                      isActive
                        ? "w-[24px] h-[24px] text-primary stroke-[2.2px]"
                        : "w-[22px] h-[22px] text-muted-foreground stroke-[1.8px]"
                    }`}
                  />

                  {/* Badge */}
                  <AnimatePresence>
                    {tab.badge && tab.badge > 0 ? (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 22 }}
                        className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm"
                      >
                        {tab.badge > 99 ? "99+" : tab.badge}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  animate={{ opacity: isActive ? 1 : 0.55 }}
                  transition={{ duration: 0.15 }}
                  className={`text-[10px] font-medium relative z-10 tracking-wide ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
