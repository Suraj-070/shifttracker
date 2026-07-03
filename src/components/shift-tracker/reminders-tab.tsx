"use client";

import React from "react";
import { Bell } from "lucide-react";
import { NotificationSettings } from "./notification-settings";

interface RemindersTabProps {
  savedStationNames?: string[];
}

export function RemindersTab({ savedStationNames = [] }: RemindersTabProps) {
  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2 pb-1">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
          <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reminders</h1>
          <p className="text-xs text-muted-foreground">Hall shift logging & station clock-in/out</p>
        </div>
      </div>

      <NotificationSettings savedStationNames={savedStationNames} />
    </div>
  );
}
