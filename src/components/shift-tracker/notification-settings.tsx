"use client";

import React, { Component, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, BellOff, Calendar, Check, ChevronDown, ChevronUp,
  Clock, AlertCircle, Loader2, MapPin, Plus, Save, MapPin, Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";

// ── Error boundary ────────────────────────────────────────────────────────────
class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) return (
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600">
        Could not load. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel.
      </div>
    );
    return this.props.children;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
const DAYS = ["S","M","T","W","T","F","S"];

interface StationReminder {
  id: string; station: string; clockin: string; clockout: string;
  offset: number; clockout_after_offset: number; enabled: boolean;
}
interface Settings {
  hall_reminder_enabled: boolean; hall_reminder_days: number[];
  hall_reminder_time: string; hall_reminder_venue: string;
  station_reminders: StationReminder[];
}
const DEFAULT: Settings = {
  hall_reminder_enabled: false, hall_reminder_days: [],
  hall_reminder_time: "21:00", hall_reminder_venue: "Eastgardens",
  station_reminders: [],
};
function newStation(): StationReminder {
  return { id: Math.random().toString(36).slice(2), station: "", clockin: "16:00", clockout: "21:15", offset: 5, clockout_after_offset: 10, enabled: true };
}
function addM(hhmm: string, m: number) {
  const [h, mm] = hhmm.split(":").map(Number);
  const t = h * 60 + mm + m;
  return `${String(Math.floor(t/60)%24).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
}
function subM(hhmm: string, m: number) {
  const [h, mm] = hhmm.split(":").map(Number);
  const t = Math.max(0, h * 60 + mm - m);
  return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
}
function to12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}

// ── Station card ──────────────────────────────────────────────────────────────
function StationCard({ r, idx, savedNames, onChange, onDelete }: {
  r: StationReminder; idx: number; savedNames: string[];
  onChange: (p: Partial<StationReminder>) => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(!r.station);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.15 }}>
      <div className={`rounded-2xl border-2 overflow-hidden transition-colors ${
        r.enabled ? "border-blue-200 dark:border-blue-800" : "border-border/40"
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.enabled ? "bg-blue-500" : "bg-muted"}`}>
            <MapPin className={`w-4 h-4 ${r.enabled ? "text-white" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{r.station || `Station ${idx+1}`}</p>
            {r.station && (
              <p className="text-[11px] text-muted-foreground">{to12(r.clockin)} → {to12(r.clockout)}</p>
            )}
          </div>
          <Switch checked={r.enabled} onCheckedChange={v => onChange({ enabled: v })} />
          <button onClick={() => setOpen(v => !v)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Body */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}
              exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border/30">

                {/* Station pills */}
                {savedNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {savedNames.map(n => (
                      <button key={n} onClick={() => onChange({ station: n })}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          r.station === n ? "bg-blue-500 text-white border-blue-500" : "border-border text-muted-foreground"
                        }`}>
                        {r.station === n && <Check className="w-3 h-3" />}{n}
                      </button>
                    ))}
                  </div>
                )}

                <Input value={r.station} onChange={e => onChange({ station: e.target.value })}
                  placeholder="e.g. Central, Redfern..." className="rounded-xl h-9 text-sm" />

                {/* Times grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Clock in</p>
                    <Input type="time" value={r.clockin} onChange={e => onChange({ clockin: e.target.value })}
                      className="rounded-xl h-9 text-sm text-center" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Clock out</p>
                    <Input type="time" value={r.clockout} onChange={e => onChange({ clockout: e.target.value })}
                      className="rounded-xl h-9 text-sm text-center" />
                  </div>
                </div>

                {/* Offsets */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Remind before</p>
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min={1} max={60} value={r.offset}
                        onChange={e => onChange({ offset: Number(e.target.value) })}
                        className="rounded-xl h-9 text-center w-16 text-sm" />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Check after</p>
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min={1} max={60} value={r.clockout_after_offset}
                        onChange={e => onChange({ clockout_after_offset: Number(e.target.value) })}
                        className="rounded-xl h-9 text-center w-16 text-sm" />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </div>
                </div>



                <button onClick={onDelete}
                  className="w-full py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
function Inner({ savedStationNames = [] }: { savedStationNames?: string[] }) {
  const { showToast } = useAppToast();
  const { permission, isSubscribed, isLoading: subLoading, subscribe, unsubscribe } = usePushNotifications();

  // Start with defaults immediately — no loading spinner
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [isSaving, setIsSaving] = useState(false);
  const loadedRef = useRef(false);

  // Load in background — UI is already interactive with defaults
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
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
              ...r, clockout_after_offset: r.clockout_after_offset ?? 10,
            })),
          });
        }
      })
      .catch(() => {});
  }, []);

  const save = useCallback(async (s: Settings) => {
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

  const toggleDay = (d: number) =>
    setSettings(s => ({
      ...s, hall_reminder_days: s.hall_reminder_days.includes(d)
        ? s.hall_reminder_days.filter(x => x !== d)
        : [...s.hall_reminder_days, d],
    }));

  const updateStation = (id: string, patch: Partial<StationReminder>) =>
    setSettings(s => ({ ...s, station_reminders: s.station_reminders.map(r => r.id === id ? { ...r, ...patch } : r) }));

  const removeStation = (id: string) => {
    setSettings(prev => {
      const updated = { ...prev, station_reminders: prev.station_reminders.filter(r => r.id !== id) };
      fetch("/api/push/settings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated),
      }).then(() => showToast({ type: "success", title: "Removed" })).catch(() => {});
      return updated;
    });
  };

  const handleToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) showToast({ type: "info", title: "Notifications disabled" });
    } else {
      const ok = await subscribe();
      if (ok) showToast({ type: "success", title: "Notifications enabled! 🔔" });
      else if (permission === "denied") showToast({ type: "error", title: "Blocked — allow in phone settings" });
    }
  };

  return (
    <div className="space-y-4 pb-4">

      {/* ── Enable card ── */}
      <div className={`rounded-2xl p-4 border-2 transition-all ${
        isSubscribed ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-dashed border-border"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isSubscribed ? "bg-emerald-500" : "bg-muted"}`}>
            {isSubscribed ? <Bell className="w-5 h-5 text-white" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{isSubscribed ? "Notifications on" : "Notifications off"}</p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed ? "Fires even when app is closed" : "Enable to receive reminders"}
            </p>
          </div>
          <button onClick={handleToggle} disabled={subLoading || permission === "unsupported"}
            className={`px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all ${
              isSubscribed ? "bg-muted border border-border" : "bg-emerald-500 text-white"
            }`}>
            {subLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSubscribed ? "Turn off" : "Enable"}
          </button>
        </div>
        {permission === "denied" && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-600 dark:text-rose-400">Blocked — Settings → Apps → Chrome → Notifications → Allow</p>
          </div>
        )}
      </div>

      <div className={!isSubscribed ? "opacity-40 pointer-events-none space-y-4" : "space-y-4"}>

        {/* ── Hall reminder ── */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Hall Shift Reminder</p>
              {settings.hall_reminder_enabled && settings.hall_reminder_days.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {settings.hall_reminder_days.map(d => DAYS[d]).join(" · ")} at {to12(settings.hall_reminder_time)}
                </p>
              )}
            </div>
            <Switch checked={settings.hall_reminder_enabled}
              onCheckedChange={v => setSettings(s => ({ ...s, hall_reminder_enabled: v }))} />
          </div>

          <AnimatePresence>
            {settings.hall_reminder_enabled && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}
                exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-3 border-t border-border/30">
                  {/* Venue */}
                  <div className="pt-3 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={settings.hall_reminder_venue}
                      onChange={e => setSettings(s => ({ ...s, hall_reminder_venue: e.target.value }))}
                      placeholder="Venue e.g. Eastgardens" className="pl-9 rounded-xl h-9 text-sm" />
                  </div>
                  {/* Day pills */}
                  <div className="flex gap-1.5">
                    {DAYS.map((d, i) => (
                      <button key={i} onClick={() => toggleDay(i)}
                        className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all ${
                          settings.hall_reminder_days.includes(i) ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                        }`}>{d}
                      </button>
                    ))}
                  </div>
                  {/* Time */}
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="time" value={settings.hall_reminder_time}
                      onChange={e => setSettings(s => ({ ...s, hall_reminder_time: e.target.value }))}
                      className="pl-9 rounded-xl h-9 text-sm" />
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Station reminders ── */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-bold">Station Reminders</p>
            <span className="ml-auto text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {settings.station_reminders.length}
            </span>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {settings.station_reminders.map((r, idx) => (
                <StationCard key={r.id} r={r} idx={idx} savedNames={savedStationNames}
                  onChange={p => updateStation(r.id, p)}
                  onDelete={() => removeStation(r.id)} />
              ))}
            </AnimatePresence>

            {settings.station_reminders.length === 0 && (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">No station reminders</p>
                <p className="text-xs text-muted-foreground">Tap below to add clock-in/out alerts</p>
              </div>
            )}

            <button onClick={() => setSettings(s => ({ ...s, station_reminders: [...s.station_reminders, newStation()] }))}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 text-blue-500 text-sm font-semibold active:bg-blue-50/50 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Station Reminder
            </button>
          </div>
        </div>

        {/* ── Save ── */}
        <button onClick={() => save(settings)} disabled={isSaving}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}

export function NotificationSettings(props: { savedStationNames?: string[] }) {
  return <Boundary><Inner {...props} /></Boundary>;
}
