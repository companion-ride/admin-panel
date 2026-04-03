"use client"

import { useState, useEffect } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useTranslations } from "next-intl"
import { Calendar } from "lucide-react"
import { DatePicker } from "@/components/date-picker"

interface ChartPoint {
  label: string
  rides: number
}

type PeriodType = "week" | "month" | "3months" | "year" | "custom"

function getDateRange(period: PeriodType, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const to = new Date()
  to.setHours(23, 59, 59, 999)

  if (period === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo + "T23:59:59.999") }
  }

  const from = new Date()
  if (period === "week") {
    from.setDate(from.getDate() - 6)
  } else if (period === "month") {
    from.setDate(from.getDate() - 29)
  } else if (period === "3months") {
    from.setMonth(from.getMonth() - 3)
  } else if (period === "year") {
    from.setFullYear(from.getFullYear() - 1)
  }
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function buildChartData(
  rides: { createdAt: string }[],
  period: PeriodType,
  monthNames: string[],
  dayNames: string[],
  customFrom?: string,
  customTo?: string,
): ChartPoint[] {
  const { from, to } = getDateRange(period, customFrom, customTo)
  const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 31) {
    const counts: Record<string, number> = {}
    const labels: Record<string, string> = {}

    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(from)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      counts[key] = 0
      labels[key] = period === "week"
        ? dayNames[d.getDay()]
        : `${d.getDate()} ${monthNames[d.getMonth()]}`
    }

    for (const r of rides) {
      const d = new Date(r.createdAt)
      if (d >= from && d <= to) {
        const key = d.toISOString().slice(0, 10)
        if (key in counts) counts[key]++
      }
    }

    return Object.entries(counts).map(([key, count]) => ({
      label: labels[key],
      rides: count,
    }))
  }

  const counts: Record<string, number> = {}
  const d = new Date(from.getFullYear(), from.getMonth(), 1)
  while (d <= to) {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    counts[key] = 0
    d.setMonth(d.getMonth() + 1)
  }

  for (const r of rides) {
    const rd = new Date(r.createdAt)
    if (rd >= from && rd <= to) {
      const key = `${rd.getFullYear()}-${rd.getMonth()}`
      if (key in counts) counts[key]++
    }
  }

  return Object.entries(counts).map(([key, count]) => {
    const [, m] = key.split("-")
    return { label: monthNames[Number(m)], rides: count }
  })
}

export function RidesChart() {
  const t = useTranslations("dashboard")
  const tc = useTranslations("common")
  const monthNames = MONTH_KEYS.map((k) => tc(`months.${k}`))
  const dayNames = DAY_KEYS.map((k) => tc(`days.${k}`))
  const ridesLabel = tc("rides")

  const FALLBACK_DATA: ChartPoint[] = [
    { label: monthNames[7], rides: 680 },
    { label: monthNames[8], rides: 820 },
    { label: monthNames[9], rides: 750 },
    { label: monthNames[10], rides: 920 },
    { label: monthNames[11], rides: 1050 },
    { label: monthNames[0], rides: 980 },
    { label: monthNames[1], rides: 1248 },
  ]

  const [data, setData] = useState<ChartPoint[]>(FALLBACK_DATA)
  const [period, setPeriod] = useState<PeriodType>("week")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [showCustom, setShowCustom] = useState(false)
  const [backendDown, setBackendDown] = useState(false)

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return

    async function load() {
      try {
        // For longer periods, try stats API first (has pre-aggregated monthly data)
        if (period === "3months" || period === "year") {
          const statsRes = await fetch("/api/dashboard/stats")
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            const chart = statsData?.rides_chart
            if (Array.isArray(chart)) {
              // Build a map from API data
              const apiData: Record<string, number> = {}
              for (const c of chart) {
                apiData[c.month] = c.rides
              }

              // Generate all months for the period
              const monthCount = period === "year" ? 12 : 3
              const now = new Date()
              const points: ChartPoint[] = []
              for (let i = monthCount - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                points.push({
                  label: monthNames[d.getMonth()],
                  rides: apiData[key] ?? 0,
                })
              }
              setData(points)
              setBackendDown(false)
              return
            }
          }
        }

        // For shorter periods or fallback, fetch individual rides
        const res = await fetch("/api/rides?limit=100")
        if (res.ok) {
          const json = await res.json()
          const items = Array.isArray(json) ? json : json?.rides ?? json?.items ?? []
          if (Array.isArray(items)) {
            const mapped = items.map((r: Record<string, unknown>) => ({
              createdAt: String(r.createdAt ?? r.created_at ?? ""),
            })).filter(r => r.createdAt)

            setData(buildChartData(mapped, period, monthNames, dayNames, customFrom, customTo))
            setBackendDown(false)
            return
          }
        }
      } catch {
        // backend down — use fallback
      }
      setBackendDown(true)
      setData(FALLBACK_DATA)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo])

  function handlePeriodChange(p: PeriodType) {
    if (p === "custom") {
      setShowCustom(true)
      const now = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(now.getDate() - 7)
      setCustomFrom(weekAgo.toISOString().slice(0, 10))
      setCustomTo(now.toISOString().slice(0, 10))
      setPeriod("custom")
    } else {
      setShowCustom(false)
      setPeriod(p)
    }
  }

  const periods: PeriodType[] = ["week", "month", "3months", "year", "custom"]

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h4 className="text-lg font-bold text-foreground">{t("chartTitle")}</h4>
          {backendDown && (
            <span className="px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-[10px] font-bold text-warning-dark">
              {tc("demo")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-xl border border-border/50">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                period === p ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "custom" && <Calendar className="w-3 h-3" />}
              {t(`chart.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {showCustom && period === "custom" && (
        <div className="flex items-center gap-2 mb-4 animate-fade-in">
          <DatePicker value={customFrom} onChange={setCustomFrom} />
          <span className="text-xs text-muted-foreground font-bold">—</span>
          <DatePicker value={customTo} onChange={setCustomTo} />
        </div>
      )}

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRides" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0052CC" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0052CC" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF", fontWeight: 600 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1F2937", border: "none", borderRadius: "12px", padding: "8px 14px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}
              labelStyle={{ color: "#9CA3AF", fontSize: 11, fontWeight: 700 }}
              itemStyle={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}
              formatter={(value: number) => [`${value}`, ridesLabel]}
            />
            <Area type="monotone" dataKey="rides" stroke="#0052CC" strokeWidth={3} fillOpacity={1} fill="url(#colorRides)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
