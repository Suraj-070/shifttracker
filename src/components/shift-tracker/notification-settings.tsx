"use client";

import React, { Component, ReactNode, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, Clock, Train, Calendar,
  AlertCircle, Loader2, Save, Plus, Trash2,
  MapPin, ChevronDown, ChevronUp, Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";

class NotifErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return (
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600">
        Could not load. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel.
      </div>
    );
    return this.props.children;
  }
}

const DAYS = [
  { label: "S", value: 0 }, { label: "M", value: 1 }, { label: "T", value: 2 },
  { label: "W", value: 3 }, { label: "T", value: 4 }, { label: "F", value: 5 },
  { label: "S", value: 6 },
];

interface StationReminder {
  id: string; station: string; clockin: string; clockout: string;
  offset: number; clockout_after_offset: number; enabled: boolean;
}

interface NotifSettings {
  hall_reminder_enabled: boolean; hall_reminder_days: number[];
  hall_reminder_time: string; hall_reminder_venue: string;
  station_reminders: StationReminder[];
}

const DEFAULT: NotifSettings = {
  hall_reminder_enabled: false, hall_reminder_days: [],
  hall_reminder_time: "21:00", hall_reminder_venue: "Eastgardens",
  station_reminders: [],
};

function newStation(): StationReminder {
  return { id: Math.random().toString(36).slice(2), station: "", clockin: "16:00", clockout: "21:15", offset: 5, clockout_after_offset: 10, enabled: true };
}

