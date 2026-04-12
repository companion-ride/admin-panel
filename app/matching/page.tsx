"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { StatCard } from "@/components/stat-card"
import { CheckCircle, Clock, Shuffle, AlertTriangle, Save, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useToast } from "@/components/toast"
import { backendFetch } from "@/lib/backend-fetch"

interface MatchingParams {
  dropoffRadiusM: number
  maxPassengers: number
  minDriverDistanceM: number
  minEtaSeconds: number
  pickupRadiusM: number
}

interface MatchingStats {
  avgPassengersPerRide: number
  avgWaitSeconds: number
  cancellationRate: number
  matchRate: number
  ridesByStatus: Record<string, number>
  totalRides: number
  totalSubRides: number
}

const DEFAULT_PARAMS: MatchingParams = {
  dropoffRadiusM: 5000,
  maxPassengers: 4,
  minDriverDistanceM: 5000,
  minEtaSeconds: 300,
  pickupRadiusM: 5000,
}

export default function MatchingPage() {
  const t = useTranslations("matching")
  const { toast } = useToast()
  const [params, setParams] = useState<MatchingParams>(DEFAULT_PARAMS)
  const [stats, setStats] = useState<MatchingStats | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [paramsRes, statsRes] = await Promise.all([
        fetch("/api/matching/params"),
        fetch("/api/matching/stats"),
      ])
      if (paramsRes.ok) {
        const data = await paramsRes.json()
        if (data && !data.error) {
          setParams(data)
          setIsLive(true)
        }
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        if (data && !data.error) {
          setStats(data)
        }
      }
    } catch {
      // defaults
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await backendFetch("/api/matching/params", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (res.ok) {
        toast(t("params.saved"), "ok")
        setIsLive(true)
      } else {
        const data = await res.json().catch(() => null)
        toast(data?.error ?? "Ошибка сохранения", "err")
      }
    } catch {
      toast("Ошибка подключения", "err")
    } finally {
      setSaving(false)
    }
  }

  function formatWait(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
            {!isLive && !loading && (
              <span className="px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-[11px] font-bold text-warning-dark">{t("local")}</span>
            )}
            {isLive && (
              <span className="px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-[11px] font-bold text-success">Live</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t("stats.matchRate")}
          value={stats ? `${stats.matchRate.toFixed(1)}%` : "—"}
          change="" changeType="positive"
          icon={CheckCircle} iconColor="text-success" iconBg="bg-success/10"
        />
        <StatCard
          title={t("stats.avgWait")}
          value={stats ? formatWait(stats.avgWaitSeconds) : "—"}
          change="" changeType="positive"
          icon={Clock} iconColor="text-info" iconBg="bg-info/10"
        />
        <StatCard
          title={t("stats.totalRides")}
          value={stats ? stats.totalRides.toLocaleString("ru-RU") : "—"}
          change="" changeType="positive"
          icon={Shuffle} iconColor="text-warning" iconBg="bg-warning/10"
        />
        <StatCard
          title={t("stats.cancellation")}
          value={stats ? `${stats.cancellationRate.toFixed(1)}%` : "—"}
          change="" changeType="negative"
          icon={AlertTriangle} iconColor="text-error" iconBg="bg-error/10"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] max-w-2xl">
        <div className="p-6 border-b border-border/50">
          <h4 className="text-base font-bold text-foreground">{t("params.title")}</h4>
        </div>
        <div className="p-6 flex flex-col gap-5">
          {/* Sliders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">{t("params.pickupRadius")}</label>
              <span className="text-sm font-bold text-foreground">{params.pickupRadiusM}</span>
            </div>
            <input type="range" min="500" max="10000" step="500" value={params.pickupRadiusM} onChange={(e) => setParams({ ...params, pickupRadiusM: Number(e.target.value) })} className="w-full accent-primary" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-muted-foreground">{t("params.dropoffRadius")}</label>
              <span className="text-sm font-bold text-foreground">{params.dropoffRadiusM}</span>
            </div>
            <input type="range" min="500" max="10000" step="500" value={params.dropoffRadiusM} onChange={(e) => setParams({ ...params, dropoffRadiusM: Number(e.target.value) })} className="w-full accent-primary" />
          </div>

          {/* Number inputs */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{t("params.maxPassengers")}</label>
              <input
                type="number" value={params.maxPassengers} min={1} max={10}
                onChange={(e) => setParams({ ...params, maxPassengers: Number(e.target.value) })}
                className="h-10 px-3 bg-muted border border-border/50 rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{t("params.minDriverDistance")}</label>
              <input
                type="number" value={params.minDriverDistanceM} min={100} max={20000} step={500}
                onChange={(e) => setParams({ ...params, minDriverDistanceM: Number(e.target.value) })}
                className="h-10 px-3 bg-muted border border-border/50 rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{t("params.minEta")}</label>
              <input
                type="number" value={params.minEtaSeconds} min={60} max={3600} step={60}
                onChange={(e) => setParams({ ...params, minEtaSeconds: Number(e.target.value) })}
                className="h-10 px-3 bg-muted border border-border/50 rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />{t("params.saving")}</> : <><Save className="w-4 h-4" />{t("params.saveParams")}</>}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
