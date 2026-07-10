"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Calendar, Hash, DollarSign, Download,
  LogOut, RefreshCw, Cloud, CloudOff, Pencil,
  Save, X, TrendingUp, Award, Flame, Star, Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCurrency } from "./animated-number";
import { ProfileSkeleton } from "./loading-skeleton";
import { signOut } from "next-auth/react";
import { SettingsTab } from "./settings-tab";
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

function StatBadge({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl ${color}`}>
      <Icon className="w-4 h-4 opacity-80" />
      <p className="text-base font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] opacity-60 font-semibold text-center leading-tight uppercase tracking-wide">{label}</p>
    </div>
  );
}

export function ProfileTab({
  profile,
  isLoading,
  onRefresh,
  totalShifts,
  totalEarnings,
  shifts = [],
}: ProfileTabProps) {
  const { showToast } = useAppToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profileSection, setProfileSection] = useState<"overview" | "records">("overview");
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "pending">("synced");

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || "");
      setEditUsername(profile.username || "");
    }
  }, [profile]);

  // ── Personal records ──────────────────────────────────────────────────────
  const records = useMemo(() => {
    if (!shifts.length) return null;

    // Best single shift
    const bestShift = [...shifts].sort((a, b) =>
      parseFloat(b.amountEarned) - parseFloat(a.amountEarned)
    )[0];

    // Best week
    const weekMap = new Map<string, number>();
    for (const s of shifts) {
      const d = new Date(s.shiftDate + "T00:00:00");
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weekMap.set(key, (weekMap.get(key) ?? 0) + parseFloat(s.amountEarned));
    }
    const bestWeek = Math.max(...weekMap.values());

    // Busiest day of week
    const dayCount = Array(7).fill(0);
    for (const s of shifts) {
      const d = new Date(s.shiftDate + "T00:00:00").getDay();
      dayCount[d]++;
    }
    const busiestDayIdx = dayCount.indexOf(Math.max(...dayCount));
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    // Hall vs station split
    const hallCount = shifts.filter(s => !isStationShift(s)).length;
    const stationCount = shifts.filter(isStationShift).length;

    // Current streak (consecutive weeks with shifts)
    const weeks = [...weekMap.keys()].sort().reverse();
    let streak = 0;
    let current = new Date();
    current.setDate(current.getDate() - current.getDay());
    for (const w of weeks) {
      const wDate = new Date(w);
      const diff = Math.round((current.getTime() - wDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (diff === streak) streak++;
      else break;
      current = wDate;
    }

    return {
      bestShift: parseFloat(bestShift.amountEarned),
      bestWeek,
      busiestDay: dayNames[busiestDayIdx],
      hallCount,
      stationCount,
      streak,
      avgPerShift: totalShifts > 0 ? totalEarnings / totalShifts : 0,
    };
  }, [shifts, totalShifts, totalEarnings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, username: editUsername }),
      });
      if (res.ok) {
        setIsEditing(false);
        onRefresh();
        showToast({ type: "success", title: "Profile updated" });
      }
    } catch {
      showToast({ type: "error", title: "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  }, [editName, editUsername, onRefresh, showToast]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
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
    } finally {
      setIsExporting(false);
    }
  }, [showToast]);

  const handleForceSync = useCallback(() => {
    setSyncStatus("pending");
    onRefresh();
    setTimeout(() => {
      setSyncStatus("synced");
      showToast({ type: "success", title: "Synced" });
    }, 1000);
  }, [showToast, onRefresh]);

  if (isLoading) return <ProfileSkeleton />;
  if (!profile) return (
    <div className="text-center py-12 text-muted-foreground">No profile data</div>
  );

  const initials = (profile.name || profile.username || "?")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const joinDate = profile.createdAt && !isNaN(new Date(profile.createdAt).getTime())
    ? new Date(profile.createdAt).toLocaleDateString("en-AU", { year: "numeric", month: "long" })
    : "Recently joined";

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">

      {/* Settings bottom sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-4 pb-2 pt-2 flex items-center justify-between">
                <h2 className="text-lg font-bold">Settings</h2>
                <button onClick={() => setShowSettings(false)}
                  className="text-muted-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4">
                <SettingsTab />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Section switcher ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        {(["overview", "records"] as const).map(s => (
          <button key={s} onClick={() => setProfileSection(s)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
              profileSection === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}>
            {s === "overview" ? "Overview" : "Records"}
          </button>
        ))}
      </div>

      {/* ── Gear button ── */}
      <div className="flex justify-end">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <Settings2 className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </div>

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-3 pt-4"
      >
        <div className="relative">
          <Avatar className="h-24 w-24 ring-4 ring-primary/20 shadow-xl">
            <AvatarImage src={profile.image || undefined} alt={profile.name || "User"} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {records && records.streak > 1 && (
            <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
              🔥
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="w-full space-y-3 max-w-xs">
            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" />
            <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Username" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 flex-1">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-bold">{profile.name || "No name set"}</h2>
            <p className="text-sm text-muted-foreground">@{profile.username || "unnamed"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Member since {joinDate}</p>
            <Button variant="ghost" size="sm" className="mt-1.5 gap-1.5 text-muted-foreground text-xs h-7"
              onClick={() => setIsEditing(true)}>
              <Pencil className="w-3 h-3" /> Edit Profile
            </Button>
          </div>
        )}

        <Badge variant="outline" className={`gap-1.5 ${
          syncStatus === "synced"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          {syncStatus === "synced" ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
          {syncStatus === "synced" ? "Synced" : "Syncing..."}
        </Badge>
      </motion.div>

      {/* ── Overview section ── */}
      {profileSection === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border/50 rounded-2xl p-4 text-center shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-muted mx-auto flex items-center justify-center mb-2">
                <Hash className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold tabular-nums">{totalShifts}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 uppercase tracking-wide">Total Shifts</p>
            </div>
            <div className="hero-gradient border border-primary/10 rounded-2xl p-4 text-center shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <AnimatedCurrency value={totalEarnings} className="text-3xl font-bold tabular-nums text-primary" duration={800} />
              <p className="text-xs text-primary/60 font-medium mt-0.5 uppercase tracking-wide">Total Earned</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{profile.email || "No email"}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Joined {joinDate}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={handleForceSync}>
                <RefreshCw className="w-4 h-4" /> Force Sync
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export CSV
              </Button>
              <Separator className="my-1" />
              <Button variant="outline"
                className="w-full justify-start gap-3 h-11 text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-800"
                onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Records section ── */}
      {profileSection === "records" && records && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold">Personal Records</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatBadge icon={Star} label="Best shift" value={formatCurrency(records.bestShift)}
                  color="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" />
                <StatBadge icon={TrendingUp} label="Best week" value={formatCurrency(records.bestWeek)}
                  color="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" />
                <StatBadge icon={Flame} label={`${records.streak}wk streak`} value={records.busiestDay.slice(0,3)}
                  color="bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400" />
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-sm font-bold">{formatCurrency(records.avgPerShift)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg / shift</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{records.hallCount} </p>
                  <p className="text-[10px] text-muted-foreground">Hall shifts</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{records.stationCount} </p>
                  <p className="text-[10px] text-muted-foreground">Station shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {totalShifts === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Add some shifts to see your records!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
