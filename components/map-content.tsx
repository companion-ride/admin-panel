"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Star, Car, X, RefreshCw } from "lucide-react"
import { SkeletonDriverCard } from "@/components/skeleton"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useLocale } from "@/components/locale-provider"
import Script from "next/script"

type DriverStatus = "on_ride" | "available"

interface ActiveDriver {
  id: string
  name: string
  status: DriverStatus
  lat: number
  lon: number
  rating: number
  ridesTotal: number
  ridesToday: number
}

const FALLBACK_DRIVERS: ActiveDriver[] = [
  { id: "DRV-001", name: "Марина К.", status: "on_ride", lat: 43.238, lon: 76.945, rating: 4.8, ridesTotal: 643, ridesToday: 7 },
  { id: "DRV-002", name: "Алибек М.", status: "available", lat: 43.245, lon: 76.935, rating: 4.6, ridesTotal: 412, ridesToday: 5 },
  { id: "DRV-003", name: "Иван Т.", status: "on_ride", lat: 43.232, lon: 76.955, rating: 4.9, ridesTotal: 821, ridesToday: 9 },
  { id: "DRV-004", name: "Асель К.", status: "available", lat: 43.250, lon: 76.920, rating: 4.7, ridesTotal: 289, ridesToday: 3 },
  { id: "DRV-005", name: "Руслан Б.", status: "available", lat: 43.228, lon: 76.960, rating: 4.5, ridesTotal: 557, ridesToday: 6 },
]

const ALMATY_CENTER: [number, number] = [76.945, 43.238]

interface MapInstance {
  destroy: () => void
  setCenter: (center: [number, number]) => void
}

interface MarkerInstance {
  destroy: () => void
  on: (event: string, handler: () => void) => void
}

declare global {
  interface Window {
    mapgl: {
      Map: new (container: string | HTMLElement, options: Record<string, unknown>) => MapInstance
      Marker: new (map: MapInstance, options: Record<string, unknown>) => MarkerInstance
    }
  }
}

