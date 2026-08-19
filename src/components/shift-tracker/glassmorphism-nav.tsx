"use client";

import React, { useRef } from "react";
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
      {/* Glass surface */}
      <div
        className="border-t border-border/30"
        style={{
          background: "color-mix(in oklch, var(--background) 88%, transparent)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 h-[62px]">
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
                className="flex flex-col items-center justify-center flex-1 h-full relative touch-manipulation select-none"
              >
                {/* Active pill background */}
                <div
                  className="absolute inset-x-1.5 top-2.5 bottom-2.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: isActive ? "color-mix(in oklch, var(--primary) 12%, transparent)" : "transparent",
                    transform: isActive ? "scale(1)" : "scale(0.85)",
                    opacity: isActive ? 1 : 0,
                  }}
                />

                {/* Icon + badge */}
                <div className="relative z-10 mb-0.5">
                  <Icon
                    className="transition-all duration-200"
                    style={{
                      width: isActive ? 22 : 20,
                      height: isActive ? 22 : 20,
                      color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                      opacity: isActive ? 1 : 0.6,
                      strokeWidth: isActive ? 2.2 : 1.8,
                      transform: isActive ? "translateY(-1px)" : "translateY(0)",
                      transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  ) : null}
                </div>

                {/* Label */}
                <span
                  className="text-[10px] tracking-wide z-10 transition-all duration-200"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                    fontWeight: isActive ? 700 : 500,
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
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
