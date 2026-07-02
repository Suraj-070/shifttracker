"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  BarChart3,
  User,
  Settings,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSettingsStore } from "@/stores/settings-store";

import { DashboardTab } from "@/components/shift-tracker/dashboard-tab";
import { ShiftsTab } from "@/components/shift-tracker/shifts-tab";
import { AnalyticsTab } from "@/components/shift-tracker/analytics-tab";
import { CalendarTab } from "@/components/shift-tracker/calendar-tab";
import { ShiftActionsSheet } from "@/components/shift-tracker/shift-actions-sheet";
import { ProfileTab } from "@/components/shift-tracker/profile-tab";
import { SettingsTab } from "@/components/shift-tracker/settings-tab";
import { AddShiftDialog } from "@/components/shift-tracker/add-shift-dialog";
import { EditShiftDialog } from "@/components/shift-tracker/edit-shift-dialog";
import { DeleteShiftDialog } from "@/components/shift-tracker/delete-shift-dialog";
import { GlassmorphismNav } from "@/components/shift-tracker/glassmorphism-nav";

import { useHaptics } from "@/hooks/use-haptics";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useTabSwipe } from "@/hooks/use-tab-swipe";
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
type TabKey = "dashboard" | "shifts" | "analytics" | "calendar" | "profile" | "settings";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "shifts", label: "Shifts", icon: CalendarDays },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "profile", label: "Profile", icon: User },
  { key: "settings", label: "Settings", icon: Settings },
];

