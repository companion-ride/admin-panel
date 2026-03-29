"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { RecentRidesTable } from "@/components/dashboard/recent-rides"
import { RidesChart } from "@/components/dashboard/rides-chart"
import { SupportPreview } from "@/components/dashboard/support-preview"
import { Car, Users, MessageSquare, RefreshCw, Inbox } from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocale } from "@/components/locale-provider"
import { SkeletonCard, SkeletonTable } from "@/components/skeleton"

interface DashboardStats {
  totalRides: number
  activeUsers: number
  openTickets: number
}

interface ActiveRide {
  id: string
  passenger: string
  driver: string
  route: string
  status: "in_progress" | "searching" | "pending"
  price: string
  eta: string
}

const FALLBACK_STATS: DashboardStats = {
  totalRides: 1248,
  activeUsers: 3580,
  openTickets: 12,
}

const FALLBACK_RIDES: ActiveRide[] = [
  { id: "TRP-001", passenger: "Aigerim B.", driver: "Marina K.", route: "Nauryzbai → KazNU", status: "in_progress", price: "1 200 ₸", eta: "8 мин" },
  { id: "TRP-002", passenger: "Bolat K.", driver: "Alibek M.", route: "Zhetysu → Esentai Tower", status: "searching", price: "1 400 ₸", eta: "3 мин" },
  { id: "TRP-003", passenger: "Nuria A.", driver: "Ivan T.", route: "Nauryzbai → KBTU", status: "pending", price: "1 100 ₸", eta: "12 мин" },
]

export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const tc = useTranslations("common")
  const { locale } = useLocale()
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>(FALLBACK_STATS)
  const [activeRides, setActiveRides] = useState<ActiveRide[]>(FALLBACK_RIDES)
  const [isLive, setIsLive] = useState(false)
  const [backendDown, setBackendDown] = useState(false)

  const localeCode = locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US"
  const today = new Date().toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const rideStatusMap = {
    in_progress: { label: tc("rideStatus.in_progress"), variant: "info" as const },
    searching: { label: tc("rideStatus.searching"), variant: "neutral" as const },
    pending: { label: tc("rideStatus.waiting"), variant: "warning" as const },
  }

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/dashboard/stats")
      if (res.ok) {
        const data = await res.json()
        if (data && !data.error) {
          setStats({
            totalRides: data.total_rides ?? 0,
            activeUsers: data.active_users ?? 0,
            openTickets: data.open_tickets ?? 0,
          })

          // Only show truly active rides (in_progress, searching, pending)
          const recent = data.recent_rides ?? []
          if (Array.isArray(recent)) {
            const active = recent.filter((r: Record<string, unknown>) =>
              r.status === "in_progress" || r.status === "searching"
            )
            setActiveRides(active.map((r: Record<string, unknown>) => ({
              id: String(r.ride_id ?? ""),
              passenger: Array.isArray(r.passenger_names) ? (r.passenger_names as string[]).join(", ") : "—",
              driver: String(r.driver_name ?? "—"),
              route: r.from_address && r.to_address
                ? `${String(r.from_address).split(",")[0]} → ${String(r.to_address).split(",")[0]}`
                : "—",
              status: r.status as "in_progress" | "searching" | "pending",
              price: r.price != null ? `${Number(r.price).toLocaleString("ru-RU")} ₸` : "—",
              eta: "—",
            })))
          }

          setIsLive(true)
          setBackendDown(false)
          setInitialLoading(false)
          setRefreshing(false)
          return
        }
      }
    } catch {
      // fallback
    }

    setBackendDown(true)
    setInitialLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <AdminLayout>
      {/* Title section */}
      <div className="mb-8 flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-foreground">
              {t("title")}
            </h1>
            {backendDown && (
              <span className="px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-[11px] font-bold text-warning-dark">
                {tc("demo")}
              </span>
            )}
          </div>
          <p className="text-[15px] text-muted-foreground">
            {t("subtitle")}{" "}
            <span className="font-bold text-foreground">{today}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-error/10 border border-error/20 text-xs font-bold text-error">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              {t("live")}
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="h-9 px-4 rounded-xl border border-border bg-card text-sm font-bold text-foreground hover:bg-muted transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {initialLoading ? (
        <div className="grid grid-cols-3 gap-6 mb-8">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 mb-8 stagger-children">
          <StatCard title={t("stats.totalRides")} value={stats.totalRides.toLocaleString("ru-RU")} change="" changeType="positive" icon={Car} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard title={t("stats.activeUsers")} value={stats.activeUsers.toLocaleString("ru-RU")} change="" changeType="positive" icon={Users} iconColor="text-success" iconBg="bg-success/10" />
          <StatCard title={t("stats.openTickets")} value={String(stats.openTickets)} change="" changeType="negative" icon={MessageSquare} iconColor="text-warning" iconBg="bg-warning/10" />
        </div>
      )}

      {/* Charts + Support */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-8"><RidesChart /></div>
        <div className="col-span-4"><SupportPreview /></div>
      </div>

      {/* Active Rides table */}
      <div className="bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] mb-8">
        <div className="flex items-center justify-between p-6 pb-4">
          <h4 className="text-base font-bold text-foreground">{t("activeRides")} ({activeRides.length})</h4>
          {isLive && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-error bg-error/10 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              {t("live")}
            </div>
          )}
        </div>
        {initialLoading ? (
          <div className="overflow-x-auto"><table className="w-full"><SkeletonTable rows={3} cols={7} /></table></div>
        ) : !backendDown && activeRides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Inbox className="w-10 h-10 opacity-30" />
            <p className="text-sm">{tc("noActiveRides")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-y border-border/50">
                <tr>
                  {[t("table.id"), t("table.passenger"), t("table.driver"), t("table.route"), t("table.status"), t("table.price"), t("table.eta")].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {activeRides.map((ride) => (
                  <tr key={ride.id} className="hover:bg-muted/30 transition-all">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-primary">{ride.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{ride.passenger}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{ride.driver}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{ride.route}</td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={rideStatusMap[ride.status].variant}>
                        {rideStatusMap[ride.status].label}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-foreground">{ride.price}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{ride.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecentRidesTable />
    </AdminLayout>
  )
}
