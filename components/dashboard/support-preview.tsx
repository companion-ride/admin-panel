"use client"

import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"
import { Clock } from "lucide-react"
import { useTranslations } from "next-intl"

const recentTickets = [
  { id: "T-001", user: "Айдар К.", subject: "Водитель не приехал", status: "open" as const, time: "15 мин назад" },
  { id: "T-002", user: "Мария С.", subject: "Проблема с оплатой", status: "open" as const, time: "1 ч назад" },
  { id: "T-003", user: "Руслан М.", subject: "Приложение вылетает при бронировании", status: "pending" as const, time: "3 ч назад" },
]

const statusMap = {
  open: "error",
  pending: "warning",
  resolved: "success",
} as const

export function SupportPreview() {
  const t = useTranslations("dashboard")

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-bold text-foreground">{t("recentTickets")}</h4>
        <Link href="/support" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
          {t("viewAll")}
        </Link>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {recentTickets.map((ticket) => (
          <div key={ticket.id} className="flex flex-col gap-2 p-4 rounded-xl bg-background border border-border/50 hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">{ticket.id}</span>
              <StatusBadge variant={statusMap[ticket.status]}>{ticket.status}</StatusBadge>
            </div>
            <p className="text-sm font-bold text-foreground leading-snug">{ticket.subject}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{ticket.user}</span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {ticket.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
