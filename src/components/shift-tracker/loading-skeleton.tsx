"use client";

import React, { CSSProperties } from "react";


interface ShimmerBlockProps {
  className?: string;
  style?: CSSProperties;
}

function ShimmerBlock({ className = "", style }: ShimmerBlockProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-muted ${className}`}
      style={style}
    >
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
          animation: "shimmer 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Sticky pill */}
      <ShimmerBlock className="h-11 w-56 mx-auto rounded-2xl" />
      {/* Hero card */}
      <ShimmerBlock className="h-44 rounded-3xl" />
      {/* 2-col stats */}
      <div className="grid grid-cols-2 gap-3">
        <ShimmerBlock className="h-24 rounded-2xl" />
        <ShimmerBlock className="h-24 rounded-2xl" />
      </div>
      {/* Owe card */}
      <ShimmerBlock className="h-28 rounded-2xl" />
      {/* Recent list */}
      <ShimmerBlock className="h-48 rounded-2xl" />
    </div>
  );
}

export function ShiftsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <ShimmerBlock className="h-9 w-48" />
        <ShimmerBlock className="h-9 w-32" />
      </div>
      <ShimmerBlock className="h-10 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="h-44"
            style={{ animationDelay: `${i * 80}ms` }}
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