function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function subMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - mins);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function NotifPreview({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800">
      <span className="text-base shrink-0 mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-100">{title}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function StationCard({ reminder, idx, savedNames, onChange, onDelete }: {
  reminder: StationReminder; idx: number; savedNames: string[];
  onChange: (patch: Partial<StationReminder>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(!reminder.station);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }}
    >
      <div className={`rounded-2xl border-2 transition-colors ${
        reminder.enabled ? "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10" : "border-border/40 bg-muted/20"
      }`}>
        {/* Header row */}
        <div className="flex items-center gap-3 p-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${reminder.enabled ? "bg-blue-500" : "bg-muted"}`}>
            <Train className={`w-5 h-5 ${reminder.enabled ? "text-white" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{reminder.station || `Station ${idx + 1}`}</p>
            {reminder.station && (
              <p className="text-[11px] text-muted-foreground">{to12h(reminder.clockin)} → {to12h(reminder.clockout)}</p>
            )}
          </div>
          <Switch checked={reminder.enabled} onCheckedChange={v => onChange({ enabled: v })} />
          <button onClick={() => setExpanded(v => !v)}
            className="w-8 h-8 rounded-xl bg-background/60 flex items-center justify-center text-muted-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded body */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
              <div className="px-4 pb-4 pt-3 space-y-4 border-t border-blue-100 dark:border-blue-900">

                {/* Station name pills */}
                {savedNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {savedNames.map(name => (
                      <button key={name} onClick={() => onChange({ station: name })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          reminder.station === name ? "bg-blue-500 text-white" : "bg-background border border-border text-muted-foreground"
                        }`}>
                        {reminder.station === name && <Check className="w-3 h-3" />}
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                <Input value={reminder.station} onChange={e => onChange({ station: e.target.value })}
                  placeholder="Station name e.g. Central" className="rounded-xl" />

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Clock in</p>
                    <Input type="time" value={reminder.clockin} onChange={e => onChange({ clockin: e.target.value })}
                      className="rounded-xl text-center font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Clock out</p>
                    <Input type="time" value={reminder.clockout} onChange={e => onChange({ clockout: e.target.value })}
                      className="rounded-xl text-center font-semibold" />
                  </div>
                </div>

                {/* Offsets */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Remind before</p>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={60} value={reminder.offset}
                        onChange={e => onChange({ offset: Number(e.target.value) })}
                        className="rounded-xl text-center w-16 font-semibold" />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Check after</p>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={1} max={60} value={reminder.clockout_after_offset}
                        onChange={e => onChange({ clockout_after_offset: Number(e.target.value) })}
                        className="rounded-xl text-center w-16 font-semibold" />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {reminder.station && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notification preview</p>
                    <NotifPreview emoji="🚉" title={`Clock in at ${to12h(reminder.clockin)}`}
                      body={`${reminder.station} — ${reminder.offset} min until your shift starts`} />
                    <NotifPreview emoji="🚉" title={`Clock out at ${to12h(reminder.clockout)}`}
                      body={`${reminder.station} — ${reminder.offset} min until your shift ends`} />
                    <NotifPreview emoji="✅" title="Did you clock out?"
                      body={`${reminder.station} shift ended ${reminder.clockout_after_offset} min ago`} />
                    <p className="text-[10px] text-muted-foreground">
                      Fires at {subMins(reminder.clockin, reminder.offset)} · {subMins(reminder.clockout, reminder.offset)} · {addMins(reminder.clockout, reminder.clockout_after_offset)}
                    </p>
                  </div>
                )}

                {/* Delete */}
                <button onClick={onDelete}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 text-xs font-semibold active:scale-95 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Remove this reminder
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function NotificationSettingsInner({ savedStationNames = [] }: { savedStationNames?: string[] }) {
  const { showToast } = useAppToast();
  const { permission, isSubscribed, isLoading: subLoading, subscribe, unsubscribe } = usePushNotifications();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetch("/api/push/settings").then(r => r.json()).then(data => {
      if (data && !data.error) {
        setSettings({
          hall_reminder_enabled: data.hall_reminder_enabled ?? false,
          hall_reminder_days: data.hall_reminder_days ?? [],
          hall_reminder_time: data.hall_reminder_time ?? "21:00",
          hall_reminder_venue: data.hall_reminder_venue ?? "Eastgardens",
          station_reminders: (data.station_reminders ?? []).map((r: StationReminder) => ({
            ...r, clockout_after_offset: r.clockout_after_offset ?? 10,
          })),
        });
      }
    }).catch(() => {}).finally(() => setIsFetching(false));
  }, []);

  const saveSettings = useCallback(async (s: NotifSettings) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/push/settings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
      });
      if (res.ok) showToast({ type: "success", title: "Saved ✓" });
      else throw new Error();
    } catch { showToast({ type: "error", title: "Failed to save" }); }
    finally { setIsSaving(false); }
  }, [showToast]);

  const toggleDay = (day: number) =>
    setSettings(s => ({
      ...s, hall_reminder_days: s.hall_reminder_days.includes(day)
        ? s.hall_reminder_days.filter(d => d !== day)
        : [...s.hall_reminder_days, day],
    }));

  const updateStation = (id: string, patch: Partial<StationReminder>) =>
    setSettings(s => ({ ...s, station_reminders: s.station_reminders.map(r => r.id === id ? { ...r, ...patch } : r) }));

  // Auto-save on delete by computing new state and saving immediately
  const removeStation = (id: string) => {
    setSettings(prev => {
      const updated = { ...prev, station_reminders: prev.station_reminders.filter(r => r.id !== id) };
      fetch("/api/push/settings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated),
      }).then(() => showToast({ type: "success", title: "Reminder removed" })).catch(() => {});
      return updated;
    });
  };

  const addStation = () => setSettings(s => ({ ...s, station_reminders: [...s.station_reminders, newStation()] }));

  const handleToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) showToast({ type: "info", title: "Notifications disabled" });
    } else {
      const ok = await subscribe();
      if (ok) showToast({ type: "success", title: "Notifications enabled! 🔔" });
      else if (permission === "denied") showToast({ type: "error", title: "Blocked", description: "Allow in phone Settings" });
    }
  };

  if (isFetching) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5 pb-4">

      {/* Enable toggle */}
      <div className={`rounded-2xl p-4 border-2 transition-all ${
        isSubscribed ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10" : "border-dashed border-border"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isSubscribed ? "bg-emerald-500" : "bg-muted"}`}>
            {isSubscribed ? <Bell className="w-6 h-6 text-white" /> : <BellOff className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{isSubscribed ? "Notifications on" : "Notifications off"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSubscribed ? "Reminders fire even when app is closed" : "Tap to enable push notifications"}
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleToggle}
            disabled={subLoading || permission === "unsupported"}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isSubscribed ? "bg-background border border-border" : "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
            }`}>
            {subLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSubscribed ? "Disable" : "Enable"}
          </motion.button>
        </div>
        {permission === "denied" && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-600 dark:text-rose-400">Blocked. Go to Settings → Apps → Chrome → Notifications → Allow.</p>
          </div>
        )}
      </div>

      {/* Hall reminder */}
      <div className={!isSubscribed ? "opacity-40 pointer-events-none" : ""}>
        <div className="flex items-center gap-2 px-1 mb-3">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-sm font-bold">Hall Shift Reminder</p>
          <Switch checked={settings.hall_reminder_enabled}
            onCheckedChange={v => setSettings(s => ({ ...s, hall_reminder_enabled: v }))} className="ml-auto" />
        </div>

        <AnimatePresence>
          {settings.hall_reminder_enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={settings.hall_reminder_venue}
                  onChange={e => setSettings(s => ({ ...s, hall_reminder_venue: e.target.value }))}
                  placeholder="Venue e.g. Eastgardens" className="pl-9 rounded-xl" />
              </div>
              <div className="flex gap-1.5">
                {DAYS.map(day => (
                  <button key={day.value} onClick={() => toggleDay(day.value)}
                    className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all ${
                      settings.hall_reminder_days.includes(day.value) ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="time" value={settings.hall_reminder_time}
                  onChange={e => setSettings(s => ({ ...s, hall_reminder_time: e.target.value }))}
                  className="pl-9 rounded-xl" />
              </div>
              {settings.hall_reminder_days.length > 0 && (
                <NotifPreview emoji="🎬" title="ShiftTracker"
                  body={`Did you add your ${settings.hall_reminder_venue || "Eastgardens"} shifts today?`} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Station reminders */}
      <div className={!isSubscribed ? "opacity-40 pointer-events-none" : ""}>
        <div className="flex items-center gap-2 px-1 mb-3">
          <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
            <Train className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-bold">Station Reminders</p>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {settings.station_reminders.length}
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {settings.station_reminders.map((r, idx) => (
              <StationCard key={r.id} reminder={r} idx={idx} savedNames={savedStationNames}
                onChange={patch => updateStation(r.id, patch)}
                onDelete={() => removeStation(r.id)} />
            ))}
          </AnimatePresence>

          {settings.station_reminders.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Train className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">No station reminders yet</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">Add one below to get clock-in, clock-out and safety reminders</p>
            </div>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={addStation}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 text-blue-500 text-sm font-semibold active:bg-blue-50 dark:active:bg-blue-950/20 transition-colors">
            <Plus className="w-4 h-4" /> Add Station Reminder
          </motion.button>
        </div>
      </div>

      {/* Save */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => saveSettings(settings)}
        disabled={isSaving || !isSubscribed}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 shadow-lg shadow-primary/20">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
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
