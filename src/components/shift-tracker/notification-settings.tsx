"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, BellOff, Clock, Train, Calendar,
  CheckCircle2, AlertCircle, Loader2, Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

interface NotifSettings {
  shift_reminder_enabled: boolean;
  shift_reminder_days: number[];
  shift_reminder_time: string;
  station_clockin_enabled: boolean;
  station_clockin_offset: number;
  station_clockout_enabled: boolean;
  station_clockout_offset: number;
}

const DEFAULT_SETTINGS: NotifSettings = {
  shift_reminder_enabled: false,
  shift_reminder_days: [],
  shift_reminder_time: "21:00",
  station_clockin_enabled: false,
  station_clockin_offset: 10,
  station_clockout_enabled: false,
  station_clockout_offset: 5,
};

export function NotificationSettings() {
  const { showToast } = useAppToast();
  const { permission, isSubscribed, isLoading: subLoading, subscribe, unsubscribe } = usePushNotifications();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Load saved settings
  useEffect(() => {
    fetch("/api/push/settings")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setSettings({
            shift_reminder_enabled: data.shift_reminder_enabled ?? false,
            shift_reminder_days: data.shift_reminder_days ?? [],
            shift_reminder_time: data.shift_reminder_time ?? "21:00",
            station_clockin_enabled: data.station_clockin_enabled ?? false,
            station_clockin_offset: data.station_clockin_offset ?? 10,
            station_clockout_enabled: data.station_clockout_enabled ?? false,
            station_clockout_offset: data.station_clockout_offset ?? 5,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, []);

  const toggleDay = (day: number) => {
    setSettings(s => ({
      ...s,
      shift_reminder_days: s.shift_reminder_days.includes(day)
        ? s.shift_reminder_days.filter(d => d !== day)
        : [...s.shift_reminder_days, day],
    }));
  };

  const handleSave = useCallback(async () => {
    if (!isSubscribed) {
      showToast({ type: "error", title: "Enable notifications first" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/push/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast({ type: "success", title: "Notification settings saved" });
      } else {
        throw new Error("Failed");
      }
    } catch {
      showToast({ type: "error", title: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  }, [settings, isSubscribed, showToast]);

  const handleSubscribeToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) showToast({ type: "info", title: "Notifications disabled" });
    } else {
      const ok = await subscribe();
      if (ok) showToast({ type: "success", title: "Notifications enabled! 🔔" });
      else if (permission === "denied") {
        showToast({ type: "error", title: "Notifications blocked", description: "Enable in your browser/phone settings" });
      }
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Permission / subscribe toggle */}
      <Card className={`border-2 ${isSubscribed ? "border-emerald-200 dark:border-emerald-800" : "border-dashed"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isSubscribed ? "bg-emerald-50 dark:bg-emerald-950" : "bg-muted"
              }`}>
                {isSubscribed
                  ? <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  : <BellOff className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isSubscribed ? "Notifications active" : "Notifications off"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed
                    ? "You'll receive reminders even when app is closed"
                    : "Enable to get shift and clock-in reminders"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              onClick={handleSubscribeToggle}
              disabled={subLoading || permission === "unsupported"}
              className="shrink-0"
            >
              {subLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {isSubscribed ? "Turn off" : "Enable"}
            </Button>
          </div>

          {permission === "denied" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Notifications are blocked. Go to your browser/phone settings → ShiftTracker → Allow notifications.
              </p>
            </div>
          )}
          {permission === "unsupported" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Push notifications aren't supported in this browser. Install the app and open it from your home screen.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature 1: Shift day reminder */}
      <Card className={!isSubscribed ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            Shift Day Reminder
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Get reminded on specific days — e.g. every Wednesday at 9pm to check your shifts
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable shift reminders</Label>
            <Switch
              checked={settings.shift_reminder_enabled}
              onCheckedChange={v => setSettings(s => ({ ...s, shift_reminder_enabled: v }))}
            />
          </div>

          {settings.shift_reminder_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4 overflow-hidden"
            >
              {/* Day picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Which days?</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all ${
                        settings.shift_reminder_days.includes(day.value)
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> What time?
                </Label>
                <Input
                  type="time"
                  value={settings.shift_reminder_time}
                  onChange={e => setSettings(s => ({ ...s, shift_reminder_time: e.target.value }))}
                  className="w-32"
                />
              </div>

              {settings.shift_reminder_days.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    You'll get a notification every{" "}
                    {settings.shift_reminder_days
                      .sort()
                      .map(d => DAYS[d].label)
                      .join(", ")}{" "}
                    at {settings.shift_reminder_time} listing your shifts for that day.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Feature 2: Station clock-in/out reminders */}
      <Card className={!isSubscribed ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Train className="w-4 h-4 text-blue-500" />
            Station Clock-in / Clock-out
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Get buzzed before your station shift starts and before it ends
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">

          {/* Clock-in */}
          <div className="space-y-3 p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Clock-in reminder</p>
                <p className="text-xs text-muted-foreground">Buzz before shift starts</p>
              </div>
              <Switch
                checked={settings.station_clockin_enabled}
                onCheckedChange={v => setSettings(s => ({ ...s, station_clockin_enabled: v }))}
              />
            </div>
            {settings.station_clockin_enabled && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Remind me</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.station_clockin_offset}
                  onChange={e => setSettings(s => ({ ...s, station_clockin_offset: Number(e.target.value) }))}
                  className="w-16 text-center"
                />
                <Label className="text-xs text-muted-foreground shrink-0">minutes before</Label>
              </motion.div>
            )}
            {settings.station_clockin_enabled && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                e.g. If shift starts at 4:00pm → reminder at {
                  (() => {
                    const [h, m] = "16:00".split(":").map(Number);
                    const total = h * 60 + m - settings.station_clockin_offset;
                    return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
                  })()
                }
              </p>
            )}
          </div>

          {/* Clock-out */}
          <div className="space-y-3 p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Clock-out reminder</p>
                <p className="text-xs text-muted-foreground">Buzz before shift ends</p>
              </div>
              <Switch
                checked={settings.station_clockout_enabled}
                onCheckedChange={v => setSettings(s => ({ ...s, station_clockout_enabled: v }))}
              />
            </div>
            {settings.station_clockout_enabled && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Remind me</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.station_clockout_offset}
                  onChange={e => setSettings(s => ({ ...s, station_clockout_offset: Number(e.target.value) }))}
                  className="w-16 text-center"
                />
                <Label className="text-xs text-muted-foreground shrink-0">minutes before</Label>
              </motion.div>
            )}
            {settings.station_clockout_enabled && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                e.g. If shift ends at 9:15pm → reminder at {
                  (() => {
                    const [h, m] = "21:15".split(":").map(Number);
                    const total = h * 60 + m - settings.station_clockout_offset;
                    return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
                  })()
                }
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              💡 Set your clock-in and clock-out times when adding a station shift — we'll automatically schedule these reminders for that day.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={isSaving || !isSubscribed}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        {isSaving
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Save className="w-4 h-4" />}
        Save Notification Settings
      </motion.button>
    </div>
  );
}