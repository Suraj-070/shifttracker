"use client";

import React, { Component, ReactNode, useCallback, useEffect, useState } from "react";

class NotifErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return (
      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-400">
        Could not load notification settings. Check that NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in Vercel.
      </div>
    );
    return this.props.children;
  }
}

import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, Clock, Train, Calendar,
  CheckCircle2, AlertCircle, Loader2, Save,
  Plus, Trash2, MapPin,
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

interface StationReminder {
  id: string;
  station: string;
  clockin: string;      // HH:MM
  clockout: string;     // HH:MM
  offset: number;       // minutes before (for both clockin and clockout)
  clockout_after_offset: number; // minutes AFTER clockout (safety net)
  enabled: boolean;
}

interface NotifSettings {
  // Hall
  hall_reminder_enabled: boolean;
  hall_reminder_days: number[];
  hall_reminder_time: string;
  hall_reminder_venue: string;
  // Station
  station_reminders: StationReminder[];
}

const DEFAULT: NotifSettings = {
  hall_reminder_enabled: false,
  hall_reminder_days: [],
  hall_reminder_time: "21:00",
  hall_reminder_venue: "Eastgardens",
  station_reminders: [],
};

function newStationReminder(): StationReminder {
  return {
    id: Math.random().toString(36).slice(2),
    station: "",
    clockin: "16:00",
    clockout: "21:15",
    offset: 5,
    clockout_after_offset: 10,
    enabled: true,
  };
}

