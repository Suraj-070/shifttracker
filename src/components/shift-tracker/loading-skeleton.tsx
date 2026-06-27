"use client";

import React from "react";

// Shimmer skeleton — animated moving highlight instead of static pulse
function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-muted ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
          animation: "shimmer 1.6s infinite",
        }}
      />
    </div>
  );
}

// Inject shimmer keyframe once
if (typeof document !== "undefined") {
  if (!document.getElementById("shimmer-style")) {
    const style = document.createElement("style");
    style.id = "shimmer-style";
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
    `;
    document.head.appendChild(style);
  }
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Tab switcher skeleton */}
      <ShimmerBlock className="h-9 w-48" />
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-[88px]" />
        ))}
      </div>
      {/* Progress card */}
      <ShimmerBlock className="h-24" />
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <ShimmerBlock className="h-12" />
        <ShimmerBlock className="h-12" />
      </div>
      {/* Recent shifts */}
      <ShimmerBlock className="h-64" />
    </div>
  );
}

export function ShiftsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <ShimmerBlock className="h-9 w-48" />
        <ShimmerBlock className="h-9 w-32" />
      </div>
      {/* Filter */}
      <ShimmerBlock className="h-10 w-full" />
      {/* Cards staggered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="h-44"
            style={{ animationDelay: `${i * 80}ms` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-4">
        <ShimmerBlock className="h-24 w-24 rounded-full" />
        <ShimmerBlock className="h-6 w-40" />
        <ShimmerBlock className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ShimmerBlock className="h-20" />
        <ShimmerBlock className="h-20" />
      </div>
    </div>
  );
}