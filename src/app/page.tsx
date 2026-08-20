"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/components/shift-tracker/app-toast";
import { useSession } from "next-auth/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSettingsStore } from "@/stores/settings-store";

import { DashboardTab } from "@/components/shift-tracker/dashboard-tab";
import { GlassmorphismNav } from "@/components/shift-tracker/glassmorphism-nav";
import { AddShiftDialog } from "@/components/shift-tracker/add-shift-dialog";
import { DeleteShiftDialog } from "@/components/shift-tracker/delete-shift-dialog";
// Lazy load non-critical tabs — loaded only when first visited
import { ShiftsTab } from "@/components/shift-tracker/shifts-tab";
import { CalendarTab } from "@/components/shift-tracker/calendar-tab";
import { ProfileTab } from "@/components/shift-tracker/profile-tab";
import { RemindersTab } from "@/components/shift-tracker/reminders-tab";
import { OweTab } from "@/components/shift-tracker/owe-tab";
import { SettingsTab } from "@/components/shift-tracker/settings-tab";
import { AnalyticsTab } from "@/components/shift-tracker/analytics-tab";
import { ShiftActionsSheet } from "@/components/shift-tracker/shift-actions-sheet";
import { ShiftDetailSheet } from "@/components/shift-tracker/shift-detail-sheet";
import { EditShiftDialog } from "@/components/shift-tracker/edit-shift-dialog";

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
type TabKey = "dashboard" | "shifts" | "owe" | "analytics" | "calendar" | "reminders" | "profile" | "settings";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "shifts", label: "Shifts", icon: CalendarDays },
  { key: "owe", label: "Owe", icon: HandCoins },
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

  // redirect if not authenticated — use window.location to avoid router re-render
  useEffect(() => {
    if (status === "unauthenticated") window.location.href = "/login";
  }, [status]);

  const defaultTab = useSettingsStore((s) => s.defaultTab);
  const compactDashboard = useSettingsStore((s) => s.compactDashboard);

  // Restore tab from URL hash on refresh — native app feel
  const getInitialTab = (): TabKey => {
    if (typeof window === "undefined") return defaultTab;
    const hash = window.location.hash.replace("#", "") as TabKey;
    const valid: TabKey[] = ["dashboard", "shifts", "owe", "profile"];
    return valid.includes(hash) ? hash : defaultTab;
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right">("left");

  const MOBILE_TABS = useMemo<TabKey[]>(
    () => ["dashboard", "shifts", "owe", "profile"],
    []
  );

  const activeTabRef = React.useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // ── Custom back-stack — no browser history manipulation ──────────────────
  // Next.js App Router intercepts ALL popstate events and re-renders the page.
  // Solution: maintain our own stack in React state. Android back button
  // is intercepted via a single dummy pushState entry that we always keep live.

  // Tab history stack — tracks where user came from
  const [tabStack, setTabStack] = React.useState<TabKey[]>([]);
  const tabStackRef = React.useRef<TabKey[]>([]);

  // Modal stack — tracks open modals in order
  const [modalStack, setModalStack] = React.useState<string[]>([]);
  const modalStackRef = React.useRef<string[]>([]);

  const setTabOnly = useCallback((key: TabKey, dir: "left" | "right") => {
    setSwipeDirection(dir);
    setActiveTab(key);
    // Update URL hash so refresh restores the same tab
    const hash = key === "dashboard" ? "" : `#${key}`;
    window.history.replaceState(null, "", window.location.pathname + hash);
    if (dir === "left") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
    }
  }, []);

  const navigateTab = useCallback((key: TabKey) => {
    if (activeTabRef.current === key) return;
    const tabs: TabKey[] = ["dashboard", "shifts", "owe", "profile"];
    const dir = tabs.indexOf(key) > tabs.indexOf(activeTabRef.current) ? "left" : "right";
    // Push current tab onto stack before moving
    const newStack = [...tabStackRef.current, activeTabRef.current];
    tabStackRef.current = newStack;
    setTabStack(newStack);
    setTabOnly(key, dir);
  }, [setTabOnly]);

  const navigateTabWithDirection = useCallback((key: TabKey, direction: "left" | "right") => {
    if (activeTabRef.current === key) return;
    const newStack = [...tabStackRef.current, activeTabRef.current];
    tabStackRef.current = newStack;
    setTabStack(newStack);
    setTabOnly(key, direction);
  }, [setTabOnly]);

  // Push a modal onto our stack
  const pushModal = useCallback((name: string) => {
    const newStack = [...modalStackRef.current, name];
    modalStackRef.current = newStack;
    setModalStack(newStack);
  }, []);

  // Pop the topmost modal, returns its name
  const popModal = useCallback((): string | null => {
    const stack = modalStackRef.current;
    if (stack.length === 0) return null;
    const popped = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);
    modalStackRef.current = newStack;
    setModalStack(newStack);
    return popped;
  }, []);

  // Go back — close modal or pop tab stack
  const goBack = useCallback(() => {
    // Close topmost modal first
    const modal = popModal();
    if (modal === "actions") {
      actionsOpenRef.current = false;
      setActionsSheetOpenRaw(false);
      return;
    }
    if (modal === "detail") {
      detailOpenRef.current = false;
      setDetailSheetOpenRaw(false);
      return;
    }
    if (modal === "edit") {
      editOpenRef.current = false;
      setEditDialogOpenRaw(false);
      setShiftToEdit(null);
      return;
    }
    if (modal === "add") {
      addOpenRef.current = false;
      setAddDialogOpenRaw(false);
      setAddShiftDefaults({});
      return;
    }
    // No modal — pop tab stack
    const stack = tabStackRef.current;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);
    tabStackRef.current = newStack;
    setTabStack(newStack);
    const tabs: TabKey[] = ["dashboard", "shifts", "owe", "profile"];
    const dir = tabs.indexOf(prev) < tabs.indexOf(activeTabRef.current) ? "right" : "left";
    setTabOnly(prev, dir);
  }, [popModal, setTabOnly]);

  // ── Android back button interception ─────────────────────────────────────
  // Keep ONE dummy history entry ahead of us. When back is pressed, popstate
  // fires, we handle it ourselves and immediately push the dummy back.
  const goBackRef = React.useRef(goBack);
  useEffect(() => { goBackRef.current = goBack; }, [goBack]);

  const hasBackableState = modalStack.length > 0 || tabStack.length > 0;

  useEffect(() => {
    // Push a single sentinel entry so back button fires popstate instead of leaving app
    window.history.pushState({ sentinel: true }, "");

    const onPop = () => {
      const canGoBack = modalStackRef.current.length > 0 || tabStackRef.current.length > 0;
      if (canGoBack) {
        goBackRef.current();
        // Re-push sentinel so next back press also fires
        window.history.pushState({ sentinel: true }, "");
      }
      // If nothing to go back to, let the browser exit naturally (don't re-push)
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // Only run once — goBackRef stays current via ref

  // Tab swipe — only fires when NOT on a shift card
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

  // Redirect away from analytics on mobile
  useEffect(() => {
    if (activeTab === "analytics") {
      const t = setTimeout(() => navigateTab("dashboard"), 0);
      return () => clearTimeout(t);
    }
  }, [isMobile, activeTab, navigateTab]);

  // ── Dialog state with ref mirrors ───────────────────────────────────────
  const [addDialogOpen,    setAddDialogOpenRaw]    = useState(false);
  const [editDialogOpen,   setEditDialogOpenRaw]   = useState(false);
  const [actionsSheetOpen, setActionsSheetOpenRaw] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen]    = useState(false);
  const addOpenRef     = React.useRef(false);
  const editOpenRef    = React.useRef(false);
  const actionsOpenRef = React.useRef(false);

  const setAddDialogOpen = useCallback((v: boolean) => {
    addOpenRef.current = v;
    setAddDialogOpenRaw(v);
    if (v) pushModal("add");
  }, [pushModal]);

  const setEditDialogOpen = useCallback((v: boolean) => {
    editOpenRef.current = v;
    setEditDialogOpenRaw(v);
    if (v) pushModal("edit");
  }, [pushModal]);

  const setActionsSheetOpen = useCallback((v: boolean) => {
    actionsOpenRef.current = v;
    setActionsSheetOpenRaw(v);
    if (v) pushModal("actions");
  }, [pushModal]);

  // Detail sheet
  const [detailSheetOpen, setDetailSheetOpenRaw] = useState(false);
  const [detailShift,     setDetailShift]        = useState<Shift | null>(null);
  const detailOpenRef = React.useRef(false);

  const openDetailSheet = useCallback((shift: Shift) => {
    setDetailShift(shift);
    detailOpenRef.current = true;
    setDetailSheetOpenRaw(true);
    pushModal("detail");
  }, [pushModal]);

  const closeDetailSheet = useCallback(() => {
    if (detailOpenRef.current) {
      detailOpenRef.current = false;
      setDetailSheetOpenRaw(false);
      popModal();
    }
  }, [popModal]);

  const [shiftToDelete, setShiftToDelete]   = useState<Shift | null>(null);
  const [shiftToEdit,   setShiftToEdit]     = useState<Shift | null>(null);
  const [isSubmitting,  setIsSubmitting]    = useState(false);
  const [addShiftDefaults, setAddShiftDefaults] = useState<{ person?: string; location?: string; date?: string }>({});
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const [longPressShift, setLongPressShift] = useState<Shift | null>(null);

  // Data state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const userName = profile?.name?.split(" ")[0] || "Suraj";

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
          // Close dialog + pop its history entry
          addOpenRef.current = false;
          setAddDialogOpenRaw(false);
          popModal();
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
          // Close dialog + pop its history entry
          editOpenRef.current = false;
          setEditDialogOpenRaw(false);
          setShiftToEdit(null);
          popModal();
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
    haptics(14);
    const ids = shiftsToMark.map(s => s.id);
    // Optimistic update — instant UI, single network call
    setShifts(prev => prev.map(s =>
      ids.includes(s.id) ? { ...s, status: "Paid" as ShiftStatus } : s
    ));
    try {
      const res = await fetch("/api/shifts/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "Paid" }),
      });
      if (!res.ok) throw new Error("bulk failed");
      showToast({ type: "success", title: `${shiftsToMark.length} shift${shiftsToMark.length !== 1 ? "s" : ""} marked paid ✓` });
      await fetchProfile();
    } catch {
      // Rollback
      setShifts(prev => prev.map(s =>
        ids.includes(s.id) ? { ...s, status: "Unpaid" as ShiftStatus } : s
      ));
      showToast({ type: "error", title: "Failed to update shifts" });
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

  // ── Computed values (only YOUR shifts — covered-by-others excluded) ──────
  const summary = useMemo<AnalyticsSummary>(() => {
    const myShifts    = hallShifts.filter(s => !s.coveredBy);
    const totalEarned = myShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned), 0);
    const paidShifts   = myShifts.filter((s) => s.status === "Paid");
    const unpaidShifts = myShifts.filter((s) => s.status === "Unpaid");
    return {
      totalEarned,
      totalPaid:    paidShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned), 0),
      totalUnpaid:  unpaidShifts.reduce((s, sh) => s + parseFloat(sh.amountEarned), 0),
      totalShifts:  myShifts.length,
      paidShifts:   paidShifts.length,
      unpaidShifts: unpaidShifts.length,
      averagePerShift: myShifts.length > 0 ? totalEarned / myShifts.length : 0,
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
  // Don't return null while loading — that unmounts everything and causes flash
  // isLoading state handles skeleton display inside tabs

  if (!isLoading && shifts.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-background">
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
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
            </div>
          </main>
          <AddShiftDialog
            open={addDialogOpen}
            onOpenChange={(v) => {
              if (!v && addOpenRef.current) {
                addOpenRef.current = false;
                setAddDialogOpenRaw(false);
                popModal();
              } else if (v) {
                setAddDialogOpen(true);
              }
            }}
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl md:block hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                  <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[17px] tracking-tight">ShiftTracker</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5 rounded-xl hidden md:flex">
                  <Plus className="w-3.5 h-3.5" /> Add Shift
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Desktop Tab Nav */}
        <nav className="border-b bg-background/80 backdrop-blur-lg hidden md:block">
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

        {/* Main Content */}
        {/* Pull to refresh indicator — fixed overlay so it appears above content */}
        {(isPulling || isRefreshing) && (
          <div className="fixed top-16 left-0 right-0 flex justify-center z-50 pointer-events-none">
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
          </div>
        )}

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-36 md:py-6 md:pb-6">
          {/* Tabs stay mounted — CSS display toggle, no remount, no flash */}
          <div className="relative">

            <div style={{ display: activeTab === "dashboard" ? "block" : "none" }}>
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
                onEditShift={(shift) => { setShiftToEdit(shift); setEditDialogOpen(true); }}
                allShifts={shifts}
                compact={compactDashboard}
              />
            </div>
              <div style={{ display: activeTab === "shifts" ? "block" : "none" }}>
              <ShiftsTab
                  shifts={shifts}
                  isLoading={isLoading}
                  onToggleStatus={toggleStatus}
                  onBulkPaid={handleBulkPaid}
                  onDeleteShift={handleDeleteStart}
                  onLongPress={handleLongPress}
                  onEditShift={openDetailSheet}
                  onShiftClick={openDetailSheet}
                  onAddShift={(person, location, date) => {
                    setAddShiftDefaults({ person, location, date });
                    setAddDialogOpen(true);
                  }}
                />
              </div>

              <div style={{ display: activeTab === "calendar" ? "block" : "none", contain: "layout style" }}>
                <CalendarTab
                  shifts={shifts}
                  onShiftClick={openDetailSheet}
                  userName={userName}
                  onAddShift={(date) => { setAddShiftDefaults(prev => ({ ...prev, date })); setAddDialogOpen(true); }}
                />
              </div>

              <div style={{ display: activeTab === "owe" ? "block" : "none", contain: "layout style" }}>
              <OweTab
                  shifts={shifts}
                  onToggleStatus={toggleStatus}
                  onEditShift={openDetailSheet}
                  onDeleteShift={handleDeleteStart}
                  onBulkPaid={async (ids: string[]) => { await handleBulkMarkPaid(shifts.filter(s => ids.includes(s.id))); }}
                  userName={userName}
                />
              </div>

              <div style={{ display: activeTab === "reminders" ? "block" : "none", contain: "layout style" }}>
                <RemindersTab savedStationNames={savedStationNames} />
              </div>

              <div style={{ display: activeTab === "profile" ? "block" : "none", contain: "layout style" }}>
              <ProfileTab
                  profile={profile}
                  isLoading={isLoading}
                  onRefresh={fetchProfile}
                  totalShifts={summary.totalShifts}
                  totalEarnings={summary.totalEarned}
                  shifts={hallShifts}
                />
              </div>

              <div style={{ display: activeTab === "analytics" ? "block" : "none", contain: "layout style" }}>
                <AnalyticsTab
                  summary={summary}
                  monthlyEarnings={monthlyEarnings}
                  isLoading={isLoading}
                />
              </div>

              <div style={{ display: activeTab === "settings" ? "block" : "none", contain: "layout style" }}>
                <SettingsTab />
              </div>

          </div>
        </main>

        {/* Mobile Bottom Nav — always rendered, CSS hides on desktop to avoid SSR flash */}
        <div className="md:hidden">
          <GlassmorphismNav
            onFabPress={() => setAddDialogOpen(true)}
            tabs={TABS.filter((t) => t.key !== "analytics" && t.key !== "settings" && t.key !== "reminders" && t.key !== "calendar").map((t) => ({
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
        </div>



        {/* Dialogs */}
        <AddShiftDialog
          key={`add-${addShiftDefaults.date ?? "default"}`}
          open={addDialogOpen}
          onOpenChange={(v) => {
            if (!v && addOpenRef.current) {
              // Closing via UI — pop the history entry we pushed
              addOpenRef.current = false;
              setAddDialogOpenRaw(false);
              setAddShiftDefaults({});
              popModal();
            } else if (v) {
              setAddDialogOpen(true);
            }
          }}
          onSubmit={handleAddShift}
          isSubmitting={isSubmitting}
          shifts={shifts}
          defaultPerson={addShiftDefaults.person}
          defaultLocation={addShiftDefaults.location}
          defaultDate={addShiftDefaults.date}
          userName={userName}
        />
        <EditShiftDialog
          open={editDialogOpen}
          onOpenChange={(v) => {
            if (!v && editOpenRef.current) {
              editOpenRef.current = false;
              setEditDialogOpenRaw(false);
              setShiftToEdit(null);
              popModal();
            } else if (v) {
              setEditDialogOpen(true);
            }
          }}
          shift={shiftToEdit}
          shifts={shifts}
          onSave={handleEditShift}
          isSubmitting={isSubmitting}
        />
        <ShiftActionsSheet
          shift={longPressShift}
          open={actionsSheetOpen}
          onClose={() => {
            if (actionsOpenRef.current) {
              actionsOpenRef.current = false;
              setActionsSheetOpenRaw(false);
              popModal();
            }
          }}
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
        <ShiftDetailSheet
          shift={detailShift}
          open={detailSheetOpen}
          userName={userName}
          onClose={closeDetailSheet}
          onEdit={(shift) => {
            closeDetailSheet();
            setTimeout(() => { setShiftToEdit(shift); setEditDialogOpen(true); }, 320);
          }}
          onDelete={(shift) => {
            closeDetailSheet();
            setTimeout(() => handleDeleteStart(shift), 320);
          }}
          onToggleStatus={toggleStatus}
        />

        {/* Footer */}
        <footer className="hidden md:block border-t py-4 text-center text-xs text-muted-foreground mt-auto">
          Shift & Payment Tracker — Built with Next.js & Supabase
        </footer>
      </div>
    </>
  );
}
