"use client";

import React from "react";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/use-haptics";

interface NavTab {
  key: string;
  label: string;
  icon: React.ElementType;
  badge?: number; // red dot count
}

interface GlassmorphismNavProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function GlassmorphismNav({ tabs, activeTab, onTabChange }: GlassmorphismNavProps) {
  const haptics = useHaptics();

  const handleTabChange = (key: string) => {
    haptics(6);
    onTabChange(key);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-1px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 relative touch-manipulation"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div
                  animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative"
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {/* Unpaid badge */}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </motion.div>
                <span className={`text-[10px] font-medium relative transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}