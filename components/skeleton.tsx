"use client"

import { cn } from "@/lib/utils"

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("bg-muted rounded-lg animate-pulse", className)} style={style} />
  )
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-32" />
    </div>
  )
}

export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          {i === 0 ? (
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ) : (
            <Skeleton className={cn("h-3", i === cols - 1 ? "w-6" : "w-16")} />
          )}
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <tbody className="divide-y divide-border/50">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </tbody>
  )
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border p-6", className)}>
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-48 rounded-xl" />
      </div>
      <div className="h-[280px] flex items-end gap-2 px-4">
        {[40, 65, 50, 75, 85, 70, 90].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <Skeleton className="w-full rounded-t-md" style={{ height: `${h}%` }} />
            <Skeleton className="h-2.5 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonDriverCard() {
  return (
    <div className="w-full bg-muted rounded-xl p-3.5" style={{ borderLeft: "3px solid #E5E7EB" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}
