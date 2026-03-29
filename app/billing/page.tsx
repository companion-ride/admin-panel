"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import {
  X,
  TrendingUp,
  Users,
  Percent,
  Clock,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useLocale } from "@/components/locale-provider"

const COMMISSION_RATE = 12

type PaymentStatus = "paid" | "pending" | "overdue"

interface DriverPayment {
  id: string
  name: string
  phone: string
  rides: number
  earned: number
  commissionAmount: number
  status: PaymentStatus
  paidAt: string | null
  dueDate: string
  history: { month: string; rides: number; earned: number; commission: number; status: PaymentStatus }[]
}

const drivers: DriverPayment[] = [
  { id: "1", name: "Нурлан Абенов", phone: "+7 701 234 56 78", rides: 187, earned: 243100, commissionAmount: 29172, status: "paid", paidAt: "2025-02-03", dueDate: "2025-02-10", history: [{ month: "2025-01", rides: 172, earned: 223600, commission: 26832, status: "paid" }, { month: "2024-12", rides: 195, earned: 253500, commission: 30420, status: "paid" }, { month: "2024-11", rides: 163, earned: 211900, commission: 25428, status: "paid" }] },
  { id: "2", name: "Дамир Сейткали", phone: "+7 702 345 67 89", rides: 143, earned: 185900, commissionAmount: 22308, status: "paid", paidAt: "2025-02-05", dueDate: "2025-02-10", history: [{ month: "2025-01", rides: 131, earned: 170300, commission: 20436, status: "paid" }, { month: "2024-12", rides: 158, earned: 205400, commission: 24648, status: "paid" }, { month: "2024-11", rides: 119, earned: 154700, commission: 18564, status: "paid" }] },
  { id: "3", name: "Асем Жаксыбекова", phone: "+7 705 456 78 90", rides: 98, earned: 127400, commissionAmount: 15288, status: "pending", paidAt: null, dueDate: "2025-02-10", history: [{ month: "2025-01", rides: 87, earned: 113100, commission: 13572, status: "paid" }, { month: "2024-12", rides: 104, earned: 135200, commission: 16224, status: "paid" }, { month: "2024-11", rides: 92, earned: 119600, commission: 14352, status: "paid" }] },
  { id: "4", name: "Серик Омаров", phone: "+7 707 567 89 01", rides: 212, earned: 275600, commissionAmount: 33072, status: "paid", paidAt: "2025-02-01", dueDate: "2025-02-10", history: [{ month: "2025-01", rides: 198, earned: 257400, commission: 30888, status: "paid" }, { month: "2024-12", rides: 221, earned: 287300, commission: 34476, status: "paid" }, { month: "2024-11", rides: 189, earned: 245700, commission: 29484, status: "paid" }] },
  { id: "5", name: "Айгерим Бектурова", phone: "+7 708 678 90 12", rides: 74, earned: 96200, commissionAmount: 11544, status: "overdue", paidAt: null, dueDate: "2025-01-10", history: [{ month: "2025-01", rides: 68, earned: 88400, commission: 10608, status: "overdue" }, { month: "2024-12", rides: 81, earned: 105300, commission: 12636, status: "paid" }, { month: "2024-11", rides: 72, earned: 93600, commission: 11232, status: "paid" }] },
  { id: "6", name: "Азамат Калиев", phone: "+7 701 789 01 23", rides: 156, earned: 202800, commissionAmount: 24336, status: "pending", paidAt: null, dueDate: "2025-02-10", history: [{ month: "2025-01", rides: 144, earned: 187200, commission: 22464, status: "paid" }, { month: "2024-12", rides: 169, earned: 219700, commission: 26364, status: "paid" }, { month: "2024-11", rides: 138, earned: 179400, commission: 21528, status: "paid" }] },
  { id: "7", name: "Жанна Мусаева", phone: "+7 702 890 12 34", rides: 63, earned: 81900, commissionAmount: 9828, status: "paid", paidAt: "2025-02-07", dueDate: "2025-02-10", history: [{ month: "2025-01", rides: 57, earned: 74100, commission: 8892, status: "paid" }, { month: "2024-12", rides: 71, earned: 92300, commission: 11076, status: "paid" }, { month: "2024-11", rides: 59, earned: 76700, commission: 9204, status: "paid" }] },
  { id: "8", name: "Бауыржан Ахметов", phone: "+7 705 901 23 45", rides: 178, earned: 231400, commissionAmount: 27768, status: "overdue", paidAt: null, dueDate: "2025-01-10", history: [{ month: "2025-01", rides: 165, earned: 214500, commission: 25740, status: "overdue" }, { month: "2024-12", rides: 182, earned: 236600, commission: 28392, status: "paid" }, { month: "2024-11", rides: 171, earned: 222300, commission: 26676, status: "paid" }] },
]

