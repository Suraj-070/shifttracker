"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Bell,
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
import { GlassmorphismNav } from "@/components/shift-tracker/glassmorphism-nav";
import { AddShiftDialog } from "@/components/shift-tracker/add-shift-dialog";
import { DeleteShiftDialog } from "@/components/shift-tracker/delete-shift-dialog";
// Lazy load non-critical tabs — loaded only when first visited
const ShiftsTab       = React.lazy(() => import("@/components/shift-tracker/shifts-tab").then(m => ({ default: m.ShiftsTab })));
const CalendarTab     = React.lazy(() => import("@/components/shift-tracker/calendar-tab").then(m => ({ default: m.CalendarTab })));
const ProfileTab      = React.lazy(() => import("@/components/shift-tracker/profile-tab").then(m => ({ default: m.ProfileTab })));
const RemindersTabLazy = React.lazy(() => import("@/components/shift-tracker/reminders-tab").then(m => ({ default: m.RemindersTab })));
const SettingsTab     = React.lazy(() => import("@/components/shift-tracker/settings-tab").then(m => ({ default: m.SettingsTab })));
const AnalyticsTab    = React.lazy(() => import("@/components/shift-tracker/analytics-tab").then(m => ({ default: m.AnalyticsTab })));
const ShiftActionsSheet = React.lazy(() => import("@/components/shift-tracker/shift-actions-sheet").then(m => ({ default: m.ShiftActionsSheet })));
const EditShiftDialog = React.lazy(() => import("@/components/shift-tracker/edit-shift-dialog").then(m => ({ default: m.EditShiftDialog })));

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
type TabKey = "dashboard" | "shifts" | "analytics" | "calendar" | "reminders" | "profile" | "settings";

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
  { key: "reminders", label: "Reminders", icon: Bell },
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
    () => ["dashboard", "shifts", "calendar", "reminders", "profile"],
    []
  );

  // Keep activeTab in a ref so swipe callbacks never go stale
  const activeTabRef = React.useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const navigateTab = useCallback((key: TabKey) => {
    // Bail if already on this tab — prevents refresh feel
    if (activeTabRef.current === key) return;
    const tabs: TabKey[] = ["dashboard", "shifts", "calendar", "reminders", "profile"];
    const currentIdx = tabs.indexOf(activeTabRef.current);
    const nextIdx = tabs.indexOf(key);
    const dir = nextIdx > currentIdx ? "left" : "right";
    setSwipeDirection(dir);
    setActiveTab(key);
    window.history.replaceState({ shiftTrackerTab: key }, "");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }, []);

  const navigateTabWithDirection = useCallback((key: TabKey, direction: "left" | "right") => {
    if (activeTabRef.current === key) return;
    setSwipeDirection(direction);
    setActiveTab(key);
    window.history.replaceState({ shiftTrackerTab: key }, "");
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
    // Set initial history state so we can detect app state
    window.history.replaceState({ shiftTrackerTab: "dashboard" }, "");
  }, []);

  // Redirect away from analytics on mobile
  useEffect(() => {
    if (isMobile && activeTab === "analytics") {
      const t = setTimeout(() => navigateTab("dashboard"), 0);
      return () => clearTimeout(t);
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
      // Defer to avoid synchronous setState in effect body
      const t = setTimeout(() => {
        fetchShifts();
        fetchProfile();
      }, 0);
      return () => clearTimeout(t);
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

  const handleBulkMarkPaid = useCallback(async (shiftsToMark: Shift[]) => {
    if (!shiftsToMark.length) return;
    haptics(12);
    // Optimistic update
    setShifts(prev => prev.map(s =>
      shiftsToMark.find(m => m.id === s.id) ? { ...s, status: "Paid" as ShiftStatus } : s
    ));
    // Save to DB
    try {
      await Promise.all(shiftsToMark.map(s =>
        fetch(`/api/shifts/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Paid" }),
        })
      ));
      showToast({ type: "success", title: `${shiftsToMark.length} shifts marked paid ✓` });
      await fetchProfile();
    } catch {
      showToast({ type: "error", title: "Failed to update some shifts" });
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

  const savedStationNames = useMemo(
    () => [...new Set(stationShifts.map(s => s.coveringFor).filter((n): n is string => Boolean(n)))],
    [stationShifts]
  );

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

  // While session is loading just show nothing — instant feel
  if (status === "loading") return null;

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
                        const allTabs: TabKey[] = ["dashboard", "shifts", "calendar", "analytics", "reminders", "profile", "settings"];
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
        {/* Pull to refresh indicator — fixed overlay so it appears above content */}
        {isMobile && (isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 flex justify-center z-50 pointer-events-none"
          >
            <div className="bg-background border border-border/60 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full border-2 border-primary border-t-transparent ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                style={{
                  opacity: isRefreshing ? 1 : pullProgress,
                  transform: `rotate(${pullProgress * 180}deg)`
                }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {isRefreshing ? "Refreshing..." : "Pull to refresh"}
              </span>
            </div>
          </motion.div>
        )}

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 pb-28 md:py-6 md:pb-6 overflow-x-hidden" style={{ isolation: "isolate" }}>
          <AnimatePresence mode="popLayout" initial={false} custom={swipeDirection}>
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
                transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="tab-content">
                <DashboardTab
                  summary={summary}
                  recentShifts={recentShifts}
                  stationShifts={stationShifts}
                  hallShifts={hallShifts}
                  isLoading={isLoading}
                  onToggleStatus={toggleStatus}
                  onBulkMarkPaid={handleBulkMarkPaid}
                  onAddShift={() => setAddDialogOpen(true)}
                  onViewAllShifts={() => navigateTabWithDirection("shifts", "left")}
                  compact={compactDashboard}
                />
              </motion.div>
            )}
            {activeTab === "shifts" && (
              <React.Suspense fallback={null}>
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
                transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
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
              </React.Suspense>
            )}
            {activeTab === "analytics" && (
              <React.Suspense fallback={null}>
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
                transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <AnalyticsTab
                  summary={summary}
                  monthlyEarnings={monthlyEarnings}
                  isLoading={isLoading}
                />
              </motion.div>
              </React.Suspense>
            )}
            {activeTab === "calendar" && (
              <React.Suspense fallback={null}>
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
                transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <CalendarTab
                  shifts={shifts}
                  onShiftClick={(shift) => {
                    setShiftToEdit(shift);
                    setEditDialogOpen(true);
                  }}
                  onAddShift={(date) => {
                    setAddDialogOpen(true);
                  }}
                />
              </motion.div>
              </React.Suspense>
            )}
            {activeTab === "reminders" && (
              <React.Suspense fallback={null}>
              <motion.div
                key="reminders"
                custom={swipeDirection}
                variants={{
                  enter: (dir: string) => ({ x: dir === "left" ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: string) => ({ x: dir === "left" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <RemindersTabLazy
                  savedStationNames={savedStationNames}
                />
              </motion.div>
              </React.Suspense>
            )}
            {activeTab === "profile" && (
              <React.Suspense fallback={null}>
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
                transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
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
              </React.Suspense>
            )}
            {activeTab === "settings" && (
              <React.Suspense fallback={null}>
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
                transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <SettingsTab />
              </motion.div>
              </React.Suspense>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Add Button — mobile only */}
        {isMobile && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setAddDialogOpen(true)}
            className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center btn-primary-glow fab-enter"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </motion.button>
        )}

        {/* Mobile Bottom Nav */}
        {isMobile && (
          <GlassmorphismNav
            tabs={TABS.filter((t) => t.key !== "analytics" && t.key !== "settings").map((t) => ({
              ...t,
              badge: t.key === "shifts"
                ? shifts.filter((s) => s.status === "Unpaid").length
                : undefined,
            }))}
            activeTab={activeTab}
            onTabChange={(key) => {
              navigateTab(key as TabKey);
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
