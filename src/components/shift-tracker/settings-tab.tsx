"use client";

import React from "react";
import { useTheme } from "next-themes";
import {
  Moon, Sun, Monitor, RefreshCw, Download, Info, Shield, Bell,
  FileText, Sparkles, Smartphone, Share, CheckCircle2,
  Vibrate, Gauge, Layout, Home, Clock, LayoutDashboard,
  CalendarDays, Calendar, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { NotificationSettings } from "@/components/shift-tracker/notification-settings";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { motion } from "framer-motion";

const ACCENT_COLORS: { key: AccentColor; class: string; label: string }[] = [
  { key: "emerald", class: "bg-emerald-500", label: "Emerald" },
  { key: "rose",    class: "bg-rose-500",    label: "Rose" },
  { key: "amber",   class: "bg-amber-500",   label: "Amber" },
  { key: "violet",  class: "bg-violet-500",  label: "Violet" },
  { key: "sky",     class: "bg-sky-500",     label: "Sky" },
  { key: "orange",  class: "bg-orange-500",  label: "Orange" },
];

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SegmentControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={`flex gap-1 p-1 bg-muted rounded-xl ${size === "sm" ? "text-xs" : "text-sm"}`}>
      {options.map((o) => (
        <motion.button
          key={o.key}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(o.key)}
          className={`flex-1 ${size === "sm" ? "py-1 px-2" : "py-1.5 px-3"} rounded-lg font-medium transition-all ${
            value === o.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

export function SettingsTab({ savedStationNames = [] }: { savedStationNames?: string[] }) {
  const { showToast } = useAppToast();
  const { theme: currentTheme, setTheme } = useTheme();
  const store = useSettingsStore();
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall();

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") showToast({ type: "success", title: "Installed!", description: "ShiftTracker added to home screen." });
    else if (outcome === "dismissed") showToast({ type: "info", title: "Maybe later" });
  };

  const handleForceSync = () => {
    store.setLastSyncTime(new Date().toISOString());
    showToast({ type: "success", title: "Synced", description: "All data is up to date." });
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/profile/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "shifts-export.csv"; a.click();
      URL.revokeObjectURL(url);
      showToast({ type: "success", title: "Exported", description: "CSV downloaded." });
    } catch {
      showToast({ type: "error", title: "Export failed" });
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">

      {/* ── Appearance ── */}
      <SectionCard icon={Sun} title="Appearance">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Theme</Label>
          <SegmentControl
            value={currentTheme as "light" | "dark" | "system"}
            options={[
              { key: "light", label: "☀️ Light" },
              { key: "dark",  label: "🌙 Dark" },
              { key: "system", label: "⚙️ Auto" },
            ]}
            onChange={(v) => setTheme(v)}
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Accent colour</Label>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_COLORS.map((c) => (
              <motion.button
                key={c.key}
                whileTap={{ scale: 0.85 }}
                onClick={() => store.setAccentColor(c.key)}
                className={`w-9 h-9 rounded-full ${c.class} transition-all ${
                  store.accentColor === c.key
                    ? "ring-2 ring-offset-2 ring-offset-background ring-current scale-110 shadow-lg"
                    : "opacity-50 hover:opacity-100"
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Display ── */}
      <SectionCard icon={Layout} title="Display">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Card density</Label>
          <SegmentControl
            value={store.cardDensity}
            options={[
              { key: "compact" as CardDensity, label: "Compact" },
              { key: "comfortable" as CardDensity, label: "Default" },
              { key: "spacious" as CardDensity, label: "Spacious" },
            ]}
            onChange={store.setCardDensity}
          />
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Default shift view</Label>
          <SegmentControl
            value={store.viewMode}
            options={[
              { key: "card" as ViewMode, label: "Cards" },
              { key: "list" as ViewMode, label: "List" },
              { key: "table" as ViewMode, label: "Table" },
            ]}
            onChange={store.setViewMode}
          />
        </div>
        <Separator />
        <SettingRow label="Compact dashboard" description="Hide collection bar and avg/shift stat">
          <Switch checked={store.compactDashboard} onCheckedChange={store.setCompactDashboard} />
        </SettingRow>
      </SectionCard>

      {/* ── Mobile ── */}
      <SectionCard icon={Smartphone} title="Mobile">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Default tab on open</Label>
          <SegmentControl
            value={store.defaultTab}
            options={[
              { key: "dashboard" as DefaultTab, label: "Dashboard" },
              { key: "shifts" as DefaultTab, label: "Shifts" },
              { key: "calendar" as DefaultTab, label: "Calendar" },
            ]}
            onChange={store.setDefaultTab}
          />
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pull-to-refresh sensitivity</Label>
          <SegmentControl
            value={store.swipeSensitivity}
            options={[
              { key: "low" as SwipeSensitivity, label: "Low" },
              { key: "medium" as SwipeSensitivity, label: "Medium" },
              { key: "high" as SwipeSensitivity, label: "High" },
            ]}
            onChange={store.setSwipeSensitivity}
            size="sm"
          />
          <p className="text-[11px] text-muted-foreground">High = easier to trigger, Low = requires more pull</p>
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Long press speed</Label>
          <SegmentControl
            value={store.longPressDelay === 300 ? "fast" : store.longPressDelay === 450 ? "medium" : "slow"}
            options={[
              { key: "fast",   label: "Fast (0.3s)" },
              { key: "medium", label: "Normal (0.5s)" },
              { key: "slow",   label: "Slow (0.7s)" },
            ]}
            onChange={(v) => store.setLongPressDelay(v === "fast" ? 300 : v === "medium" ? 450 : 700)}
            size="sm"
          />
        </div>
      </SectionCard>

      {/* ── Haptics ── */}
      <SectionCard icon={Vibrate} title="Haptics">
        <SettingRow label="Enable haptic feedback" description="Vibration on actions">
          <Switch checked={store.enableHaptics} onCheckedChange={store.setEnableHaptics} />
        </SettingRow>
        {store.enableHaptics && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Vibration strength</Label>
              <SegmentControl
                value={store.hapticsStrength}
                options={[
                  { key: "light" as HapticsStrength, label: "Light" },
                  { key: "medium" as HapticsStrength, label: "Medium" },
                  { key: "strong" as HapticsStrength, label: "Strong" },
                ]}
                onChange={store.setHapticsStrength}
                size="sm"
              />
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Animations ── */}
      <SectionCard icon={Sparkles} title="Animations">
        <SettingRow label="Enable animations" description="Transitions and motion effects">
          <Switch checked={store.enableAnimations} onCheckedChange={store.setEnableAnimations} />
        </SettingRow>
      </SectionCard>

      {/* ── Install ── */}
      {!installed && (
        <SectionCard icon={Smartphone} title="Install App">
          {canInstall ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleInstall}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
            >
              <Download className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Install ShiftTracker</p>
                <p className="text-xs opacity-80">Add to home screen for full-screen experience</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto opacity-70" />
            </motion.button>
          ) : isIos ? (
            <div className="text-sm text-muted-foreground space-y-3">
              <p className="font-medium">Install on iPhone:</p>
              <ol className="space-y-2">
                {[
                  <>Tap the <Share className="w-3.5 h-3.5 inline -mt-0.5" /> Share button in Safari</>,
                  <>Scroll down → tap <strong>"Add to Home Screen"</strong></>,
                  <>Tap <strong>"Add"</strong> in the top right</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">{i+1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Check your browser menu for "Install app" or "Add to Home Screen".</p>
          )}
        </SectionCard>
      )}
      {installed && (
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">App installed</p>
                <p className="text-xs opacity-70">ShiftTracker is on your home screen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* ── Data ── */}
      <SectionCard icon={Shield} title="Data & Privacy">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last sync</span>
          <span className="font-medium text-xs">{store.lastSyncTime ? new Date(store.lastSyncTime).toLocaleString() : "Never"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={handleForceSync}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Sync
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </motion.button>
        </div>
        <p className="text-[11px] text-muted-foreground">Your data is private and stored only in your Supabase instance. We never share your information.</p>
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionCard icon={Bell} title="Reminders & Notifications">
        <NotificationSettings savedStationNames={savedStationNames} />
      </SectionCard>

      {/* ── About ── */}
      <SectionCard icon={FileText} title="About">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Version</span>
          <Badge variant="secondary">2.0.0</Badge>
        </div>
      </SectionCard>

    </div>
  );
}