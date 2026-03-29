"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"
import { ArrowRight, Inbox } from "lucide-react"
import { useTranslations } from "next-intl"

interface RecentRide {
  id: string
  passenger: string
  driver: string
  route: string
  status: "completed" | "in_progress" | "cancelled" | "pending"
  price: string
  date: string
}

const FALLBACK_RIDES: RecentRide[] = [
  { id: "R-10248", passenger: "Aidar K.", driver: "S.", route: "Dostyk Plaza -> MEGA Center", status: "completed", price: "1,200 T", date: "22 Feb, 14:30" },
  { id: "R-10247", passenger: "Maria S.", driver: "A.", route: "Khan Shatyr -> Airport", status: "in_progress", price: "3,500 T", date: "22 Feb, 14:12" },
  { id: "R-10246", passenger: "Ruslan M.", driver: "D.", route: "Railway Station -> Bayterek", status: "completed", price: "800 T", date: "22 Feb, 13:45" },
  { id: "R-10245", passenger: "Elena K.", driver: "—", route: "Keruen -> Abu Dhabi Plaza", status: "cancelled", price: "0 T", date: "22 Feb, 13:20" },
  { id: "R-10244", passenger: "Timur A.", driver: "K.", route: "Esentai Mall -> Tole Bi St", status: "completed", price: "1,800 T", date: "22 Feb, 12:55" },
]

export function RecentRidesTable() {
  const t = useTranslations("dashboard")
  const tc = useTranslations("common")
  const [rides, setRides] = useState<RecentRide[]>([])
  const [backendDown, setBackendDown] = useState(false)

  const statusMap = {
    completed: { label: tc("rideStatus.completed"), variant: "success" as const },
    in_progress: { label: tc("rideStatus.in_progress"), variant: "info" as const },
    cancelled: { label: tc("rideStatus.cancelled"), variant: "error" as const },
    pending: { label: tc("rideStatus.pending"), variant: "warning" as const },
  }

  useEffect(() => {
    async function load() {
      try {
        // Try /admin/stats first — it has recent_rides with enriched data
        const statsRes = await fetch("/api/dashboard/stats")
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          const recent = statsData?.recent_rides
          if (Array.isArray(recent) && recent.length > 0) {
            setRides(recent.slice(0, 5).map((r: Record<string, unknown>) => ({
              id: String(r.ride_id ?? ""),
              passenger: Array.isArray(r.passenger_names) ? (r.passenger_names as string[]).join(", ") : "—",
              driver: String(r.driver_name ?? "—"),
              route: r.from_address && r.to_address
                ? `${String(r.from_address).split(",")[0]} -> ${String(r.to_address).split(",")[0]}`
                : "—",
              status: (["completed", "in_progress", "cancelled", "pending"].includes(String(r.status)) ? r.status : "pending") as RecentRide["status"],
              price: r.price != null ? `${Number(r.price).toLocaleString("ru-RU")} ₸` : "—",
              date: r.created_at
                ? new Date(String(r.created_at)).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                : "—",
            })))
            setBackendDown(false)
            return
          }
        }

        // Fallback to rides API
        const res = await fetch("/api/rides?limit=5")
        if (res.ok) {
          const data = await res.json()
          const items = Array.isArray(data) ? data : data?.rides ?? data?.items
          if (Array.isArray(items) && items.length > 0) {
            setRides(items.map((r: Record<string, unknown>) => ({
              id: String(r.id ?? ""),
              passenger: String(r.passenger_name ?? r.passenger ?? "—"),
              driver: String(r.driverId ?? r.driver_name ?? r.driver ?? "—"),
              route: r.fromAddress && r.toAddress
                ? `${String(r.fromAddress).split(",")[0]} -> ${String(r.toAddress).split(",")[0]}`
                : String(r.route ?? "—"),
              status: (["completed", "in_progress", "cancelled", "pending"].includes(String(r.status)) ? r.status : "pending") as RecentRide["status"],
              price: r.price != null ? `${Number(r.price).toLocaleString("ru-RU")} ₸` : "—",
              date: r.createdAt
                ? new Date(String(r.createdAt)).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                : String(r.date ?? "—"),
            })))
            setBackendDown(false)
            return
          }
        }
      } catch {
        // backend down
      }
      setRides(FALLBACK_RIDES)
      setBackendDown(true)
    }
    load()
  }, [])

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between p-6 pb-0">
        <div className="flex items-center gap-3">
          <h4 className="text-lg font-bold text-foreground">{t("recentRides")}</h4>
          {backendDown && (
            <span className="px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-[10px] font-bold text-warning-dark">
  {tc("demo")}
            </span>
          )}
        </div>
        <Link href="/rides" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
          {t("viewAllRides")}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {!backendDown && rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm">{tc("noRidesYet")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50">
                {[t("table.rideId"), t("table.passenger"), t("table.driver"), t("table.route"), t("table.status"), t("table.price"), t("table.date")].map((h, i) => (
                  <th key={h + i} className="px-6 py-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rides.map((ride) => (
                <tr key={ride.id} className="group hover:bg-muted/50 transition-all">
                  <td className="px-6 py-4"><span className="text-sm font-bold text-primary">{ride.id}</span></td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{ride.passenger}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{ride.driver}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-medium max-w-[200px] truncate">{ride.route}</td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={statusMap[ride.status].variant}>{statusMap[ride.status].label}</StatusBadge>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm font-bold text-foreground font-mono">{ride.price}</span></td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{ride.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
