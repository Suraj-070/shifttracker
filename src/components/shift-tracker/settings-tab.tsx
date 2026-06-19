"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, RefreshCw, Download, Info, Shield, FileText, Sparkles, Smartphone, Share, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore, type AccentColor, type CardDensity, type ViewMode } from "@/stores/settings-store";
import { useToast } from "@/hooks/use-toast";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const ACCENT_COLORS: { key: AccentColor; class: string; label: string }[] = [
  { key: "emerald", class: "bg-emerald-500", label: "Emerald" },
  { key: "rose", class: "bg-rose-500", label: "Rose" },
  { key: "amber", class: "bg-amber-500", label: "Amber" },
  { key: "violet", class: "bg-violet-500", label: "Violet" },
  { key: "sky", class: "bg-sky-500", label: "Sky" },
  { key: "orange", class: "bg-orange-500", label: "Orange" },
];

export function SettingsTab() {
  const { toast } = useToast();
  const { theme: currentTheme, setTheme } = useTheme();
  const store = useSettingsStore();
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall();

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast({ title: "Installed", description: "ShiftTracker added to your device." });
    } else if (outcome === "dismissed") {
      toast({ title: "Maybe later", description: "You can install anytime from this menu." });
    }
  };

  const handleForceSync = () => {
    store.setLastSyncTime(new Date().toISOString());
    toast({ title: "Synced", description: "All data is up to date." });
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/profile/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shifts-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "CSV file downloaded." });
    } catch {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    }
  };

  const themeOptions: { value: string; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Theme</Label>
            <div className="flex gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = currentTheme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 ring-2 ring-emerald-500/30" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Accent Color</Label>
            <div className="flex gap-3">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => store.setAccentColor(c.key)}
                  className={`w-8 h-8 rounded-full ${c.class} transition-all ${
                    store.accentColor === c.key ? "ring-2 ring-offset-2 ring-offset-background ring-current scale-110" : "opacity-60 hover:opacity-100"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm">Card Density</Label>
            <div className="flex gap-2">
              {(["compact", "comfortable", "spacious"] as CardDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => store.setCardDensity(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                    store.cardDensity === d ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 ring-2 ring-emerald-500/30" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Default Shifts View</Label>
            <div className="flex gap-2">
              {(["card", "list", "table"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => store.setViewMode(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                    store.viewMode === v ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 ring-2 ring-emerald-500/30" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Animations</Label>
            <Switch checked={store.enableAnimations} onCheckedChange={store.setEnableAnimations} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Haptics</Label>
            <Switch checked={store.enableHaptics} onCheckedChange={store.setEnableHaptics} />
          </div>
        </CardContent>
      </Card>

      {/* Install App */}
      {!installed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Install App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canInstall ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Install ShiftTracker on this device for a faster, full-screen experience with an app icon on your home screen.
                </p>
                <Button className="w-full justify-start gap-3" onClick={handleInstall}>
                  <Download className="w-4 h-4" /> Install ShiftTracker
                </Button>
              </>
            ) : isIos ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>To install on iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the <Share className="w-3.5 h-3.5 inline -mt-0.5" /> Share button in Safari</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" in the top right</li>
                </ol>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your browser doesn't support one-tap install yet, but you can still pin this page or check your browser menu for an "Install app" or "Add to Home Screen" option.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {installed && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>ShiftTracker is installed on this device.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4" /> Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last sync</span>
            <span className="font-medium">{store.lastSyncTime ? new Date(store.lastSyncTime).toLocaleString() : "Never"}</span>
          </div>
          <Button variant="outline" className="w-full justify-start gap-3" onClick={handleForceSync}>
            <RefreshCw className="w-4 h-4" /> Force Sync
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Weekly earnings reminder</Label>
            <Switch checked={store.weeklyReminder} onCheckedChange={store.setWeeklyReminder} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Shift payment reminder</Label>
            <Switch checked={store.paymentReminder} onCheckedChange={store.setPaymentReminder} />
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <Badge variant="secondary">1.0.0</Badge>
          </div>
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Shift & Payment Tracker helps you manage your work shifts, track payments, and analyze earnings.</p>
            <p className="font-medium">Privacy Policy: Your data stays on your device and your Supabase instance. We never share your information.</p>
            <p className="font-medium">Terms: This app is provided as-is. Use at your own risk.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