function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function subtractMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - mins);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function NotificationSettingsInner({ savedStationNames = [] }: { savedStationNames?: string[] }) {
  const { showToast } = useAppToast();
  const { permission, isSubscribed, isLoading: subLoading, subscribe, unsubscribe } = usePushNotifications();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetch("/api/push/settings")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setSettings({
            hall_reminder_enabled: data.hall_reminder_enabled ?? false,
            hall_reminder_days: data.hall_reminder_days ?? [],
            hall_reminder_time: data.hall_reminder_time ?? "21:00",
            hall_reminder_venue: data.hall_reminder_venue ?? "Eastgardens",
            station_reminders: (data.station_reminders ?? []).map((r: StationReminder) => ({
              ...r,
              clockout_after_offset: r.clockout_after_offset ?? 10,
            })),
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, []);

  const toggleDay = (day: number) =>
    setSettings(s => ({
      ...s,
      hall_reminder_days: s.hall_reminder_days.includes(day)
        ? s.hall_reminder_days.filter(d => d !== day)
        : [...s.hall_reminder_days, day],
    }));

  const updateStation = (id: string, patch: Partial<StationReminder>) =>
    setSettings(s => ({
      ...s,
      station_reminders: s.station_reminders.map(r => r.id === id ? { ...r, ...patch } : r),
    }));

  const removeStation = (id: string) =>
    setSettings(s => ({
      ...s,
      station_reminders: s.station_reminders.filter(r => r.id !== id),
    }));

  const addStation = () =>
    setSettings(s => ({
      ...s,
      station_reminders: [...s.station_reminders, newStationReminder()],
    }));

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
      if (res.ok) showToast({ type: "success", title: "Notification settings saved ✓" });
      else throw new Error();
    } catch {
      showToast({ type: "error", title: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  }, [settings, isSubscribed, showToast]);

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) showToast({ type: "info", title: "Notifications disabled" });
    } else {
      const ok = await subscribe();
      if (ok) showToast({ type: "success", title: "Notifications enabled! 🔔" });
      else if (permission === "denied")
        showToast({ type: "error", title: "Blocked", description: "Allow in phone settings → ShiftTracker" });
    }
  };

  if (isFetching) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Enable/disable notifications ── */}
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
                    ? "Reminders work even when app is closed"
                    : "Enable to get shift & clock-in reminders"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              onClick={handleToggleSubscription}
              disabled={subLoading || permission === "unsupported"}
              className="shrink-0"
            >
              {subLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {isSubscribed ? "Turn off" : "Enable"}
            </Button>
          </div>

          {permission === "denied" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Blocked by your phone. Go to Settings → Apps → Chrome/ShiftTracker → Notifications → Allow.
              </p>
            </div>
          )}
          {permission === "unsupported" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Install the app from your home screen first, then enable notifications.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Feature 1: Hall shift logging reminder ── */}
      <Card className={!isSubscribed ? "opacity-40 pointer-events-none" : ""}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            Hall Shift Reminder
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Reminds you to log your shifts on specific days
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable</Label>
            <Switch
              checked={settings.hall_reminder_enabled}
              onCheckedChange={v => setSettings(s => ({ ...s, hall_reminder_enabled: v }))}
            />
          </div>

          <AnimatePresence>
            {settings.hall_reminder_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Venue name */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Venue name
                  </Label>
                  <Input
                    value={settings.hall_reminder_venue}
                    onChange={e => setSettings(s => ({ ...s, hall_reminder_venue: e.target.value }))}
                    placeholder="e.g. Eastgardens"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Notification will say: "Did you add your {settings.hall_reminder_venue || "..."} shifts today? 🎬"
                  </p>
                </div>

                {/* Days */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Which days?</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map(day => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all ${
                          settings.hall_reminder_days.includes(day.value)
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> What time?
                  </Label>
                  <Input
                    type="time"
                    value={settings.hall_reminder_time}
                    onChange={e => setSettings(s => ({ ...s, hall_reminder_time: e.target.value }))}
                    className="w-32"
                  />
                </div>

                {/* Preview */}
                {settings.hall_reminder_days.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 space-y-1">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Preview notification:
                    </p>
                    <div className="flex items-start gap-2 mt-1">
                      <span className="text-base">🔔</span>
                      <div>
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">ShiftTracker</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                          Did you add your {settings.hall_reminder_venue || "Eastgardens"} shifts today? 🎬
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500 mt-1">
                      Fires every {settings.hall_reminder_days.sort().map(d => DAYS[d].label).join(", ")} at {settings.hall_reminder_time}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* ── Feature 2: Station clock-in/out reminders ── */}
      <Card className={!isSubscribed ? "opacity-40 pointer-events-none" : ""}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Train className="w-4 h-4 text-blue-500" />
            Station Clock-in / Clock-out
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Get buzzed before your shift starts and before it ends. Add one entry per station.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">

          {settings.station_reminders.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              No stations added yet. Tap + to add one.
            </p>
          )}

          {settings.station_reminders.map((reminder, idx) => (
            <div key={reminder.id} className="border border-blue-100 dark:border-blue-900 rounded-2xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Station {idx + 1}
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={reminder.enabled}
                    onCheckedChange={v => updateStation(reminder.id, { enabled: v })}
                  />
                  <button onClick={() => removeStation(reminder.id)}
                    className="text-muted-foreground hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Station name */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Station name</Label>
                {savedStationNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {savedStationNames.map(name => (
                      <button
                        key={name}
                        onClick={() => updateStation(reminder.id, { station: name })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          reminder.station === name
                            ? "bg-blue-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-blue-100 dark:hover:bg-blue-950"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <Input
                  value={reminder.station}
                  onChange={e => updateStation(reminder.id, { station: e.target.value })}
                  placeholder="e.g. Central, Redfern..."
                  className="mt-1.5"
                />
              </div>

              {/* Clock-in / Clock-out times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Clock-in time</Label>
                  <Input
                    type="time"
                    value={reminder.clockin}
                    onChange={e => updateStation(reminder.id, { clockin: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Clock-out time</Label>
                  <Input
                    type="time"
                    value={reminder.clockout}
                    onChange={e => updateStation(reminder.id, { clockout: e.target.value })}
                  />
                </div>
              </div>

              {/* Before offset */}
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Remind me</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={reminder.offset}
                  onChange={e => updateStation(reminder.id, { offset: Number(e.target.value) })}
                  className="w-16 text-center"
                />
                <Label className="text-xs text-muted-foreground shrink-0">min before shift</Label>
              </div>

              {/* After offset — clockout safety net */}
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Check after</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={reminder.clockout_after_offset ?? 10}
                  onChange={e => updateStation(reminder.id, { clockout_after_offset: Number(e.target.value) })}
                  className="w-16 text-center"
                />
                <Label className="text-xs text-muted-foreground shrink-0">min after shift ends</Label>
              </div>

              {/* Preview */}
              {reminder.station && reminder.enabled && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 space-y-1.5">
                  <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">Preview:</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      🚉 Clock in at {reminder.clockin} — reminder at{" "}
                      <strong>{subtractMins(reminder.clockin, reminder.offset)}</strong>
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      🚉 Clock out at {reminder.clockout} — reminder at{" "}
                      <strong>{subtractMins(reminder.clockout, reminder.offset)}</strong>
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      ✅ "Did you clock out?" check at{" "}
                      <strong>{addMins(reminder.clockout, reminder.clockout_after_offset ?? 10)}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add station button */}
          <button
            onClick={addStation}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Station Reminder
          </button>
        </CardContent>
      </Card>

      {/* Save */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={isSaving || !isSubscribed}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 shadow-lg"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Notification Settings
      </motion.button>
    </div>
  );
}

export function NotificationSettings(props: { savedStationNames?: string[] }) {
  return (
    <NotifErrorBoundary>
      <NotificationSettingsInner {...props} />
    </NotifErrorBoundary>
  );
}
