"use client";

import React from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { Plus } from "lucide-react";

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
  onFabPress: () => void;
}

export function GlassmorphismNav({ tabs, activeTab, onTabChange, onFabPress }: GlassmorphismNavProps) {
  const haptics = useHaptics();

  // Always split: 2 left, FAB, 2 right
  const leftTabs  = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="px-4 pb-3 pt-0">
        {/* Floating pill */}
        <div
          className="relative flex items-center rounded-[32px]"
          style={{
            height: 62,
            background: "color-mix(in oklch, var(--background) 94%, transparent)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            boxShadow: "0 -1px 0 0 color-mix(in oklch, var(--border) 50%, transparent), 0 8px 40px rgba(0,0,0,0.10), 0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid color-mix(in oklch, var(--border) 70%, transparent)",
          }}
        >
          {/* Left 2 tabs */}
          <div className="flex flex-1 items-center">
            {leftTabs.map(tab => (
              <TabBtn key={tab.key} tab={tab} isActive={activeTab === tab.key}
                onPress={() => { if (activeTab !== tab.key) haptics(6); onTabChange(tab.key); }} />
            ))}
          </div>

          {/* Center FAB slot — exact 72px to match FAB diameter */}
          <div className="flex items-center justify-center shrink-0" style={{ width: 72 }}>
            <button
              onClick={() => { haptics(14); onFabPress(); }}
              aria-label="Add shift"
              className="absolute flex items-center justify-center active:scale-90 transition-all duration-150"
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                bottom: 16,
                background: "linear-gradient(145deg, oklch(0.62 0.17 162), oklch(0.44 0.16 162))",
                boxShadow: "0 4px 20px oklch(0.53 0.15 162 / 50%), 0 2px 6px oklch(0.53 0.15 162 / 25%), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.8} />
            </button>
          </div>

          {/* Right 2 tabs */}
          <div className="flex flex-1 items-center">
            {rightTabs.map(tab => (
              <TabBtn key={tab.key} tab={tab} isActive={activeTab === tab.key}
                onPress={() => { if (activeTab !== tab.key) haptics(6); onTabChange(tab.key); }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ tab, isActive, onPress }: { tab: NavTab; isActive: boolean; onPress: () => void }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onPress}
      aria-label={tab.label}
      aria-current={isActive ? "page" : undefined}
      className="flex-1 flex flex-col items-center justify-center gap-[3px] h-full relative touch-manipulation select-none py-2"
    >
      {/* Pill bg */}
      <div
        className="absolute rounded-2xl"
        style={{
          inset: "6px 8px",
          background: isActive ? "color-mix(in oklch, var(--primary) 12%, transparent)" : "transparent",
          transform: isActive ? "scale(1)" : "scale(0.75)",
          opacity: isActive ? 1 : 0,
          transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />

      {/* Icon */}
      <div className="relative z-10">
        <Icon
          style={{
            width: 21,
            height: 21,
            color: isActive ? "var(--primary)" : "var(--muted-foreground)",
            strokeWidth: isActive ? 2.4 : 1.7,
            opacity: isActive ? 1 : 0.45,
            transform: isActive ? "translateY(-1px) scale(1.08)" : "scale(1)",
            transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
        {tab.badge && tab.badge > 0 ? (
          <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
            {tab.badge > 99 ? "99+" : tab.badge}
          </span>
        ) : null}
      </div>

      {/* Label */}
      <span
        className="text-[11px] z-10 tracking-tight"
        style={{
          color: isActive ? "var(--primary)" : "var(--muted-foreground)",
          fontWeight: isActive ? 700 : 500,
          opacity: isActive ? 1 : 0.55,
          transition: "all 0.2s ease",
        }}
      >
        {tab.label}
      </span>
    </button>
  );
}
