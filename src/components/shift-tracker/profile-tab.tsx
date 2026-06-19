"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Calendar,
  Hash,
  DollarSign,
  Download,
  LogOut,
  RefreshCw,
  Cloud,
  CloudOff,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { ProfileSkeleton } from "./loading-skeleton";
import { signOut } from "next-auth/react";
import type { UserProfile } from "@/types/database.types";

interface ProfileTabProps {
  profile: UserProfile | null;
  isLoading: boolean;
  onRefresh: () => void;
  // FIX: accept computed stats from parent so they're always accurate
  totalShifts: number;
  totalEarnings: number;
}

export function ProfileTab({
  profile,
  isLoading,
  onRefresh,
  totalShifts,
  totalEarnings,
}: ProfileTabProps) {
  const { toast } = useToast();
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
        toast({
          title: "Profile updated",
          description: "Your changes have been saved.",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editName, editUsername, onRefresh, toast]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/profile/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shifts-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "CSV file downloaded." });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const handleForceSync = useCallback(() => {
    setSyncStatus("pending");
    onRefresh();
    setTimeout(() => {
      setSyncStatus("synced");
      toast({ title: "Synced", description: "All data is up to date." });
    }, 1000);
  }, [toast, onRefresh]);

  // FIX: wire up sign out properly
  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: "/login" });
  }, []);

  if (isLoading) return <ProfileSkeleton />;
  if (!profile)
    return (
      <div className="text-center py-12 text-muted-foreground">
        No profile data
      </div>
    );

  const initials = (profile.name || profile.username || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const rawDate = profile.createdAt ?? profile.created_at ?? null;
  const joinDate =
    rawDate && !isNaN(new Date(rawDate).getTime())
      ? new Date(rawDate).toLocaleDateString("en-AU", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Recently joined";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 pt-4"
      >
        <Avatar className="h-24 w-24 ring-4 ring-primary/20">
          <AvatarImage
            src={profile.image || undefined}
            alt={profile.name || "User"}
          />
          <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {isEditing ? (
          <div className="w-full space-y-3 max-w-xs">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Full name"
            />
            <Input
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="Username"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {profile.name || "No name set"}
            </h2>
            <p className="text-sm text-muted-foreground">
              @{profile.username || "unnamed"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 gap-1.5 text-muted-foreground"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="w-3 h-3" /> Edit Profile
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {syncStatus === "synced" ? (
            <Badge
              variant="outline"
              className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
            >
              <Cloud className="w-3 h-3" /> Synced
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200"
            >
              <CloudOff className="w-3 h-3" /> Pending
            </Badge>
          )}
        </div>
      </motion.div>

      {/* FIX: use totalShifts + totalEarnings from props (computed from real shift data) */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="py-0 gap-0">
          <CardContent className="p-4 text-center">
            <Hash className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold tabular-nums">{totalShifts}</p>
            <p className="text-xs text-muted-foreground">Total Shifts</p>
          </CardContent>
        </Card>
        <Card className="py-0 gap-0">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(totalEarnings)}
            </p>
            <p className="text-xs text-muted-foreground">Total Earnings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{profile.email || "No email"}</span>
          </div>
          <Separator />
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Joined {joinDate}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleForceSync}
          >
            <RefreshCw className="w-4 h-4" /> Force Sync
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export CSV
          </Button>
          <Separator className="my-2" />
          {/* FIX: sign out now works */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-800"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
