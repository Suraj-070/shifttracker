"use client";

import React from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { NotificationSettings } from "./notification-settings";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface RemindersTabProps {
  savedStationNames?: string[];
}

export function RemindersTab({ savedStationNames = [] }: RemindersTabProps) {
  const { isSubscribed, permission } = usePushNotifications();

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isSubscribed ? "bg-emerald-500" : "bg-muted"
          }`}>
            {isSubscribed
              ? <Bell className="w-5 h-5 text-white" />
              : <BellOff className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Reminders</h1>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? "Active — notifications enabled"
                : permission === "denied"
                ? "Blocked — enable in phone settings"
                : "Tap Enable to get started"}
            </p>
          </div>
        </div>
        {isSubscribed && (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        )}
      </div>

      <NotificationSettings savedStationNames={savedStationNames} />
    </div>
  );
}
