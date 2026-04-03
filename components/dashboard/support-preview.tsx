"use client"

import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"
import { Clock, Inbox } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect, useCallback } from "react"

interface Ticket {
  id: string
  user_id: string
  subject: string
  status: "open" | "pending" | "resolved" | "closed"
  created_at: string
}

const statusMap = {
  open: "error",
  pending: "warning",
  resolved: "success",
  closed: "neutral",
} as const

function timeAgo(dateStr: string, t: (key: string, values?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t("timeAgo.now")
  if (mins < 60) return t("timeAgo.minutes", { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t("timeAgo.hours", { n: hours })
  const days = Math.floor(hours / 24)
  return t("timeAgo.days", { n: days })
}

export function SupportPreview() {
  const t = useTranslations("dashboard")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets?limit=5")
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets ?? [])
      }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-bold text-foreground">{t("recentTickets")}</h4>
        <Link href="/support" className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
          {t("viewAll")}
        </Link>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Inbox className="w-8 h-8 opacity-30" />
            <p className="text-sm">{t("noTickets")}</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="flex flex-col gap-2 p-4 rounded-xl bg-background border border-border/50 hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{ticket.id.slice(0, 8)}</span>
                <StatusBadge variant={statusMap[ticket.status] ?? "neutral"}>{ticket.status.toUpperCase()}</StatusBadge>
              </div>
              <p className="text-sm font-bold text-foreground leading-snug">{ticket.subject}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{ticket.user_id.slice(0, 8)}</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo(ticket.created_at, t)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