function markerSvg(color: string, letter: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.1 27.9 0 18 0z" fill="${color}"/><circle cx="18" cy="16" r="10" fill="white"/><text x="18" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="${color}" font-family="sans-serif">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export default function MapContent() {
  const t = useTranslations("map")
  const tc = useTranslations("common")
  const { locale } = useLocale()
  const [drivers, setDrivers] = useState<ActiveDriver[]>([])
  const [selected, setSelected] = useState<ActiveDriver | null>(null)
  const [backendDown, setBackendDown] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [mapKey, setMapKey] = useState("")
  const mapRef = useRef<MapInstance | null>(null)
  const markersRef = useRef<MarkerInstance[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchDrivers = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/drivers/active")
      if (res.ok) {
        const raw = await res.json()
        const list: unknown[] = Array.isArray(raw) ? raw : []
        if (list.length > 0) {
          const mapped: ActiveDriver[] = list.map((d: unknown) => {
            const dr = d as Record<string, unknown>
            const isOnRide = dr.status === "on_ride" || dr.is_on_ride === true
            return {
              id: String(dr.id ?? dr.driver_id ?? ""),
              name: String(dr.name ?? "—"),
              status: isOnRide ? "on_ride" as const : "available" as const,
              lat: Number(dr.lat ?? dr.latitude ?? 43.238),
              lon: Number(dr.lon ?? dr.longitude ?? 76.945),
              rating: typeof dr.rating === "number" ? dr.rating : 0,
              ridesTotal: typeof dr.rides_total === "number" ? dr.rides_total : 0,
              ridesToday: typeof dr.rides_today === "number" ? dr.rides_today : 0,
            }
          })
          setDrivers(mapped)
          setBackendDown(false)
          setLoaded(true)
          setRefreshing(false)
          return
        }
      }
    } catch {
      // fallback
    }
    setBackendDown(true)
    setDrivers(FALLBACK_DRIVERS)
    setLoaded(true)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchDrivers() }, [fetchDrivers])

  useEffect(() => {
    fetch("/api/map-config")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.map_api_key) setMapKey(data.map_api_key) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!mapKey || !containerRef.current || mapRef.current) return

    function tryInit() {
      if (!window.mapgl || !containerRef.current) return false
      try {
        mapRef.current = new window.mapgl.Map(containerRef.current, { center: ALMATY_CENTER, zoom: 13, key: mapKey })
        setMapReady(true)
        return true
      } catch { return false }
    }

    // Try immediately, then retry every 500ms until script loads
    if (tryInit()) return
    const interval = setInterval(() => {
      if (tryInit()) clearInterval(interval)
    }, 500)
    return () => clearInterval(interval)
  }, [mapKey])

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.mapgl) return
    for (const m of markersRef.current) m.destroy()
    markersRef.current = []
    for (const d of drivers) {
      if (!d.lat || !d.lon) continue
      const color = d.status === "on_ride" ? "#0052CC" : "#22C55E"
      const marker = new window.mapgl.Marker(mapRef.current, { coordinates: [d.lon, d.lat], icon: markerSvg(color, d.name.charAt(0)) })
      marker.on("click", () => setSelected(d))
      markersRef.current.push(marker)
    }
  }, [drivers, mapReady])

  useEffect(() => {
    return () => {
      for (const m of markersRef.current) m.destroy()
      if (mapRef.current) mapRef.current.destroy()
    }
  }, [])

  const onRideCount = drivers.filter((d) => d.status === "on_ride").length
  const availableCount = drivers.filter((d) => d.status === "available").length
  const hasMapKey = !!mapKey

  const statusLabel: Record<DriverStatus, string> = { on_ride: t("statusOnRide"), available: t("statusAvailable") }
  const statusClass: Record<DriverStatus, { chip: string; dot: string }> = {
    on_ride: { chip: "bg-primary/10 text-primary", dot: "bg-primary" },
    available: { chip: "bg-success/10 text-success-dark", dot: "bg-success" },
  }

  const noDriversText = locale === "ru" ? "Нет активных водителей" : locale === "kz" ? "Белсенді жүргізушілер жоқ" : "No active drivers"

  return (
    <>
      <Script src="https://mapgl.2gis.com/api/js/v1" strategy="beforeInteractive" />

      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
            {backendDown && (
              <span className="px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-[11px] font-bold text-warning-dark">{tc("demo")}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        {loaded && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
              <Car className="w-3.5 h-3.5" />
              {t("onRide", { count: onRideCount })}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-xs font-bold text-success-dark">
              <span className="w-2 h-2 rounded-full bg-success" />
              {t("available", { count: availableCount })}
            </div>
            <button onClick={fetchDrivers} disabled={refreshing}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </button>
          </div>
        )}
      </div>

      <div className="flex rounded-2xl border border-border overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] h-[calc(100vh-220px)]">
        <div className="flex-1 relative overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />

          {hasMapKey && loaded && !backendDown && drivers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-card/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg border border-border flex flex-col items-center gap-3">
                <Car className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-bold text-foreground">{noDriversText}</p>
              </div>
            </div>
          )}

          {!hasMapKey && (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #C8E6FA 0%, #B0D9F7 40%, #A8D5F5 70%, #C5E8D0 100%)" }}>
              <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.38) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.38) 1px, transparent 1px)", backgroundSize: "46px 46px" }} />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="none">
                {drivers.map((driver, i) => {
                  const positions = [{ x: 240, y: 290 }, { x: 560, y: 305 }, { x: 330, y: 195 }, { x: 450, y: 380 }, { x: 680, y: 250 }]
                  const pos = positions[i % positions.length]
                  const color = driver.status === "on_ride" ? "#0052CC" : "#22C55E"
                  return (
                    <g key={driver.id} style={{ cursor: "pointer" }} onClick={() => setSelected(driver)}>
                      {driver.status === "on_ride" && <circle cx={pos.x} cy={pos.y} r="22" fill={color} fillOpacity="0.15" />}
                      <circle cx={pos.x} cy={pos.y} r="14" fill="white" stroke={color} strokeWidth={selected?.id === driver.id ? 4 : 2.5} />
                      <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="12" fill={color} fontWeight="bold">{driver.name.charAt(0)}</text>
                    </g>
                  )
                })}
              </svg>
              <div className="absolute top-4 left-4">
                <div className="bg-warning/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-warning/30">
                  <p className="text-xs font-bold text-warning-dark">{tc("demo")}</p>
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">{t("legend")}</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-white" />
                <span className="text-xs text-muted-foreground">{t("statusOnRide")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-success bg-white" />
                <span className="text-xs text-muted-foreground">{t("statusAvailable")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-72 border-l border-border bg-card overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-border/50">
            <p className="text-sm font-bold text-foreground">{t("activeDriversList")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{drivers.length} {t("driversOnline")}</p>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {!loaded && (
              <>{Array.from({ length: 4 }).map((_, i) => <SkeletonDriverCard key={i} />)}</>
            )}
            {loaded && !backendDown && drivers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Car className="w-8 h-8 opacity-20" />
                <p className="text-xs text-center">{noDriversText}</p>
              </div>
            )}
            {drivers.map((driver) => {
              const st = statusClass[driver.status]
              const color = driver.status === "on_ride" ? "#0052CC" : "#22C55E"
              return (
                <button key={driver.id}
                  onClick={() => {
                    setSelected(selected?.id === driver.id ? null : driver)
                    if (mapRef.current && driver.lat && driver.lon) mapRef.current.setCenter([driver.lon, driver.lat])
                  }}
                  className={cn("w-full text-left bg-muted rounded-xl p-3.5 transition-all duration-200 hover:bg-muted/80", selected?.id === driver.id && "ring-2 ring-primary ring-offset-1")}
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: color, color }}>{driver.name.charAt(0)}</div>
                      <span className="text-sm font-bold text-foreground">{driver.name}</span>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", st.chip)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                      {statusLabel[driver.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {driver.rating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning fill-warning" />{driver.rating}</span>}
                    <span>{t("todayRides", { count: driver.ridesToday })}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 animate-fade-in" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-[360px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center text-sm font-bold" style={{ borderColor: selected.status === "on_ride" ? "#0052CC" : "#22C55E", color: selected.status === "on_ride" ? "#0052CC" : "#22C55E" }}>{selected.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-foreground">{selected.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selected.id}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className={cn("rounded-xl px-4 py-3 flex items-center gap-2", statusClass[selected.status].chip)}>
                <span className={cn("w-2 h-2 rounded-full", statusClass[selected.status].dot)} />
                <span className="text-sm font-bold">{statusLabel[selected.status]}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{t("rating")}</p>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1"><Star className="w-4 h-4 text-warning fill-warning" />{selected.rating || "—"}</p>
                </div>
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{t("todayLabel")}</p>
                  <p className="text-sm font-bold text-foreground">{selected.ridesToday} {t("ridesUnit")}</p>
                </div>
                <div className="bg-muted rounded-xl p-4 col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{t("totalRides")}</p>
                  <p className="text-sm font-bold text-foreground">{selected.ridesTotal || "—"}</p>
                </div>
                {selected.lat && selected.lon && (
                  <div className="bg-muted rounded-xl p-4 col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">GPS</p>
                    <p className="text-sm font-mono text-foreground">{selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
