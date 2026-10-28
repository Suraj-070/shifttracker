"use client";

import React, { useState } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { Plus, X } from "lucide-react";

interface NavTab {
  key: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface GlassmorphismNavProps {
  tabs: NavTab[];
  moreTabs?: NavTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  onFabPress: () => void;
}

export function GlassmorphismNav({
  tabs,
  moreTabs = [],
  activeTab,
  onTabChange,
  onFabPress,
}: GlassmorphismNavProps) {
  const haptics = useHaptics();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryKeys = new Set(tabs.filter((tab) => tab.key !== "more").map((tab) => tab.key));
  const isMoreActive = !primaryKeys.has(activeTab);

  const handleTabPress = (key: string) => {
    if (key === "more") {
      haptics(6);
      setMoreOpen((open) => !open);
      return;
    }
    if (activeTab !== key) haptics(6);
    setMoreOpen(false);
    onTabChange(key);
  };

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close more navigation"
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />
          <section
            aria-label="More navigation options"
            className="fixed z-50 left-4 right-4 mx-auto max-w-lg rounded-3xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-2xl"
            style={{ bottom: "calc(94px + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">More</h2>
                <p className="text-xs text-muted-foreground">All ShiftTracker tools</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="hit flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabPress(tab.key)}
                    aria-current={selected ? "page" : undefined}
                    className="flex min-h-14 items-center gap-3 rounded-2xl border border-border px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    style={selected ? { background: "color-mix(in oklch, var(--primary) 10%, var(--background))", borderColor: "var(--primary)" } : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="text-sm font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-3 pb-3 pt-0">
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
            <div className="flex flex-1 items-center min-w-0">
              {tabs.slice(0, 2).map((tab) => (
                <TabBtn key={tab.key} tab={tab} isActive={activeTab === tab.key}
                  onPress={() => handleTabPress(tab.key)} />
              ))}
            </div>

            <div className="flex items-center justify-center shrink-0" style={{ width: 64 }}>
              <button
                type="button"
                onClick={() => { haptics(14); setMoreOpen(false); onFabPress(); }}
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
                <Plus className="h-6 w-6 text-white" strokeWidth={2.8} />
              </button>
            </div>

            <div className="flex flex-1 items-center min-w-0">
              {tabs.slice(2, 4).map((tab) => (
                <TabBtn
                  key={tab.key}
                  tab={tab}
                  isActive={tab.key === "more" ? (moreOpen || isMoreActive) : activeTab === tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  expanded={tab.key === "more" ? moreOpen : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TabBtn({
  tab,
  isActive,
  onPress,
  expanded,
}: {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
  expanded?: boolean;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={tab.label}
      aria-current={isActive && tab.key !== "more" ? "page" : undefined}
      aria-expanded={expanded}
      className="flex-1 flex flex-col items-center justify-center gap-[3px] h-full relative touch-manipulation select-none py-2 min-w-0"
    >
      <div
        className="absolute rounded-2xl"
        style={{
          inset: "6px 4px",
          background: isActive ? "color-mix(in oklch, var(--primary) 12%, transparent)" : "transparent",
          opacity: isActive ? 1 : 0,
          transition: "all 0.25s cubic-bezier(0.2,0,0,1)",
        }}
      />
      <div className="relative z-10">
        <Icon
          style={{
            width: 21,
            height: 21,
            color: isActive ? "var(--primary)" : "var(--muted-foreground)",
            strokeWidth: isActive ? 2.4 : 1.7,
            opacity: isActive ? 1 : 0.75,
            transition: "color 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease",
          }}
          aria-hidden="true"
        />
        {tab.badge && tab.badge > 0 ? (
          <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-caption font-black flex items-center justify-center">
            {tab.badge > 99 ? "99+" : tab.badge}
          </span>
        ) : null}
      </div>
      <span
        className="text-caption z-10 tracking-tight"
        style={{
          color: isActive ? "var(--primary)" : "var(--muted-foreground)",
          fontWeight: isActive ? 700 : 500,
          opacity: isActive ? 1 : 0.85,
          transition: "all 0.2s ease",
        }}
      >
        {tab.label}
      </span>
    </button>
  );
}
