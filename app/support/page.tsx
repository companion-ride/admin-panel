"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { StatusBadge } from "@/components/status-badge"
import { Search, Send, Clock, MessageSquare, Inbox, RefreshCw, ChevronDown, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useLocale } from "@/components/locale-provider"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/toast"
import { SkeletonTable } from "@/components/skeleton"
import { useChatSocket } from "@/hooks/use-chat-socket"

type TicketStatus = "open" | "pending" | "resolved" | "closed"

interface Ticket {
  id: string
  user_id: string
  subject: string
  category: string
  priority: string
  status: TicketStatus
  created_at: string
  updated_at: string
  room_id: string
}

interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
}

function normalizeDate(d: string) {
  return d.endsWith("Z") || d.includes("+") ? d : d + "Z"
}

export default function SupportPage() {
  const t = useTranslations("support")
  const tc = useTranslations("common")
  const { locale } = useLocale()
  const { admin } = useAuth()
  const { toast } = useToast()
  const localeCode = locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US"

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | TicketStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusConfig: Record<TicketStatus, { variant: "error" | "warning" | "success" | "neutral" }> = {
    open: { variant: "error" },
    pending: { variant: "warning" },
    resolved: { variant: "success" },
    closed: { variant: "neutral" },
  }

  const statusLabels: Record<TicketStatus, string> = {
    open: t("status.open"),
    pending: t("status.pending"),
    resolved: t("status.resolved"),
    closed: t("status.closed"),
  }

  const categoryLabels: Record<string, string> = {
    rides: locale === "ru" ? "Поездки" : locale === "kz" ? "Сапарлар" : "Rides",
    billing: locale === "ru" ? "Оплата" : locale === "kz" ? "Төлем" : "Billing",
    account: locale === "ru" ? "Аккаунт" : locale === "kz" ? "Аккаунт" : "Account",
    other: locale === "ru" ? "Прочее" : locale === "kz" ? "Басқа" : "Other",
  }

  const priorityLabels: Record<string, { label: string; color: string }> = {
    high: { label: t("priority.high"), color: "text-error" },
    medium: { label: t("priority.medium"), color: "text-warning" },
    low: { label: t("priority.low"), color: "text-muted-foreground" },
  }

  // ── Socket.IO: real-time messages ──
  const { connected: isSocketConnected } = useChatSocket({
    roomId: selectedTicket?.room_id ?? null,
    onMessage: useCallback((msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.message_id)) return prev
        return [...prev, {
          id: msg.message_id,
          room_id: msg.room_id,
          sender_id: msg.sender_id,
          content: msg.content,
          created_at: msg.created_at,
        }]
      })
    }, []),
    onConnectionChange: useCallback((c: boolean) => setSocketConnected(c), []),
  })

  // Fallback polling only when socket is disconnected
  useEffect(() => {
    if (isSocketConnected || !selectedTicket) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    pollRef.current = setInterval(() => pollMessages(selectedTicket.id), 5000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSocketConnected, selectedTicket?.id])

  // ── Fetch tickets ──
  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)
      if (searchQuery.trim()) params.set("search", searchQuery.trim())
      params.set("limit", "50")
      const res = await fetch(`/api/tickets?${params}`)
      if (!res.ok) {
        if (res.status === 401) toast(tc("sessionExpired") ?? "Session expired", "err")
        return
      }
      const data = await res.json()
      setTickets(data.tickets ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast(tc("connectionError"), "err")
    } finally {
      setLoading(false)
    }
  }, [filter, searchQuery, toast, tc])

  // Debounce search, immediate on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchTickets(), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchTickets])

  // ── Open ticket ──
  async function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket)
    setMessages([])
    setNextCursor(null)
    setMessagesLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`)
      if (!res.ok) {
        if (res.status === 401) toast(tc("sessionExpired") ?? "Session expired", "err")
        else toast(tc("connectionError"), "err")
        return
      }
      const data = await res.json()
      const msgs: ChatMessage[] = data.messages?.messages ?? []
      setMessages(msgs.reverse()) // API returns DESC, we need ASC
      setNextCursor(data.messages?.next_cursor ?? null)
      if (data.ticket) {
        setSelectedTicket({ ...ticket, ...data.ticket })
      }
    } catch {
      toast(tc("connectionError"), "err")
    } finally {
      setMessagesLoading(false)
    }
  }

  // Fallback poll (only used when socket is down)
  async function pollMessages(ticketId: string) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`)
      if (!res.ok) return
      const data = await res.json()
      const msgs: ChatMessage[] = data.messages?.messages ?? []
      setMessages(msgs.reverse())
      if (data.ticket?.status) {
        setSelectedTicket(prev => prev ? { ...prev, status: data.ticket.status } : prev)
      }
    } catch { /* polling failure is non-critical when socket will retry */ }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load older messages
  async function loadMore() {
    if (!nextCursor || !selectedTicket) return
    try {
      const res = await fetch(`/api/chat-rooms/${selectedTicket.room_id}/messages?cursor=${nextCursor}&limit=50`)
      if (!res.ok) return
      const data = await res.json()
      const older: ChatMessage[] = data.messages ?? []
      setMessages(prev => [...older.reverse(), ...prev])
      setNextCursor(data.next_cursor ?? null)
    } catch { /* silent — user can retry via button */ }
  }

  // Send reply
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      })
      if (!res.ok) {
        toast(res.status === 401 ? (tc("sessionExpired") ?? "Session expired") : tc("connectionError"), "err")
        return
      }
      const msg = await res.json()
      // Only add if socket hasn't already delivered it
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      setReplyText("")
      setSelectedTicket(prev => prev ? { ...prev, status: "pending" } : prev)
    } catch {
      toast(tc("connectionError"), "err")
    } finally { setSending(false) }
  }

  // Change ticket status
  async function changeStatus(newStatus: TicketStatus) {
    if (!selectedTicket) return
    setStatusChanging(true)
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        toast(res.status === 401 ? (tc("sessionExpired") ?? "Session expired") : tc("connectionError"), "err")
        return
      }
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : prev)
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      toast(`${statusLabels[newStatus]}`, "ok")
    } catch {
      toast(tc("connectionError"), "err")
    } finally {
      setStatusChanging(false)
      setStatusDropdownOpen(false)
    }
  }

  function closeTicketView() {
    setSelectedTicket(null)
    setMessages([])
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    fetchTickets()
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(normalizeDate(dateStr)).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return locale === "ru" ? "только что" : locale === "kz" ? "жаңа ғана" : "just now"
    if (mins < 60) return locale === "ru" ? `${mins} мин` : `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return locale === "ru" ? `${hrs} ч` : `${hrs}h`
    const days = Math.floor(hrs / 24)
    return locale === "ru" ? `${days} д` : `${days}d`
  }

  const filters: { label: string; value: "all" | TicketStatus }[] = [
    { label: t("filters.all"), value: "all" },
    { label: t("filters.open"), value: "open" },
    { label: t("filters.pending"), value: "pending" },
    { label: t("filters.resolved"), value: "resolved" },
    { label: t("filters.closed"), value: "closed" },
  ]

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}{total > 0 && <span className="ml-1 font-bold text-foreground">· {total}</span>}</p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-220px)] rounded-2xl border border-border overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
        {/* Left: Ticket list */}
        <div className="w-[380px] border-r border-border bg-card flex flex-col flex-shrink-0">
          {/* Filters */}
          <div className="p-3 border-b border-border/50">
            <div className="flex gap-1 mb-3 flex-wrap">
              {filters.map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={cn("px-3 py-1 rounded-lg text-[12px] font-bold transition-all",
                    filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full h-9 pl-9 pr-3 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground" />
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4"><table className="w-full"><SkeletonTable rows={5} cols={2} /></table></div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Inbox className="w-10 h-10 opacity-30" />
                <p className="text-sm">{t("noTickets")}</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <button key={ticket.id} onClick={() => openTicket(ticket)}
                  className={cn("w-full text-left p-4 border-b border-border/30 hover:bg-muted/50 transition-all",
                    selectedTicket?.id === ticket.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{ticket.subject}</p>
                    <StatusBadge variant={statusConfig[ticket.status]?.variant ?? "neutral"}>
                      {statusLabels[ticket.status] ?? ticket.status}
                    </StatusBadge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={priorityLabels[ticket.priority]?.color ?? ""}>{priorityLabels[ticket.priority]?.label ?? ticket.priority}</span>
                    <span>·</span>
                    <span>{categoryLabels[ticket.category] ?? ticket.category}</span>
                    <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(ticket.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="flex-1 flex flex-col bg-background">
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">{t("selectTicket")}</p>
              <p className="text-xs text-center max-w-[250px]">{t("selectTicketDesc")}</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-4 bg-card border-b border-border/50 flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{categoryLabels[selectedTicket.category] ?? selectedTicket.category}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className={cn("text-xs font-bold", priorityLabels[selectedTicket.priority]?.color)}>
                      {priorityLabels[selectedTicket.priority]?.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Socket indicator */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={socketConnected ? "Real-time" : "Polling"}>
                    {socketConnected
                      ? <Wifi className="w-3 h-3 text-success" />
                      : <WifiOff className="w-3 h-3 text-muted-foreground/50" />}
                  </div>
                  {/* Status dropdown */}
                  <div className="relative">
                    <button onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted transition-all">
                      <StatusBadge variant={statusConfig[selectedTicket.status]?.variant ?? "neutral"}>
                        {statusLabels[selectedTicket.status]}
                      </StatusBadge>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {statusDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-10 py-1 min-w-[140px] animate-fade-in">
                        {(["open", "pending", "resolved", "closed"] as TicketStatus[]).map((s) => (
                          <button key={s} onClick={() => changeStatus(s)} disabled={statusChanging}
                            className={cn("w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition-all",
                              selectedTicket.status === s && "text-primary font-bold"
                            )}>
                            {statusLabels[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={closeTicketView} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                    ✕
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3" ref={chatContainerRef}>
                {nextCursor && (
                  <button onClick={loadMore} className="text-xs font-bold text-primary hover:text-primary-hover transition-colors text-center py-2">
                    {locale === "ru" ? "Загрузить ещё" : locale === "kz" ? "Көбірек жүктеу" : "Load more"}
                  </button>
                )}

                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{tc("loading")}</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    {locale === "ru" ? "Нет сообщений" : locale === "kz" ? "Хабарламалар жоқ" : "No messages"}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_id !== selectedTicket.user_id
                    return (
                      <div key={msg.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[70%] rounded-2xl px-4 py-2.5",
                          isAdmin
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border rounded-bl-md"
                        )}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <p className={cn("text-[10px] mt-1",
                            isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"
                          )}>
                            {new Date(normalizeDate(msg.created_at)).toLocaleTimeString(localeCode, { hour: "2-digit", minute: "2-digit" })}
                            {isAdmin && <span className="ml-1">· {locale === "ru" ? "Админ" : "Admin"}</span>}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
                <form onSubmit={handleSend} className="p-4 bg-card border-t border-border/50 flex items-center gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("replyPlaceholder")}
                    className="flex-1 h-10 px-4 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-muted-foreground"
                  />
                  <button type="submit" disabled={!replyText.trim() || sending}
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}

              {(selectedTicket.status === "closed" || selectedTicket.status === "resolved") && (
                <div className="p-4 bg-muted/50 border-t border-border/50 text-center text-sm text-muted-foreground">
                  {locale === "ru" ? "Тикет закрыт" : locale === "kz" ? "Тикет жабылды" : "Ticket closed"}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
