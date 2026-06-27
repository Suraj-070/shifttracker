"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  User,
  Settings,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

import { DashboardTab } from "@/components/shift-tracker/dashboard-tab";
import { ShiftsTab } from "@/components/shift-tracker/shifts-tab";
import { AnalyticsTab } from "@/components/shift-tracker/analytics-tab";
import { ProfileTab } from "@/components/shift-tracker/profile-tab";
import { SettingsTab } from "@/components/shift-tracker/settings-tab";
import { AddShiftDialog } from "@/components/shift-tracker/add-shift-dialog";
import { EditShiftDialog } from "@/components/shift-tracker/edit-shift-dialog";
import { DeleteShiftDialog } from "@/components/shift-tracker/delete-shift-dialog";
import { GlassmorphismNav } from "@/components/shift-tracker/glassmorphism-nav";

import { useHaptics } from "@/hooks/use-haptics";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  isStationShift,
} from "@/types/database.types";
import type {
  Shift,
  ShiftStatus,
  AnalyticsSummary,
  MonthlyEarning,
  ShiftCreateInput,
  UserProfile,
} from "@/types/database.types";

// ============================================================
// Tab Navigation
// ============================================================
type TabKey = "dashboard" | "shifts" | "analytics" | "profile" | "settings";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "shifts", label: "Shifts", icon: CalendarDays },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "profile", label: "Profile", icon: User },
  { key: "settings", label: "Settings", icon: Settings },
];

