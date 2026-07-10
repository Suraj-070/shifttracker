"use client";

import React from "react";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="border-t border-border/40"
        style={{
          background: "color-mix(in oklch, var(--background) 92%, transparent)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>
        <div className="flex items-stretch justify-around h-[60px] max-w-lg mx-auto px-1">
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
                className="flex flex-col items-center justify-center flex-1 relative gap-0.5 touch-manipulation"
              >
                {/* Active dot indicator */}
                <div className={`absolute top-1 w-4 h-0.5 rounded-full transition-all duration-200 ${
                  isActive ? "bg-primary opacity-100" : "opacity-0"
                }`} />

                {/* Icon */}
                <div className="relative">
                  <Icon className={`transition-all duration-150 ${
                    isActive
                      ? "w-[24px] h-[24px] text-primary"
                      : "w-[22px] h-[22px] text-muted-foreground"
                  }`} />

                  {/* Badge */}
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  ) : null}
                </div>

                {/* Label */}
                <span className={`text-[10px] font-medium tracking-wide transition-all duration-150 ${
                  isActive ? "text-primary" : "text-muted-foreground opacity-55"
                }`}>
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
