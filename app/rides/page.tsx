"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { StatusBadge } from "@/components/status-badge"
import { Search, RotateCw, MapPin, Eye, X, Inbox } from "lucide-react"
import { useTranslations } from "next-intl"

function shortName(fullName: string) {
  const parts = fullName.trim().split(" ")
  if (parts.length < 2) return fullName
  return parts[0] + " " + parts[1].charAt(0) + "."
}

type RideStatus = "completed" | "in_progress" | "cancelled" | "pending" | "searching"

interface Ride {
  id: string
  passenger: string
  passengerPhone: string
  driver: string
  driverPhone: string
  pickupAddress: string
  dropoffAddress: string
  status: RideStatus
  price: string
  distance: string
  duration: string
  date: string
  paymentMethod: string
}

const FALLBACK_RIDES: Ride[] = [
  { id: "R-10248", passenger: "Aidar Kairatov", passengerPhone: "+7 707 123 4567", driver: "Sergey Petrov", driverPhone: "+7 701 987 6543", pickupAddress: "Dostyk Plaza, Almaty", dropoffAddress: "MEGA Center, Almaty", status: "completed", price: "1,200 T", distance: "8.5 km", duration: "22 min", date: "22 Feb, 14:30", paymentMethod: "Cash" },
  { id: "R-10247", passenger: "Maria Sidorova", passengerPhone: "+7 702 555 1234", driver: "Azamat Nurlan", driverPhone: "+7 708 444 5678", pickupAddress: "Khan Shatyr, Astana", dropoffAddress: "Airport, Astana", status: "in_progress", price: "3,500 T", distance: "18.2 km", duration: "35 min", date: "22 Feb, 14:12", paymentMethod: "Card" },
  { id: "R-10246", passenger: "Ruslan Muratov", passengerPhone: "+7 705 333 9876", driver: "Damir Askarov", driverPhone: "+7 777 222 3456", pickupAddress: "Railway Station, Astana", dropoffAddress: "Bayterek Tower, Astana", status: "completed", price: "800 T", distance: "4.1 km", duration: "12 min", date: "22 Feb, 13:45", paymentMethod: "Cash" },
  { id: "R-10245", passenger: "Elena Kim", passengerPhone: "+7 700 888 1122", driver: "--", driverPhone: "--", pickupAddress: "Keruen Mall, Astana", dropoffAddress: "Abu Dhabi Plaza, Astana", status: "cancelled", price: "0 T", distance: "--", duration: "--", date: "22 Feb, 13:20", paymentMethod: "Card" },
  { id: "R-10244", passenger: "Timur Aliyev", passengerPhone: "+7 771 666 5544", driver: "Kairat Omarov", driverPhone: "+7 707 111 2233", pickupAddress: "Esentai Mall, Almaty", dropoffAddress: "Tole Bi St 56, Almaty", status: "completed", price: "1,800 T", distance: "11.3 km", duration: "28 min", date: "22 Feb, 12:55", paymentMethod: "Cash" },
  { id: "R-10243", passenger: "Dinara Zhaksylyk", passengerPhone: "+7 747 999 8877", driver: "--", driverPhone: "--", pickupAddress: "Samal-2, Almaty", dropoffAddress: "Medeu, Almaty", status: "searching", price: "~1,500 T", distance: "~6.8 km", duration: "~18 min", date: "22 Feb, 14:35", paymentMethod: "Card" },
  { id: "R-10242", passenger: "Alikhan Bekov", passengerPhone: "+7 778 555 6677", driver: "Marat Suleimanov", driverPhone: "+7 702 333 4455", pickupAddress: "Zhibek Zholy St, Almaty", dropoffAddress: "Gorky Park, Almaty", status: "completed", price: "950 T", distance: "5.2 km", duration: "15 min", date: "22 Feb, 12:10", paymentMethod: "Cash" },
  { id: "R-10241", passenger: "Gulnara Asanova", passengerPhone: "+7 701 777 8899", driver: "Yerbol Kasenov", driverPhone: "+7 705 111 0099", pickupAddress: "Mega Silk Way, Astana", dropoffAddress: "Expo, Astana", status: "pending", price: "2,200 T", distance: "9.7 km", duration: "20 min", date: "22 Feb, 14:40", paymentMethod: "Card" },
]

type FilterType = "all" | RideStatus

