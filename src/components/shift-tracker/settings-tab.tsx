"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import {
  Moon, Sun, ChevronDown, ChevronRight, DollarSign,
  RefreshCw, Download, FileText, Sparkles,
  Smartphone, Share, CheckCircle2, Vibrate,
  Layout, Shield, LogOut, Palette,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useSettingsStore,
  type AccentColor,
  type CardDensity,
  type ViewMode,
  type DefaultTab,
  type HapticsStrength,
  type SwipeSensitivity,
} from "@/stores/settings-store";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";

// ─── Reusable components ──────────────────────────────────────────────────────

const ACCENT_COLORS: { key: AccentColor; class: string }[] = [
  { key: "emerald", class: "bg-emerald-500" },
  { key: "rose",    class: "bg-rose-500" },
  { key: "amber",   class: "bg-amber-500" },
  { key: "violet",  class: "bg-violet-500" },
  { key: "sky",     class: "bg-sky-500" },
  { key: "orange",  class: "bg-orange-500" },
];

function SegmentControl<T extends string>({
  value, options, onChange, size = "md",
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={`flex gap-1 p-1 bg-muted rounded-xl ${size === "sm" ? "text-xs" : "text-sm"}`}>
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex-1 ${size === "sm" ? "py-1 px-1.5" : "py-1.5 px-2"} rounded-lg font-medium transition-all ${
            value === o.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, description, children, compact }: {
  label: string;
  description?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${compact ? "py-2" : "py-2.5"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Collapsible accordion section ───────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {badge && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{badge}</Badge>}
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsTab() {
  const { showToast } = useAppToast();
  const { theme: currentTheme, setTheme } = useTheme();
  const store = useSettingsStore();
  const [rates, setRates] = React.useState(store.payRates);
  const [ratesSaved, setRatesSaved] = React.useState(false);
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall();

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") showToast({ type: "success", title: "App installed!" });
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/profile/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "shifts-export.csv"; a.click();
      URL.revokeObjectURL(url);
      showToast({ type: "success", title: "Exported" });
    } catch {
      showToast({ type: "error", title: "Export failed" });
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-2 pb-8">

      {/* ── Appearance ── */}
      <Section icon={Palette} title="Appearance" defaultOpen>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Theme</Label>
          <SegmentControl
            value={currentTheme as "light" | "dark" | "system"}
            options={[
              { key: "light",  label: "☀️ Light" },
              { key: "dark",   label: "🌙 Dark" },
              { key: "system", label: "⚙️ Auto" },
            ]}
            onChange={v => setTheme(v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Accent colour</Label>
          <div className="flex gap-2.5">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => store.setAccentColor(c.key)}
                className={`w-8 h-8 rounded-full ${c.class} transition-all ${
                  store.accentColor === c.key
                    ? "ring-2 ring-offset-2 ring-offset-background ring-current scale-110"
                    : "opacity-50"
                }`}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ── Display ── */}
      <Section icon={Layout} title="Display">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Card density</Label>
          <SegmentControl
            value={store.cardDensity}
            options={[
              { key: "compact" as CardDensity,     label: "Compact" },
              { key: "comfortable" as CardDensity, label: "Default" },
              { key: "spacious" as CardDensity,    label: "Spacious" },
            ]}
            onChange={store.setCardDensity}
            size="sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Default shift view</Label>
          <SegmentControl
            value={store.viewMode}
            options={[
              { key: "card"  as ViewMode, label: "Cards" },
              { key: "list"  as ViewMode, label: "List" },
              { key: "table" as ViewMode, label: "Table" },
            ]}
            onChange={store.setViewMode}
            size="sm"
          />
        </div>
        <Separator />
        <Row label="Compact dashboard" description="Hide collection bar + avg stat" compact>
          <Switch checked={store.compactDashboard} onCheckedChange={store.setCompactDashboard} />
        </Row>
      </Section>

      {/* ── Mobile ── */}
      <Section icon={Smartphone} title="Mobile">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Default tab on open</Label>
          <SegmentControl
            value={store.defaultTab}
            options={[
              { key: "dashboard" as DefaultTab, label: "Dashboard" },
              { key: "shifts"    as DefaultTab, label: "Shifts" },
              { key: "calendar"  as DefaultTab, label: "Calendar" },
            ]}
            onChange={store.setDefaultTab}
            size="sm"
          />
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pull-to-refresh</Label>
          <SegmentControl
            value={store.swipeSensitivity}
            options={[
              { key: "low"    as SwipeSensitivity, label: "Low" },
              { key: "medium" as SwipeSensitivity, label: "Medium" },
              { key: "high"   as SwipeSensitivity, label: "High" },
            ]}
            onChange={store.setSwipeSensitivity}
            size="sm"
          />
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Long press speed</Label>
          <SegmentControl
            value={store.longPressDelay === 300 ? "fast" : store.longPressDelay === 450 ? "medium" : "slow"}
            options={[
              { key: "fast",   label: "Fast" },
              { key: "medium", label: "Normal" },
              { key: "slow",   label: "Slow" },
            ]}
            onChange={v => store.setLongPressDelay(v === "fast" ? 300 : v === "medium" ? 450 : 700)}
            size="sm"
          />
        </div>
        <Separator />
        <Row label="Haptics" compact>
          <Switch checked={store.enableHaptics} onCheckedChange={store.setEnableHaptics} />
        </Row>
        {store.enableHaptics && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Haptic strength</Label>
            <SegmentControl
              value={store.hapticsStrength}
              options={[
                { key: "light"  as HapticsStrength, label: "Light" },
                { key: "medium" as HapticsStrength, label: "Medium" },
                { key: "strong" as HapticsStrength, label: "Strong" },
              ]}
              onChange={store.setHapticsStrength}
              size="sm"
            />
          </div>
        )}
        <Separator />
        <Row label="Animations" compact>
          <Switch checked={store.enableAnimations} onCheckedChange={store.setEnableAnimations} />
        </Row>
      </Section>

{/* ── Install ── */}
      {!installed && (
        <Section icon={Smartphone} title="Install App">
          {canInstall ? (
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              <Download className="w-4 h-4" />
              Add to Home Screen
            </button>
          ) : isIos ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Install on iPhone:</p>
              {["Tap the Share button in Safari", 'Tap "Add to Home Screen"', 'Tap "Add"'].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted text-[11px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                  <span className="text-xs">{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Open browser menu → "Install app" or "Add to Home Screen"</p>
          )}
        </Section>
      )}
      {installed && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">App installed</p>
            <p className="text-[11px] text-emerald-600/70">ShiftTracker is on your home screen</p>
          </div>
        </div>
      )}

      {/* ── Pay Rates ── */}
      <Section icon={DollarSign} title="Pay Rates">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Update when your award rate changes</p>
          {[
            { label: "Afternoon (weekday)", key: "afternoonRate" as const },
            { label: "Saturday", key: "saturdayRate" as const },
            { label: "Sunday", key: "sundayRate" as const },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-3">
              <p className="text-sm flex-1">{label}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates[key]}
                  onChange={e => setRates(r => ({ ...r, [key]: Number(e.target.value) }))}
                  className="w-20 h-8 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="text-xs text-muted-foreground">/hr</span>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <p className="text-sm flex-1">Tax rate (PAYG)</p>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={(rates.taxRate * 100).toFixed(2)}
                onChange={e => setRates(r => ({ ...r, taxRate: Number(e.target.value) / 100 }))}
                className="w-20 h-8 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm flex-1">Default hall amount</p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">$</span>
              <input
                type="number"
                step="1"
                min="0"
                value={rates.defaultHallAmount}
                onChange={e => setRates(r => ({ ...r, defaultHallAmount: Number(e.target.value) }))}
                className="w-20 h-8 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <button
            onClick={() => {
              store.setPayRates(rates);
              setRatesSaved(true);
              setTimeout(() => setRatesSaved(false), 2000);
              showToast({ type: "success", title: "Pay rates saved ✓" });
            }}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-all"
          >
            {ratesSaved ? "✓ Saved!" : "Save Pay Rates"}
          </button>
        </div>
      </Section>

      {/* ── Data ── */}
      <Section icon={Shield} title="Data & Privacy">
        <div className="space-y-2 mb-3">
          <button
            onClick={async () => {
              const res = await fetch("/api/shifts/migrate-tax", { method: "POST" });
              const data = await res.json();
              showToast({ type: "success", title: `Updated ${data.updated} station shifts to 5.16% tax` });
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm font-semibold"
          >
            🔄 Fix Station Tax Rates (5.16%)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              store.setLastSyncTime(new Date().toISOString());
              showToast({ type: "success", title: "Synced" });
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Sync
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Your data is stored privately in your own Supabase instance.
        </p>
      </Section>

      {/* ── Sign out + version ── */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-600 text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
        <p className="text-center text-[11px] text-muted-foreground pt-1">
          ShiftTracker v2.0.0
        </p>
      </div>

    </div>
  );
}
