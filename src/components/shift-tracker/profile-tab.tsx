"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Calendar, DollarSign, Download,
  LogOut, RefreshCw, Pencil, Save, X,
  TrendingUp, Award, Flame, Star, Settings2, Bell,
  ChevronRight, Hash,
} from "lucide-react";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCurrency } from "./animated-number";
import { ProfileSkeleton } from "./loading-skeleton";
import { signOut } from "next-auth/react";
import { SettingsTab } from "./settings-tab";
import { RemindersTab } from "./reminders-tab";
import { isStationShift } from "@/types/database.types";
import type { Shift, UserProfile } from "@/types/database.types";

interface ProfileTabProps {
  profile: UserProfile | null;
  isLoading: boolean;
  onRefresh: () => void;
  totalShifts: number;
  totalEarnings: number;
  shifts?: Shift[];
}

function ProfileTab({ profile, isLoading, onRefresh, totalShifts, totalEarnings, shifts = [] }: ProfileTabProps) {
  const { showToast } = useAppToast();
  const [isEditing,   setIsEditing]   = useState(false);
  const [showSettings,setShowSettings]= useState(false);
  const [showReminders,setShowReminders]=useState(false);
  const [section,     setSection]     = useState<"overview"|"records">("overview");
  const [editName,    setEditName]    = useState("");
  const [editUsername,setEditUsername]= useState("");
  const [isSaving,    setIsSaving]    = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (profile) { setEditName(profile.name||""); setEditUsername(profile.username||""); }
  }, [profile]);

  const records = useMemo(() => {
    if (!shifts.length) return null;
    const hall    = shifts.filter(s => !isStationShift(s));
    const station = shifts.filter(s => isStationShift(s));
    const amounts = hall.map(s => parseFloat(s.amountEarned));
    const bestShift = Math.max(...amounts, 0);
    const weeks: Record<string, number> = {};
    for (const s of hall) {
      const d = new Date(s.shiftDate + "T00:00:00");
      const mon = new Date(d); mon.setDate(d.getDate() - d.getDay() + 1);
      const wk = mon.toISOString().slice(0,10);
      weeks[wk] = (weeks[wk]||0) + parseFloat(s.amountEarned);
    }
    const bestWeek = Math.max(...Object.values(weeks), 0);
    const days: Record<string,number> = {};
    for (const s of hall) {
      const dy = s.shiftDay||"";
      days[dy] = (days[dy]||0) + 1;
    }
    const busiestDay = Object.entries(days).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
    const avgPerShift = hall.length ? (hall.reduce((s,sh)=>s+parseFloat(sh.amountEarned),0)/hall.length) : 0;
    const sortedWeeks = Object.entries(weeks).sort(([a],[b])=>a.localeCompare(b));
    let streak = 0, maxStreak = 0, cur = 0;
    for (let i=0;i<sortedWeeks.length;i++) {
      if (sortedWeeks[i][1] > 0) { cur++; maxStreak = Math.max(maxStreak, cur); } else cur=0;
    }
    return { bestShift, bestWeek, busiestDay, avgPerShift, streak: maxStreak, hallCount: hall.length, stationCount: station.length };
  }, [shifts]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, username: editUsername }) });
      if (res.ok) { showToast({ type: "success", title: "Profile updated" }); setIsEditing(false); onRefresh(); }
      else showToast({ type: "error", title: "Failed to save" });
    } catch { showToast({ type: "error", title: "Failed to save" }); }
    finally { setIsSaving(false); }
  }, [editName, editUsername, showToast, onRefresh]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/shifts/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "shifts.csv"; a.click();
        URL.revokeObjectURL(url);
        showToast({ type: "success", title: "Shifts exported!" });
      }
    } catch { showToast({ type: "error", title: "Export failed" }); }
    finally { setIsExporting(false); }
  }, [showToast]);

  if (isLoading) return <ProfileSkeleton />;
  if (!profile) return <div className="text-center py-12 text-muted-foreground">No profile data</div>;

  const initials = (profile.name||profile.username||"?").split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2);
  const joinDate = profile.createdAt && !isNaN(new Date(profile.createdAt).getTime())
    ? new Date(profile.createdAt).toLocaleDateString("en-AU", { year: "numeric", month: "long" })
    : "Recently joined";

  return (
    <div className="space-y-5 pb-8">

      {/* ── Reminders sheet ── */}
      <div className={`fixed inset-0 z-50 ${showReminders ? "" : "pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          style={{ opacity: showReminders ? 1 : 0 }} onClick={() => setShowReminders(false)} />
        <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl overflow-y-auto max-h-[90dvh]"
          style={{ transform: showReminders ? "translateY(0)" : "translateY(100%)", transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full bg-muted-foreground/25" /></div>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
            <h2 className="text-lg font-black">Reminders</h2>
            <button onClick={() => setShowReminders(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4"><RemindersTab savedStationNames={[]} /></div>
        </div>
      </div>

      {/* ── Settings sheet ── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[90dvh] overflow-y-auto"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
              <div className="flex justify-center pt-3"><div className="w-10 h-1 rounded-full bg-muted-foreground/25" /></div>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                <h2 className="text-lg font-black">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform"><X className="w-4 h-4" /></button>
              </div>
              <div className="px-4 pb-4"><SettingsTab /></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Profile hero ── */}
      <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.55 0.15 162), oklch(0.42 0.13 162))" }}>
        {/* Decorative circles */}
        <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/10" style={{ transform: "translate(30%,-30%)" }} />
        <div className="absolute left-0 bottom-0 w-24 h-24 rounded-full bg-white/5" style={{ transform: "translate(-30%,30%)" }} />

        {/* Top row — action buttons */}
        <div className="flex justify-end gap-2 p-4 relative">
          <button onClick={() => setShowReminders(true)} aria-label="Reminders"
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
            <Bell className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setShowSettings(true)} aria-label="Settings"
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
            <Settings2 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center pb-6 px-4 relative">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30 shadow-xl overflow-hidden">
              {profile.image
                ? <img src={profile.image} alt={profile.name||"User"} className="w-full h-full object-cover" />
                : <span className="text-3xl font-black text-white">{initials}</span>
              }
            </div>
            {records && records.streak > 1 && (
              <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-lg">🔥</div>
            )}
          </div>

          {isEditing ? (
            <div className="w-full max-w-xs space-y-2">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name"
                className="w-full h-10 px-3.5 rounded-xl bg-white/20 text-white placeholder-white/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm" />
              <input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Username"
                className="w-full h-10 px-3.5 rounded-xl bg-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm" />
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white text-primary text-sm font-bold active:scale-95 transition-transform disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold active:scale-95 transition-transform">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-2xl font-black text-white tracking-tight">{profile.name||"No name"}</h1>
              <p className="text-white/60 text-sm mt-0.5">@{profile.username||"unnamed"}</p>
              <p className="text-white/40 text-xs mt-0.5">Since {joinDate}</p>
              <button onClick={() => setIsEditing(true)}
                className="mt-3 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold active:scale-95 transition-transform mx-auto">
                <Pencil className="w-3 h-3" /> Edit profile
              </button>
            </div>
          )}
        </div>

        {/* Stats strip inside hero */}
        <div className="grid grid-cols-2 border-t border-white/15 divide-x divide-white/15">
          <div className="flex flex-col items-center py-4">
            <p className="text-2xl font-black text-white tabular-nums">{totalShifts}</p>
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mt-0.5">Shifts</p>
          </div>
          <div className="flex flex-col items-center py-4">
            <AnimatedCurrency value={totalEarnings} className="text-2xl font-black text-white tabular-nums" duration={800} />
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mt-0.5">Earned</p>
          </div>
        </div>
      </div>

      {/* ── Section pill ── */}
      <div className="flex gap-0.5 p-1 bg-muted/80 rounded-2xl">
        {(["overview","records"] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 capitalize ${
              section === s ? "bg-white dark:bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}>
            {s === "overview" ? "Overview" : "Records"}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {section === "overview" && (
        <div className="space-y-3">
          {/* Info rows */}
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/40">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm truncate text-muted-foreground">{profile.email||"No email"}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Joined {joinDate}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/40">
            {[
              {
                icon: RefreshCw, label: "Force sync", desc: "Refresh all data",
                onClick: () => { onRefresh(); showToast({ type: "info", title: "Refreshing…" }); },
                color: "text-foreground"
              },
              {
                icon: Download, label: isExporting ? "Exporting…" : "Export CSV",
                desc: "Download all shifts",
                onClick: handleExport, color: "text-foreground",
                loading: isExporting
              },
            ].map(({ icon: Icon, label, desc, onClick, color, loading }) => (
              <button key={label} onClick={onClick}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors text-left">
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${color} ${loading ? "animate-spin" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${color}`}>{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </button>
            ))}
          </div>

          {/* Sign out — separate card, danger */}
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 active:bg-rose-100 transition-colors text-left">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Sign Out</p>
          </button>
        </div>
      )}

      {/* ── Records ── */}
      {section === "records" && (
        <div className="space-y-3">
          {!records ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-4xl">📊</span>
              <p className="text-sm text-muted-foreground">Add some shifts to see your records</p>
            </div>
          ) : (
            <>
              {/* Trophy cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Star,      label: "Best shift", value: formatCurrency(records.bestShift),  bg: "bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-700 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-900/50" },
                  { icon: TrendingUp,label: "Best week",  value: formatCurrency(records.bestWeek),   bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/50" },
                  { icon: Flame,     label: "Streak",     value: `${records.streak}wk`,              bg: "bg-orange-50 dark:bg-orange-950/30",  text: "text-orange-700 dark:text-orange-400", iconBg: "bg-orange-100 dark:bg-orange-900/50" },
                ].map(({ icon: Icon, label, value, bg, text, iconBg }) => (
                  <div key={label} className={`rounded-2xl p-3 ${bg} flex flex-col items-center gap-2`}>
                    <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${text}`} />
                    </div>
                    <p className={`text-sm font-black tabular-nums ${text}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/40">
                {[
                  { icon: DollarSign, label: "Avg per shift",   value: formatCurrency(records.avgPerShift) },
                  { icon: Hash,       label: "Hall shifts",      value: String(records.hallCount) },
                  { icon: Hash,       label: "Station shifts",   value: String(records.stationCount) },
                  { icon: Calendar,   label: "Busiest day",      value: records.busiestDay },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">{label}</p>
                    <p className="text-sm font-bold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ProfileTab);
export { ProfileTab };
