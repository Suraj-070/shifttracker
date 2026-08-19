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

  // Split tabs: 2 left, FAB center, 2 right
  const leftTabs  = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Floating pill container */}
      <div className="px-4 pb-3">
        <div
          className="relative flex items-center justify-around rounded-[28px] px-2"
          style={{
            height: 64,
            background: "color-mix(in oklch, var(--background) 92%, transparent)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)",
            border: "1px solid color-mix(in oklch, var(--border) 60%, transparent)",
          }}
        >
          {/* Left tabs */}
          {leftTabs.map((tab) => (
            <TabButton key={tab.key} tab={tab} isActive={activeTab === tab.key}
              onPress={() => { if (activeTab !== tab.key) haptics(6); onTabChange(tab.key); }} />
          ))}

          {/* FAB center */}
          <div className="relative flex items-center justify-center" style={{ width: 56 }}>
            <button
              onClick={() => { haptics(14); onFabPress(); }}
              className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150"
              style={{
                background: "linear-gradient(135deg, oklch(0.6 0.17 162), oklch(0.45 0.15 162))",
                boxShadow: "0 4px 16px oklch(0.53 0.15 162 / 45%), 0 2px 6px oklch(0.53 0.15 162 / 30%)",
                marginBottom: 18,
              }}
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right tabs */}
          {rightTabs.map((tab) => (
            <TabButton key={tab.key} tab={tab} isActive={activeTab === tab.key}
              onPress={() => { if (activeTab !== tab.key) haptics(6); onTabChange(tab.key); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TabButton({ tab, isActive, onPress }: {
  tab: NavTab; isActive: boolean; onPress: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onPress}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative touch-manipulation select-none"
    >
      {/* Active filled pill behind icon */}
      <div
        className="absolute rounded-2xl transition-all duration-200"
        style={{
          inset: "8px 6px",
          background: isActive ? "color-mix(in oklch, var(--primary) 14%, transparent)" : "transparent",
          transform: isActive ? "scale(1)" : "scale(0.8)",
          opacity: isActive ? 1 : 0,
          transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />

      {/* Icon */}
      <div className="relative z-10">
        <Icon
          style={{
            width: 20,
            height: 20,
            color: isActive ? "var(--primary)" : "var(--muted-foreground)",
            opacity: isActive ? 1 : 0.5,
            strokeWidth: isActive ? 2.3 : 1.7,
            transform: isActive ? "translateY(-1px) scale(1.05)" : "translateY(0) scale(1)",
            transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
        {tab.badge && tab.badge > 0 ? (
          <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
            {tab.badge > 99 ? "99+" : tab.badge}
          </span>
        ) : null}
      </div>

      {/* Label */}
      <span
        className="text-[10px] z-10 leading-none"
        style={{
          color: isActive ? "var(--primary)" : "var(--muted-foreground)",
          fontWeight: isActive ? 700 : 500,
          opacity: isActive ? 1 : 0.5,
          transition: "all 0.2s ease",
        }}
      >
        {tab.label}
      </span>
    </button>
  );
}
