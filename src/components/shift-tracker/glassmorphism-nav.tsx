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
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-1px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (!isActive) haptics(6);
                  onTabChange(tab.key);
                }}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 relative touch-manipulation z-10"
                style={{ minWidth: 44 }}
              >
                {/* Sliding pill indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-x-1.5 inset-y-1.5 rounded-2xl bg-primary/10 dark:bg-primary/20"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 38,
                      mass: 0.6,
                    }}
                  />
                )}

                {/* Icon with bounce */}
                <motion.div
                  animate={{
                    y: isActive ? -2 : 0,
                    scale: isActive ? 1.12 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 28,
                  }}
                  className="relative"
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-150 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />

                  {/* Unpaid badge */}
                  <AnimatePresence>
                    {tab.badge && tab.badge > 0 ? (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 20 }}
                        className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center"
                      >
                        {tab.badge > 99 ? "99+" : tab.badge}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  animate={{
                    opacity: isActive ? 1 : 0.6,
                    fontWeight: isActive ? 600 : 400,
                  }}
                  transition={{ duration: 0.15 }}
                  className={`text-[10px] relative ${
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