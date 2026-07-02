"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Mail, Calendar, Hash, DollarSign, Download,
  LogOut, RefreshCw, Cloud, CloudOff, Pencil,
  Save, X, TrendingUp, Award, Flame, Star,
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
    <div className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${color}`}>
      <Icon className="w-4 h-4 opacity-70" />
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] opacity-70 font-medium text-center leading-tight">{label}</p>
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

      {/* ── Main stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="py-0 gap-0">
          <CardContent className="p-4 text-center">
            <Hash className="w-5 h-5 mx-auto text-muted-foreground mb-1.5" />
            <p className="text-3xl font-bold tabular-nums">{totalShifts}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Shifts</p>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1.5" />
            <AnimatedCurrency value={totalEarnings} className="text-3xl font-bold tabular-nums" duration={800} />
            <p className="text-xs text-muted-foreground mt-0.5">Total Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Personal records ── */}
      {records && totalShifts > 0 && (
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
                <p className="text-sm font-bold">{records.hallCount} 🎬</p>
                <p className="text-[10px] text-muted-foreground">Hall shifts</p>
              </div>
              <div>
                <p className="text-sm font-bold">{records.stationCount} 🚉</p>
                <p className="text-[10px] text-muted-foreground">Station shifts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Contact info ── */}
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

      {/* ── Actions ── */}
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
  );
}
