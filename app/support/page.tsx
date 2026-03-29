"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { StatusBadge } from "@/components/status-badge"
import { Search, Send, Clock, User, MessageSquare, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

type TicketStatus = "open" | "pending" | "resolved" | "closed"
type TicketPriority = "high" | "medium" | "low"

interface Message {
  id: string
  sender: "user" | "admin"
  senderName: string
  text: string
  timestamp: string
}

interface Ticket {
  id: string
  user: string
  userPhone: string
  subject: string
  category: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  lastUpdated: string
  messages: Message[]
}

// Static (non-translatable) ticket data: ids, names, phones, priorities, initial statuses, message structure
const TICKET_STATIC = [
  {
    id: "T-001", user: "Айдар Кайратов", userPhone: "+7 707 123 4567", userShort: "Айдар К.",
    status: "open" as TicketStatus, priority: "high" as TicketPriority,
    msgs: [
      { id: "m1", sender: "user" as const, timestamp: "14:15" },
      { id: "m2", sender: "user" as const, timestamp: "14:18" },
    ],
  },
  {
    id: "T-002", user: "Мария Сидорова", userPhone: "+7 702 555 1234", userShort: "Мария С.",
    status: "open" as TicketStatus, priority: "high" as TicketPriority,
    msgs: [
      { id: "m1", sender: "user" as const, timestamp: "13:00" },
      { id: "m2", sender: "admin" as const, timestamp: "13:15" },
      { id: "m3", sender: "user" as const, timestamp: "13:20" },
    ],
  },
  {
    id: "T-003", user: "Руслан Муратов", userPhone: "+7 705 333 9876", userShort: "Руслан М.",
    status: "pending" as TicketStatus, priority: "medium" as TicketPriority,
    msgs: [
      { id: "m1", sender: "user" as const, timestamp: "11:30" },
      { id: "m2", sender: "admin" as const, timestamp: "11:45" },
      { id: "m3", sender: "user" as const, timestamp: "12:00" },
      { id: "m4", sender: "admin" as const, timestamp: "12:30" },
    ],
  },
  {
    id: "T-004", user: "Елена Ким", userPhone: "+7 700 888 1122", userShort: "Елена К.",
    status: "resolved" as TicketStatus, priority: "low" as TicketPriority,
    msgs: [
      { id: "m1", sender: "user" as const, timestamp: "16:00" },
      { id: "m2", sender: "admin" as const, timestamp: "16:30" },
      { id: "m3", sender: "user" as const, timestamp: "17:00" },
    ],
  },
  {
    id: "T-005", user: "Тимур Алиев", userPhone: "+7 771 666 5544", userShort: "Тимур А.",
    status: "open" as TicketStatus, priority: "medium" as TicketPriority,
    msgs: [
      { id: "m1", sender: "user" as const, timestamp: "12:00" },
    ],
  },
  {
    id: "T-006", user: "Динара Жаксылык", userPhone: "+7 747 999 8877", userShort: "Динара Ж.",
    status: "closed" as TicketStatus, priority: "low" as TicketPriority,
    msgs: [
      { id: "m1", sender: "user" as const, timestamp: "09:00" },
      { id: "m2", sender: "admin" as const, timestamp: "09:30" },
      { id: "m3", sender: "user" as const, timestamp: "09:45" },
    ],
  },
]

type FilterType = "all" | TicketStatus

// Mutations accumulate runtime changes (admin replies, status updates) separately
// so they survive locale switches without losing admin-typed content
type TicketMutations = Record<string, {
  extraMessages: Message[]
  status?: TicketStatus
  lastUpdated?: string
}>

export default function SupportPage() {
  const t = useTranslations("support")
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [mutations, setMutations] = useState<TicketMutations>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Build base tickets from t() — re-runs automatically on locale change
  const baseTickets = useMemo<Ticket[]>(() => {
    const adminSender = t("adminSender")
    return TICKET_STATIC.map((s) => {
      const key = s.id.replace("T-0", "t0") // "T-001" → "t001"
      return {
        id: s.id,
        user: s.user,
        userPhone: s.userPhone,
        status: s.status,
        priority: s.priority,
        subject: t(`ticketData.${key}.subject`),
        category: t(`ticketData.${key}.category`),
        createdAt: t(`ticketData.${key}.createdAt`),
        lastUpdated: t(`ticketData.${key}.lastUpdated`),
        messages: s.msgs.map((m) => ({
          id: m.id,
          sender: m.sender,
          senderName: m.sender === "admin" ? adminSender : s.userShort,
          text: t(`ticketData.${key}.${m.id}`),
          timestamp: m.timestamp,
        })),
      }
    })
  }, [t])

  // Merge base tickets with runtime mutations
  const mergedTickets = useMemo<Ticket[]>(() => {
    return baseTickets.map((ticket) => {
      const mut = mutations[ticket.id]
      if (!mut) return ticket
      return {
        ...ticket,
        messages: [...ticket.messages, ...mut.extraMessages],
        status: mut.status ?? ticket.status,
        lastUpdated: mut.lastUpdated ?? ticket.lastUpdated,
      }
    })
  }, [baseTickets, mutations])

  const selectedTicket = selectedTicketId
    ? mergedTickets.find((tk) => tk.id === selectedTicketId) ?? null
    : null

  const statusConfig: Record<TicketStatus, { variant: "error" | "warning" | "success" | "neutral" }> = {
    open:     { variant: "error"   },
    pending:  { variant: "warning" },
    resolved: { variant: "success" },
    closed:   { variant: "neutral" },
  }

  const priorityConfig: Record<TicketPriority, { variant: "error" | "warning" | "info" }> = {
    high:   { variant: "error"   },
    medium: { variant: "warning" },
    low:    { variant: "info"    },
  }

  const filteredTickets = mergedTickets.filter((ticket) => {
    const matchesFilter = filter === "all" || ticket.status === filter
    const matchesSearch =
      searchQuery === "" ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filters: { label: string; value: FilterType; count: number }[] = [
    { label: t("filters.all"),      value: "all",      count: mergedTickets.length },
    { label: t("filters.open"),     value: "open",     count: mergedTickets.filter((tb) => tb.status === "open").length },
    { label: t("filters.pending"),  value: "pending",  count: mergedTickets.filter((tb) => tb.status === "pending").length },
    { label: t("filters.resolved"), value: "resolved", count: mergedTickets.filter((tb) => tb.status === "resolved").length },
    { label: t("filters.closed"),   value: "closed",   count: mergedTickets.filter((tb) => tb.status === "closed").length },
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedTicket?.messages.length])

  function handleSendReply() {
    if (!replyText.trim() || !selectedTicketId || !selectedTicket) return
    const newMessage: Message = {
      id: `m${Date.now()}`,
      sender: "admin",
      senderName: t("adminSender"),
      text: replyText.trim(),
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    }
    setMutations((prev) => {
      const existing = prev[selectedTicketId] ?? { extraMessages: [] }
      return {
        ...prev,
        [selectedTicketId]: {
          extraMessages: [...existing.extraMessages, newMessage],
          status: selectedTicket.status === "open" ? "pending" : (existing.status ?? selectedTicket.status),
          lastUpdated: t("justNow"),
        },
      }
    })
    setReplyText("")
  }

  function handleResolveTicket() {
    if (!selectedTicketId) return
    setMutations((prev) => {
      const existing = prev[selectedTicketId] ?? { extraMessages: [] }
      return {
        ...prev,
        [selectedTicketId]: {
          ...existing,
          status: "resolved" as TicketStatus,
          lastUpdated: t("justNow"),
        },
      }
    })
  }

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-220px)]">
        {/* Left: ticket list */}
        <div className="w-[420px] flex flex-col bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-border/50">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full h-10 pl-10 pr-4 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto hide-scrollbar">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0",
                    filter === f.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {f.label}
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-border/30 hover:bg-muted/50 transition-all",
                  selectedTicketId === ticket.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{ticket.id}</span>
                    <StatusBadge variant={priorityConfig[ticket.priority].variant}>{t(`priority.${ticket.priority}`)}</StatusBadge>
                  </div>
                  <StatusBadge variant={statusConfig[ticket.status].variant}>{t(`status.${ticket.status}`)}</StatusBadge>
                </div>
                <p className="text-sm font-bold text-foreground mb-1 leading-snug">{ticket.subject}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{ticket.user}</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ticket.lastUpdated}
                  </span>
                </div>
              </button>
            ))}
            {filteredTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">{t("noTickets")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: chat */}
        <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="p-5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{selectedTicket.user}</h3>
                      <span className="text-xs text-muted-foreground">{selectedTicket.userPhone}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedTicket.subject} · {selectedTicket.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                    <button
                      onClick={handleResolveTicket}
                      className="h-9 px-4 rounded-xl bg-success/10 text-success text-xs font-bold hover:bg-success/20 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t("resolve")}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                <div className="flex items-center justify-center">
                  <span className="text-[11px] font-bold text-muted-foreground/50 bg-muted px-3 py-1 rounded-full">
                    {selectedTicket.createdAt}
                  </span>
                </div>
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn("flex flex-col max-w-[75%]", msg.sender === "admin" ? "self-end items-end" : "self-start items-start")}
                  >
                    <span className="text-[11px] font-bold text-muted-foreground/50 mb-1 px-1">{msg.senderName}</span>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.sender === "admin" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {selectedTicket.status !== "closed" && (
                <div className="p-4 border-t border-border/50">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply() } }}
                        placeholder={t("replyPlaceholder")}
                        rows={2}
                        className="w-full px-4 py-3 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-bold mb-1 text-foreground/40">{t("selectTicket")}</p>
              <p className="text-sm">{t("selectTicketDesc")}</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