// ============================================================
// Main Page Component
// ============================================================
export default function ShiftTrackerPage() {
  const { showToast } = useAppToast();
  const isMobile = useIsMobile();
  const haptics = useHaptics();
  const { status } = useSession();
  const router = useRouter();

  // redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const defaultTab = useSettingsStore((s) => s.defaultTab);
  const compactDashboard = useSettingsStore((s) => s.compactDashboard);
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right">("left");

  // Tab order — defined as const outside to avoid recreation
  // (defined here so TypeScript can see TabKey; values are stable)
  const MOBILE_TABS = useMemo<TabKey[]>(
    () => ["dashboard", "shifts", "calendar", "profile", "settings"],
    []
  );

  // Keep activeTab in a ref so swipe callbacks never go stale
  const activeTabRef = React.useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const navigateTab = useCallback((key: TabKey) => {
    if (key === "dashboard") {
      setSwipeDirection("right");
      setActiveTab("dashboard");
      if (window.history.state?.shiftTrackerTab) {
        window.history.back();
      }
    } else {
      setSwipeDirection("left");
      window.history.pushState({ shiftTrackerTab: key }, "");
      setActiveTab(key);
    }
  }, []);

  const navigateTabWithDirection = useCallback((key: TabKey, direction: "left" | "right") => {
    // Lock scroll position so tab switch doesn't jump to top
    const scrollY = window.scrollY;
    setSwipeDirection(direction);
    if (key === "dashboard") {
      setActiveTab("dashboard");
      if (window.history.state?.shiftTrackerTab) window.history.back();
    } else {
      window.history.pushState({ shiftTrackerTab: key }, "");
      setActiveTab(key);
    }
    // Restore scroll after React re-renders
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }, []);

  // Swipe left → next tab, swipe right → prev tab
  useTabSwipe({
    disabled: !isMobile,
    onSwipeLeft: () => {
      const idx = MOBILE_TABS.indexOf(activeTabRef.current);
      if (idx < MOBILE_TABS.length - 1) {
        haptics(6);
        navigateTabWithDirection(MOBILE_TABS[idx + 1], "left");
      }
    },
    onSwipeRight: () => {
      const idx = MOBILE_TABS.indexOf(activeTabRef.current);
      if (idx > 0) {
        haptics(6);
        navigateTabWithDirection(MOBILE_TABS[idx - 1], "right");
      }
    },
  });

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
  const [addShiftDefaults, setAddShiftDefaults] = useState<{ person?: string; location?: string; }>({});
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const [longPressShift, setLongPressShift] = useState<Shift | null>(null);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);

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
          showToast({ type: "error", title: "Failed to update status" });
        }
      } catch {
        setShifts((prev) =>
          prev.map((s) =>
            s.id === shift.id ? { ...s, status: shift.status } : s,
          ),
        );
      }
    },
    [showToast],
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
          setShowSuccessBurst(true);
          showToast({
            type: isStationShift(data.shift) ? "station" : "success",
            title: "Shift added!",
            description: isStationShift(data.shift)
              ? `${data.shift.coveringFor} · Station`
              : `${input.coveringFor} @ ${input.locationName}`,
          });
          await fetchProfile();
        }
      } catch {
        showToast({ type: "error", title: "Failed to add shift" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, showToast, fetchProfile],
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
          showToast({ type: "edit", title: "Shift updated!", description: "Changes saved." });
          await fetchProfile();
        }
      } catch {
        showToast({ type: "error", title: "Failed to update shift",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [showToast, fetchProfile],
  );

  // Delete shift
  // Optimistic delete — remove immediately, confirm after toast timer
  // Use a ref so confirm/undo always see the latest shift — no stale closure
  const pendingDeleteRef = React.useRef<Shift | null>(null);

  const handleDeleteStart = useCallback((shift: Shift) => {
    haptics(12);
    pendingDeleteRef.current = shift;
    setShiftToDelete(shift);
    setShifts((prev) => prev.filter((s) => s.id !== shift.id));
    setDeleteDialogOpen(true);
  }, [haptics]);

  const handleDeleteConfirm = useCallback(async () => {
    const shift = pendingDeleteRef.current;
    if (!shift) return;
    pendingDeleteRef.current = null;
    setShiftToDelete(null);
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      haptics(20);
      await fetchProfile();
    } catch {
      // Restore shift if delete failed
      setShifts((prev) =>
        [shift, ...prev].sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))
      );
      showToast({ type: "error", title: "Delete failed", description: "Shift restored." });
    }
  }, [haptics, fetchProfile, showToast]);

  const handleDeleteUndo = useCallback(() => {
    const shift = pendingDeleteRef.current;
    if (!shift) return;
    pendingDeleteRef.current = null;
    setShifts((prev) =>
      [shift, ...prev].sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))
    );
    haptics(8);
    setShiftToDelete(null);
  }, [haptics]);

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
        showToast({ type: "success", title: `${ids.length} shift${ids.length !== 1 ? "s" : ""} marked as Paid` });
        await fetchProfile();
      } else {
        showToast({ type: "error", title: "Failed to bulk update" });
      }
    } catch {
      showToast({ type: "error", title: "Failed to bulk update shifts" });
    }
  }, [showToast, fetchProfile]);

  const handleLongPress = useCallback((shift: Shift) => {
    setLongPressShift(shift);
    setActionsSheetOpen(true);
  }, []);

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

  // Don't block render on session loading — show skeleton immediately
  // Only redirect once we KNOW user is unauthenticated
  if (status === "unauthenticated") return null;

  // Premium loading screen while session resolves
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"
        >
          <Clock className="w-8 h-8 text-white" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="flex flex-col items-center gap-1"
        >
          <p className="text-lg font-bold tracking-tight">ShiftTracker</p>
          <p className="text-xs text-muted-foreground">Loading your shifts…</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

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
                      onClick={() => {
                        const allTabs: TabKey[] = ["dashboard", "shifts", "calendar", "analytics", "profile", "settings"];
                        const dir = allTabs.indexOf(tab.key as TabKey) > allTabs.indexOf(activeTab) ? "left" : "right";
                        navigateTabWithDirection(tab.key as TabKey, dir);
                      }}
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
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 pb-28 md:py-6 md:pb-6 overflow-x-hidden" style={{ isolation: "isolate" }}>
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
          <AnimatePresence mode="wait" initial={false} custom={swipeDirection}>
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                custom={swipeDirection}
                variants={{
                  enter: (dir: string) => ({ x: dir === "left" ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: string) => ({ x: dir === "left" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
                className="tab-content"
              >
                <DashboardTab
                  summary={summary}
                  recentShifts={recentShifts}
                  stationShifts={stationShifts}
                  hallShifts={hallShifts}
                  isLoading={isLoading}
                  onToggleStatus={toggleStatus}
                  onAddShift={() => setAddDialogOpen(true)}
                  onViewAllShifts={() => navigateTabWithDirection("shifts", "left")}
                  compact={compactDashboard}
                />
              </motion.div>
            )}
            {activeTab === "shifts" && (
              <motion.div
                key="shifts"
                custom={swipeDirection}
                variants={{
                  enter: (dir: string) => ({ x: dir === "left" ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: string) => ({ x: dir === "left" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
              >
                <ShiftsTab
                  shifts={shifts}
                  isLoading={isLoading}
                  onToggleStatus={toggleStatus}
                  onBulkPaid={handleBulkPaid}
                  onDeleteShift={handleDeleteStart}
                  onLongPress={handleLongPress}
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
                custom={swipeDirection}
                variants={{
                  enter: (dir: string) => ({ x: dir === "left" ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: string) => ({ x: dir === "left" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
              >
                <AnalyticsTab
                  summary={summary}
                  monthlyEarnings={monthlyEarnings}
                  isLoading={isLoading}
                />
              </motion.div>
            )}
            {activeTab === "calendar" && (
              <motion.div
                key="calendar"
                custom={swipeDirection}
                variants={{
                  enter: (dir: string) => ({ x: dir === "left" ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: string) => ({ x: dir === "left" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
              >
                <CalendarTab
                  shifts={shifts}
                  onShiftClick={(shift) => {
                    setShiftToEdit(shift);
                    setEditDialogOpen(true);
                  }}
                />
              </motion.div>
            )}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                custom={swipeDirection}
                variants={{
                  enter: (dir: string) => ({ x: dir === "left" ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: string) => ({ x: dir === "left" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
              >
                <ProfileTab
                  profile={profile}
                  isLoading={isLoading}
                  onRefresh={fetchProfile}
                  totalShifts={summary.totalShifts}
                  totalEarnings={summary.totalEarned}
                  shifts={hallShifts}
                />
              </motion.div>
            )}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                custom={swipeDirection}
                variants={{
                  enter: (dir: string) => ({ x: dir === "left" ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: string) => ({ x: dir === "left" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
              >
                <SettingsTab
                  savedStationNames={[...new Set(stationShifts.map(s => s.coveringFor).filter(Boolean))]}
                />
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
            onTabChange={(key) => {
              const tabs: TabKey[] = ["dashboard", "shifts", "profile", "settings"];
              const dir = tabs.indexOf(key as TabKey) > tabs.indexOf(activeTab) ? "left" : "right";
              navigateTabWithDirection(key as TabKey, dir);
            }}
          />
        )}

        {/* Success burst overlay */}
        {showSuccessBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="fixed top-16 right-4 z-50 pointer-events-none w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <motion.span
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-white text-lg font-bold"
            >
              ✓
            </motion.span>
          </motion.div>
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
        <ShiftActionsSheet
          shift={longPressShift}
          open={actionsSheetOpen}
          onClose={() => setActionsSheetOpen(false)}
          onEdit={(shift) => { setShiftToEdit(shift); setEditDialogOpen(true); }}
          onToggleStatus={toggleStatus}
          onDelete={handleDeleteStart}
        />
        <DeleteShiftDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          shift={shiftToDelete}
          onConfirm={handleDeleteConfirm}
          onUndo={handleDeleteUndo}
        />

        {/* Footer */}
        <footer className="hidden md:block border-t py-4 text-center text-xs text-muted-foreground mt-auto">
          Shift & Payment Tracker — Built with Next.js & Supabase
        </footer>
      </div>
    </>
  );
}