// ============================================================
// Main Page Component
// ============================================================
export default function ShiftTrackerPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const haptics = useHaptics();
  const { status } = useSession();
  const router = useRouter();

  // redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  // ── Android back button — intercept to navigate tabs ───────
  // Push a history entry whenever we move away from dashboard.
  // On back press, popstate fires → we go back to dashboard.
  const navigateTab = useCallback((key: TabKey) => {
    if (key === "dashboard") {
      // Always set tab immediately — history.back() may not fire popstate
      // if there's no history entry (e.g. fresh app open)
      setActiveTab("dashboard");
      if (window.history.state?.shiftTrackerTab) {
        window.history.back();
      }
    } else {
      window.history.pushState({ shiftTrackerTab: key }, "");
      setActiveTab(key);
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Back was pressed — always go to dashboard
      setActiveTab("dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Redirect away from analytics on mobile
  useEffect(() => {
    if (isMobile && activeTab === "analytics") {
      navigateTab("dashboard");
    }
  }, [isMobile, activeTab, navigateTab]);

  // Data state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addShiftDefaults, setAddShiftDefaults] = useState<{
    person?: string;
    location?: string;
  }>({});

  // Fetch shifts
  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (res.ok) {
        setShifts(data.shifts);
        setUserId(data.userId);
      }
    } catch (err) {
      console.error("Failed to fetch shifts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchShifts();
      fetchProfile();
    }
  }, [status, fetchShifts, fetchProfile]);

  // Toggle shift status
  const toggleStatus = useCallback(
    async (shift: Shift) => {
      const newStatus: ShiftStatus =
        shift.status === "Paid" ? "Unpaid" : "Paid";
      haptics(8);
      setShifts((prev) =>
        prev.map((s) => (s.id === shift.id ? { ...s, status: newStatus } : s)),
      );
      try {
        const res = await fetch(`/api/shifts/${shift.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          setShifts((prev) =>
            prev.map((s) =>
              s.id === shift.id ? { ...s, status: shift.status } : s,
            ),
          );
          toast({
            title: "Error",
            description: "Failed to update status",
            variant: "destructive",
          });
        }
      } catch {
        setShifts((prev) =>
          prev.map((s) =>
            s.id === shift.id ? { ...s, status: shift.status } : s,
          ),
        );
      }
    },
    [toast],
  );

  // Add shift
  const handleAddShift = useCallback(
    async (input: ShiftCreateInput) => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, userId }),
        });
        if (res.ok) {
          const data = await res.json();
          setShifts((prev) => [data.shift, ...prev]);
          setAddDialogOpen(false);
          haptics(15);
          toast({
            title: "Shift added!",
            description: isStationShift(data.shift)
              ? `Station: ${data.shift.coveringFor}`
              : `${input.coveringFor} @ ${input.locationName}`,
          });
          await fetchProfile();
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to add shift",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, toast, fetchProfile],
  );

  // Edit shift
  const handleEditShift = useCallback(
    async (id: string, data: Partial<ShiftCreateInput>) => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/shifts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const result = await res.json();
          setShifts((prev) =>
            prev.map((s) => (s.id === id ? result.shift : s)),
          );
          setEditDialogOpen(false);
          setShiftToEdit(null);
          toast({
            title: "Shift updated!",
            description: "Changes saved successfully.",
          });
          await fetchProfile();
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to update shift",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [toast, fetchProfile],
  );

  // Delete shift
  const handleDeleteShift = useCallback(async () => {
    if (!shiftToDelete) return;
    try {
      const res = await fetch(`/api/shifts/${shiftToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setShifts((prev) => prev.filter((s) => s.id !== shiftToDelete.id));
        haptics(20);
        toast({ title: "Shift deleted", description: "The shift has been removed." });
        await fetchProfile();
      } else {
        const data = await res.json().catch(() => null);
        toast({
          title: "Couldn't delete shift",
          description: data?.error ?? `Server responded with ${res.status}.`,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete shift", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setShiftToDelete(null);
    }
  }, [shiftToDelete, toast, fetchProfile]);

  // Bulk paid
  const handleBulkPaid = useCallback(async (ids: string[]) => {
    try {
      const res = await fetch("/api/shifts/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "Paid" }),
      });
      if (res.ok) {
        setShifts((prev) =>
          prev.map((s) => ids.includes(s.id) ? { ...s, status: "Paid" as const } : s)
        );
        toast({ title: `${ids.length} shift${ids.length !== 1 ? "s" : ""} marked as Paid` });
        await fetchProfile();
      } else {
        toast({ title: "Failed to bulk update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to bulk update shifts", variant: "destructive" });
    }
  }, [toast, fetchProfile]);

  const handlePullRefresh = useCallback(async () => {
    haptics(10);
    await fetchShifts();
    await fetchProfile();
  }, [haptics, fetchShifts, fetchProfile]);

  const { isPulling, isRefreshing, pullProgress } = usePullToRefresh(handlePullRefresh);

  // ── Split shifts: hall vs station ──────────────────────────
  const hallShifts = useMemo(
    () => shifts.filter((s) => !isStationShift(s)),
    [shifts],
  );
  const stationShifts = useMemo(
    () => shifts.filter(isStationShift),
    [shifts],
  );

  // ── Computed values (hall shifts only) ─────────────────────
  const summary = useMemo<AnalyticsSummary>(() => {
    const totalEarned = hallShifts.reduce(
      (s, sh) => s + parseFloat(sh.amountEarned),
      0,
    );
    const paidShifts = hallShifts.filter((s) => s.status === "Paid");
    const unpaidShifts = hallShifts.filter((s) => s.status === "Unpaid");
    return {
      totalEarned,
      totalPaid: paidShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned), 0),
      totalUnpaid: unpaidShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned), 0),
      totalShifts: hallShifts.length,
      paidShifts: paidShifts.length,
      unpaidShifts: unpaidShifts.length,
      averagePerShift: hallShifts.length > 0 ? totalEarned / hallShifts.length : 0,
    };
  }, [hallShifts]);

  const monthlyEarnings = useMemo<MonthlyEarning[]>(() => {
    const map = new Map<
      string,
      { earned: number; paid: number; unpaid: number; shiftCount: number }
    >();
    // analytics uses hall shifts only
    for (const s of hallShifts) {
      const d = new Date(s.shiftDate + "T00:00:00");
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = map.get(monthKey) ?? {
        earned: 0,
        paid: 0,
        unpaid: 0,
        shiftCount: 0,
      };
      const amount = parseFloat(s.amountEarned);
      existing.earned += amount;
      existing.shiftCount++;
      if (s.status === "Paid") existing.paid += amount;
      else existing.unpaid += amount;
      map.set(monthKey, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split("-");
        const monthLabel = new Date(
          parseInt(year),
          parseInt(month) - 1,
        ).toLocaleDateString("en-US", { year: "numeric", month: "long" });
        return { monthKey, monthLabel, ...data };
      });
  }, [hallShifts]);

  const recentShifts = useMemo(
    () =>
      [...hallShifts]
        .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))
        .slice(0, 5),
    [hallShifts],
  );

  // show spinner while session loads
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // prevent flash while redirecting
  if (status === "unauthenticated") return null;

  if (!isLoading && shifts.length === 0) {
    return (
      <>
        <div className="min-h-screen flex flex-col bg-background">
          <main className="flex-1 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <CalendarDays className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">
                No shifts yet
              </h2>
              <p className="text-muted-foreground mb-8">
                Start tracking your shifts, who you covered for, and what you
                were paid.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => setAddDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Your First Shift
                </Button>
              </div>
            </motion.div>
          </main>
          <AddShiftDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSubmit={handleAddShift}
            isSubmitting={isSubmitting}
            shifts={shifts}
          />
          <footer className="hidden md:block border-t py-4 text-center text-xs text-muted-foreground">
            Shift & Payment Tracker
          </footer>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-lg tracking-tight">
                  ShiftTracker
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Shift
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Desktop Tab Nav */}
        {!isMobile && (
          <nav className="border-b bg-background/80 backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-1 h-10 overflow-x-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => navigateTab(tab.key as TabKey)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 pb-28 md:py-6 md:pb-6">
          {/* Pull to refresh indicator */}
          {isMobile && (isPulling || isRefreshing) && (
            <div className="flex items-center justify-center py-3 mb-2">
              <div
                className={`w-6 h-6 rounded-full border-2 border-primary border-t-transparent transition-all ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                style={{ opacity: isRefreshing ? 1 : pullProgress, transform: `scale(${0.5 + pullProgress * 0.5})` }}
              />
            </div>
          )}
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardTab
                  summary={summary}
                  recentShifts={recentShifts}
                  stationShifts={stationShifts}
                  isLoading={isLoading}
                  onToggleStatus={toggleStatus}
                  onAddShift={() => setAddDialogOpen(true)}
                  onViewAllShifts={() => navigateTab("shifts")}
                />
              </motion.div>
            )}
            {activeTab === "shifts" && (
              <motion.div
                key="shifts"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ShiftsTab
                  shifts={shifts}
                  isLoading={isLoading}
                  onToggleStatus={toggleStatus}
                  onBulkPaid={handleBulkPaid}
                  onDeleteShift={(shift) => {
                    setShiftToDelete(shift);
                    setDeleteDialogOpen(true);
                  }}
                  onEditShift={(shift) => {
                    setShiftToEdit(shift);
                    setEditDialogOpen(true);
                  }}
                  onAddShift={(person, location) => {
                    setAddShiftDefaults({ person, location });
                    setAddDialogOpen(true);
                  }}
                />
              </motion.div>
            )}
            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AnalyticsTab
                  summary={summary}
                  monthlyEarnings={monthlyEarnings}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileTab
                  profile={profile}
                  isLoading={isLoading}
                  onRefresh={fetchProfile}
                  totalShifts={summary.totalShifts}
                  totalEarnings={summary.totalEarned}
                />
              </motion.div>
            )}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsTab />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        {isMobile && (
          <GlassmorphismNav
            tabs={TABS.filter((t) => t.key !== "analytics").map((t) => ({
              ...t,
              badge: t.key === "shifts"
                ? shifts.filter((s) => s.status === "Unpaid").length
                : undefined,
            }))}
            activeTab={activeTab}
            onTabChange={(key) => navigateTab(key as TabKey)}
          />
        )}

        {/* Dialogs */}
        <AddShiftDialog
          open={addDialogOpen}
          onOpenChange={(v) => {
            setAddDialogOpen(v);
            if (!v) setAddShiftDefaults({});
          }}
          onSubmit={handleAddShift}
          isSubmitting={isSubmitting}
          shifts={shifts}
          defaultPerson={addShiftDefaults.person}
          defaultLocation={addShiftDefaults.location}
        />
        <EditShiftDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          shift={shiftToEdit}
          shifts={shifts}
          onSave={handleEditShift}
          isSubmitting={isSubmitting}
        />
        <DeleteShiftDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          shift={shiftToDelete}
          onConfirm={handleDeleteShift}
        />

        {/* Footer */}
        <footer className="hidden md:block border-t py-4 text-center text-xs text-muted-foreground mt-auto">
          Shift & Payment Tracker — Built with Next.js & Supabase
        </footer>
      </div>
    </>
  );
}