export default function RidesPage() {
  const t = useTranslations("rides")
  const tc = useTranslations("common")
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [backendDown, setBackendDown] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const statusMap: Record<RideStatus, { label: string; variant: "success" | "info" | "error" | "warning" | "neutral" }> = {
    completed: { label: tc("rideStatus.completed"), variant: "success" },
    in_progress: { label: tc("rideStatus.in_progress"), variant: "info" },
    cancelled: { label: tc("rideStatus.cancelled"), variant: "error" },
    pending: { label: tc("rideStatus.pending"), variant: "warning" },
    searching: { label: tc("rideStatus.searching"), variant: "neutral" },
  }

  const fetchRides = useCallback(async (status: FilterType, search: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      if (search.trim()) params.set("search", search.trim())
      params.set("limit", "100")

      const res = await fetch(`/api/rides?${params}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data?.rides ?? data?.items
        if (Array.isArray(items)) {
          setRides(items.map((r: Record<string, unknown>) => ({
            id: String(r.id ?? ""),
            passenger: String(r.passenger_name ?? r.passenger ?? "—"),
            passengerPhone: String(r.passenger_phone ?? "—"),
            driver: String(r.driverId ?? r.driver_name ?? r.driver ?? "--"),
            driverPhone: String(r.driver_phone ?? "--"),
            pickupAddress: String(r.fromAddress ?? r.pickup_address ?? r.pickup ?? "—"),
            dropoffAddress: String(r.toAddress ?? r.dropoff_address ?? r.dropoff ?? "—"),
            status: (["completed", "in_progress", "cancelled", "pending", "searching"].includes(String(r.status)) ? r.status : "pending") as RideStatus,
            price: r.price != null ? `${Number(r.price).toLocaleString("ru-RU")} ₸` : "—",
            distance: r.distanceM != null ? `${(Number(r.distanceM) / 1000).toFixed(1)} km` : String(r.distance ?? "—"),
            duration: r.totalDuration != null ? `${Math.round(Number(r.totalDuration) / 60)} min` : String(r.duration ?? "—"),
            date: r.createdAt ? new Date(String(r.createdAt)).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : String(r.date ?? r.created_at ?? "—"),
            paymentMethod: String(r.paymentMethod ?? r.payment_method ?? "—"),
          })))
          setIsLive(true)
          setBackendDown(false)
          setLoading(false)
          return
        }
      }
    } catch {
      // backend down
    }

    // Backend недоступен — показываем fallback
    const filtered = FALLBACK_RIDES.filter((ride) => {
      const matchesFilter = status === "all" || ride.status === status
      const matchesSearch = !search.trim() || ride.id.toLowerCase().includes(search.toLowerCase()) || ride.passenger.toLowerCase().includes(search.toLowerCase()) || ride.driver.toLowerCase().includes(search.toLowerCase())
      return matchesFilter && matchesSearch
    })
    setRides(filtered)
    setIsLive(false)
    setBackendDown(true)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = searchQuery !== "" ? 400 : 0
    debounceRef.current = setTimeout(() => fetchRides(filter, searchQuery), delay)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchQuery])

  const filters: { label: string; value: FilterType }[] = [
    { label: t("filters.all"), value: "all" },
    { label: t("filters.active"), value: "in_progress" },
    { label: t("filters.completed"), value: "completed" },
    { label: t("filters.cancelled"), value: "cancelled" },
    { label: t("filters.pending"), value: "pending" },
  ]

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
            {backendDown && (
              <span className="px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-[11px] font-bold text-warning-dark">{ tc("demo") }</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")} · {rides.length}</p>
        </div>
      </div>

      <div className="bg-card rounded-t-2xl border-x border-t border-border p-6 flex items-center justify-between">
        <div className="bg-muted p-1 rounded-xl flex gap-1 border border-border/50">
          {filters.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${filter === f.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("searchPlaceholder")}
              className="w-full h-11 pl-11 pr-4 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-muted-foreground" />
          </div>
          <button onClick={() => fetchRides(filter, searchQuery)} disabled={loading}
            className="w-11 h-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-all disabled:opacity-50">
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-card rounded-b-2xl border border-border overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                {[t("table.rideId"), t("table.passenger"), t("table.driver"), t("table.route"), t("table.status"), t("table.price"), t("table.date"), ""].map((h) => (
                  <th key={h} className="px-6 py-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-sm">{tc("loading")}</td></tr>
              ) : rides.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="w-10 h-10 opacity-30" />
                    <p className="text-sm">{t("noRides")}</p>
                  </div>
                </td></tr>
              ) : rides.map((ride) => (
                <tr key={ride.id} className="group hover:bg-muted/30 transition-all cursor-pointer" onClick={() => setSelectedRide(ride)}>
                  <td className="px-6 py-4"><span className="text-sm font-bold text-primary">{ride.id}</span></td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{shortName(ride.passenger)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{shortName(ride.driver)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 max-w-[220px]">
                      <MapPin className="w-3.5 h-3.5 text-success flex-shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{ride.pickupAddress.split(",")[0]}</span>
                      <span className="text-muted-foreground/40">{">"}</span>
                      <MapPin className="w-3.5 h-3.5 text-error flex-shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{ride.dropoffAddress.split(",")[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={statusMap[ride.status].variant}>{statusMap[ride.status].label}</StatusBadge>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm font-bold text-foreground font-mono">{ride.price}</span></td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-medium">{ride.date}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-all" onClick={(e) => { e.stopPropagation(); setSelectedRide(ride) }}>
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRide && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedRide(null)} />
          <div className="relative w-[480px] bg-card h-full shadow-2xl overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedRide.id}</h2>
                <StatusBadge variant={statusMap[selectedRide.status].variant}>{statusMap[selectedRide.status].label}</StatusBadge>
              </div>
              <button onClick={() => setSelectedRide(null)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-all text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="bg-muted rounded-2xl p-5">
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-4">{t("drawer.route")}</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{t("drawer.pickup")}</p>
                      <p className="text-sm text-muted-foreground">{selectedRide.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="ml-3 h-6 border-l-2 border-dashed border-border" />
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-error" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{t("drawer.dropoff")}</p>
                      <p className="text-sm text-muted-foreground">{selectedRide.dropoffAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: t("drawer.distance"), value: selectedRide.distance },
                  { label: t("drawer.duration"), value: selectedRide.duration },
                  { label: t("drawer.price"), value: selectedRide.price },
                  { label: t("drawer.payment"), value: selectedRide.paymentMethod },
                ].map((item) => (
                  <div key={item.label} className="bg-muted rounded-xl p-4">
                    <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {[
                { label: t("drawer.passenger"), name: selectedRide.passenger, phone: selectedRide.passengerPhone, bgClass: "bg-primary/10", textClass: "text-primary" },
                { label: t("drawer.driver"), name: selectedRide.driver, phone: selectedRide.driverPhone, bgClass: "bg-success/10", textClass: "text-success" },
              ].map((p) => (
                <div key={p.label}>
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">{p.label}</p>
                  <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${p.bgClass} flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${p.textClass}`}>{p.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{shortName(p.name)}</p>
                      <p className="text-xs text-muted-foreground">{p.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
