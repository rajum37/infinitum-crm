import React from "react";

export function SkeletonHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
      <div className="space-y-3 w-full sm:w-1/3">
        <div className="h-8 bg-nexus-border/50 rounded-lg w-3/4"></div>
        <div className="h-4 bg-nexus-border/30 rounded-lg w-1/2"></div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <div className="h-10 w-24 bg-nexus-border/40 rounded-lg"></div>
        <div className="h-10 w-32 bg-nexus-primary/20 rounded-lg"></div>
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-nexus-card border border-nexus-border/50 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-nexus-border/40"></div>
            <div className="w-16 h-5 rounded-full bg-nexus-border/30"></div>
          </div>
          <div className="space-y-2 mt-4">
            <div className="h-8 w-1/2 bg-nexus-border/50 rounded-lg"></div>
            <div className="h-4 w-3/4 bg-nexus-border/30 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-nexus-card border border-nexus-border/50 rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="p-4 sm:p-6 border-b border-nexus-border/50 flex justify-between items-center">
        <div className="h-8 w-48 bg-nexus-border/40 rounded-lg"></div>
        <div className="h-8 w-64 bg-nexus-border/40 rounded-lg"></div>
      </div>
      <div className="w-full">
        <div className="h-10 w-full bg-nexus-hover/50 border-b border-nexus-border"></div>
        <div className="divide-y divide-nexus-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <div className="h-4 w-1/4 bg-nexus-border/30 rounded"></div>
              <div className="h-4 w-1/4 bg-nexus-border/30 rounded"></div>
              <div className="h-4 w-1/4 bg-nexus-border/30 rounded"></div>
              <div className="h-8 w-8 bg-nexus-border/40 rounded ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCards count={4} />
      <SkeletonTable rows={5} />
    </div>
  );
}