export default function BillingPage() {
  const t = useTranslations("billing")
  const tc = useTranslations("common")
  const { locale } = useLocale()
  const localeCode = locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US"

  const [selected, setSelected] = useState<DriverPayment | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentStatus>("all")

  const statusLabels: Record<PaymentStatus, string> = {
    paid: t("paymentStatus.paid"),
    pending: t("paymentStatus.pending"),
    overdue: t("paymentStatus.overdue"),
  }

  const statusConfig: Record<PaymentStatus, { className: string; dot: string }> = {
    paid: { className: "bg-success/10 text-success-dark", dot: "bg-success" },
    pending: { className: "bg-warning/10 text-warning-dark", dot: "bg-warning" },
    overdue: { className: "bg-error/10 text-error", dot: "bg-error" },
  }

  function fmt(n: number) {
    return n.toLocaleString(localeCode) + " ₸"
  }

  function fmtDate(d: string, opts?: Intl.DateTimeFormatOptions) {
    return new Date(d).toLocaleDateString(localeCode, opts ?? { day: "numeric", month: "short" })
  }

  function fmtMonth(isoMonth: string) {
    const [y, m] = isoMonth.split("-")
    return new Date(Number(y), Number(m) - 1).toLocaleDateString(localeCode, { month: "long", year: "numeric" })
  }

  const totalCollected = drivers.filter((d) => d.status === "paid").reduce((s, d) => s + d.commissionAmount, 0)
  const totalPending = drivers.filter((d) => d.status !== "paid").reduce((s, d) => s + d.commissionAmount, 0)
  const totalDrivers = drivers.length
  const avgCommission = Math.round(drivers.reduce((s, d) => s + d.commissionAmount, 0) / totalDrivers)

  const filtered = filterStatus === "all" ? drivers : drivers.filter((d) => d.status === filterStatus)

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-[15px] text-muted-foreground mt-1">{t("subtitle", { rate: COMMISSION_RATE })}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6 stagger-children">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t("stats.collected")}</span>
            <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalCollected)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("stats.driversPaid", { count: drivers.filter((d) => d.status === "paid").length })}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t("stats.pending")}</span>
            <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center"><Clock className="w-4 h-4 text-warning" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(totalPending)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("stats.driversCount", { count: drivers.filter((d) => d.status !== "paid").length })}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t("stats.activeDrivers")}</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalDrivers}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("stats.madeRides")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t("stats.avgCommission")}</span>
            <div className="w-8 h-8 rounded-xl bg-info/10 flex items-center justify-center"><Percent className="w-4 h-4 text-info" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(avgCommission)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("stats.perDriver")}</p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 mb-6 flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Percent className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground mb-1">{t("model.title")}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("model.text", { rate: COMMISSION_RATE })}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h3 className="text-base font-bold text-foreground">{t("table.title")}</h3>
          <div className="flex items-center gap-1.5">
            {(["all", "paid", "pending", "overdue"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn("px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all", filterStatus === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {s === "all" ? t("filters.all") : statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/50">
            <tr>
              {[t("table.driver"), t("table.rides"), t("table.earnings"), t("table.commission", { rate: COMMISSION_RATE }), t("table.status"), t("table.deadline"), ""].map((h) => (
                <th key={h} className="px-6 py-3 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((driver) => {
              const st = statusConfig[driver.status]
              return (
                <tr key={driver.id} onClick={() => setSelected(driver)}
                  className={cn("hover:bg-muted/40 transition-all cursor-pointer", selected?.id === driver.id && "bg-primary/5")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">{driver.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">{driver.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{driver.rides}</td>
                  <td className="px-6 py-4 text-sm font-mono font-bold text-foreground">{fmt(driver.earned)}</td>
                  <td className="px-6 py-4 text-sm font-mono font-bold text-primary">{fmt(driver.commissionAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold", st.className)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", st.dot)} />
                      {statusLabels[driver.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {fmtDate(driver.paidAt ?? driver.dueDate)}
                  </td>
                  <td className="px-6 py-4"><ChevronRight className="w-4 h-4 text-muted-foreground/40" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 animate-fade-in" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-[440px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground text-sm font-bold">{selected.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-foreground">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">{t("drawer.currentPeriod")}</p>
                <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("drawer.ridesCompleted")}</span>
                    <span className="text-sm font-bold text-foreground">{selected.rides}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("drawer.totalEarnings")}</span>
                    <span className="text-sm font-bold text-foreground">{fmt(selected.earned)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("drawer.commissionRate")}</span>
                    <span className="text-sm font-bold text-foreground">{COMMISSION_RATE}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{t("drawer.toPay")}</span>
                    <span className="text-base font-bold text-primary">{fmt(selected.commissionAmount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">{t("drawer.paymentStatus")}</p>
                <div className={cn("rounded-xl p-4",
                  selected.status === "paid" ? "bg-success/8 border border-success/20" :
                  selected.status === "pending" ? "bg-warning/8 border border-warning/20" :
                  "bg-error/8 border border-error/20"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("w-2 h-2 rounded-full", statusConfig[selected.status].dot)} />
                    <span className={cn("text-sm font-bold",
                      selected.status === "paid" ? "text-success-dark" :
                      selected.status === "pending" ? "text-warning-dark" : "text-error"
                    )}>{statusLabels[selected.status]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selected.status === "paid"
                      ? t("drawer.paidOn", { date: fmtDate(selected.paidAt!, { day: "numeric", month: "long", year: "numeric" }) })
                      : selected.status === "pending"
                      ? t("drawer.dueDate", { date: fmtDate(selected.dueDate, { day: "numeric", month: "long", year: "numeric" }) })
                      : t("drawer.overdueFrom", { date: fmtDate(selected.dueDate, { day: "numeric", month: "long", year: "numeric" }) })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">{t("drawer.history")}</p>
                <div className="flex flex-col gap-2">
                  {selected.history.map((h) => {
                    const hst = statusConfig[h.status]
                    return (
                      <div key={h.month} className="bg-muted/40 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-foreground">{fmtMonth(h.month)}</span>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", hst.className)}>
                            <span className={cn("w-1 h-1 rounded-full", hst.dot)} />
                            {statusLabels[h.status]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t("drawer.ridesAndEarnings", { rides: h.rides, earned: fmt(h.earned) })}</span>
                          <span className="font-bold text-foreground">{fmt(h.commission)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {selected.status !== "paid" && (
              <div className="p-6 border-t border-border/50">
                <button className="w-full h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">
                  {t("drawer.markPaid")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
