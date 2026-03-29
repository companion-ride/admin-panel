"use client"

import { Bell, Search, Users, Car, ShieldCheck, X, Loader2, UserPlus, AlertTriangle, CheckCircle } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useTranslations } from "next-intl"
import { useLocale } from "@/components/locale-provider"

// ─── Search ───

interface SearchResult {
  id: string
  title: string
  subtitle: string
  section: "users" | "rides" | "admins"
  href: string
}

const SECTION_ICONS: Record<string, { icon: typeof Users; color: string }> = {
  users:  { icon: Users, color: "text-primary" },
  rides:  { icon: Car, color: "text-success" },
  admins: { icon: ShieldCheck, color: "text-warning" },
}

// ─── Notifications ───

interface Notification {
  id: string
  icon: typeof Users
  iconColor: string
  iconBg: string
  title: string
  description: string
  time: string
  read: boolean
  href?: string
}

export function Header() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const { admin } = useAuth()
  const t = useTranslations("sidebar")
  const tc = useTranslations("common")
  const { locale } = useLocale()
  const localeCode = locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US"
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initials = admin?.name ? admin.name.charAt(0).toUpperCase() : "A"
  const displayName = admin?.name || t("admin")
  const displayRole = admin?.role === "super" ? t("superAdmin") : t("admin")

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ─── Search logic ───

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    setOpen(true)
    const all: SearchResult[] = []

    const [usersRes, ridesRes, adminsRes] = await Promise.allSettled([
      fetch(`/api/users?search=${encodeURIComponent(q)}&limit=5`),
      fetch(`/api/rides?search=${encodeURIComponent(q)}&limit=5`),
      fetch(`/api/users?role=admin&search=${encodeURIComponent(q)}&limit=5`),
    ])

    if (usersRes.status === "fulfilled" && usersRes.value.ok) {
      const data = await usersRes.value.json().catch(() => null)
      for (const u of data?.items ?? []) {
        if (u.roles?.includes("admin")) continue
        all.push({ id: u.id, title: u.name, subtitle: `${u.phone} · ${(u.roles ?? []).join(", ")}`, section: "users", href: "/users" })
      }
    }
    if (ridesRes.status === "fulfilled" && ridesRes.value.ok) {
      const data = await ridesRes.value.json().catch(() => null)
      for (const r of data?.rides ?? data?.items ?? []) {
        all.push({ id: r.id, title: `${tc("ride")} ${String(r.id).slice(0, 8)}`, subtitle: [r.fromAddress, r.toAddress].filter(Boolean).join(" → ") || r.status || "", section: "rides", href: "/rides" })
      }
    }
    if (adminsRes.status === "fulfilled" && adminsRes.value.ok) {
      const data = await adminsRes.value.json().catch(() => null)
      for (const a of data?.items ?? []) {
        all.push({ id: a.id, title: a.name, subtitle: `${a.phone} · admin`, section: "admins", href: "/admins" })
      }
    }

    setResults(all)
    setLoading(false)
  }, [tc])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function handleSelect(r: SearchResult) {
    setOpen(false)
    setQuery("")
    router.push(r.href)
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.section]) acc[r.section] = []
    acc[r.section].push(r)
    return acc
  }, {})

  // ─── Notifications logic ───

  const NOTIF_SEEN_KEY = "companion_notif_seen_ids"
  const NOTIF_READ_ALL_KEY = "companion_notif_read_all"
  const POLL_INTERVAL = 30_000

  function getReadIds(): Set<string> {
    try {
      const raw = localStorage.getItem(NOTIF_SEEN_KEY)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch { return new Set() }
  }

  function saveReadIds(ids: Set<string>) {
    try { localStorage.setItem(NOTIF_SEEN_KEY, JSON.stringify([...ids])) } catch {}
  }

  function getReadAllTime(): string {
    try { return localStorage.getItem(NOTIF_READ_ALL_KEY) || "" } catch { return "" }
  }

  function saveReadAllTime(ts: string) {
    try { localStorage.setItem(NOTIF_READ_ALL_KEY, ts) } catch {}
  }

  function isRead(id: string, createdAt: string): boolean {
    const readAll = getReadAllTime()
    if (readAll && createdAt && createdAt <= readAll) return true
    return getReadIds().has(id)
  }

  function timeAgo(dateStr: string): string {
    // Backend returns UTC without Z suffix — normalize
    const normalized = dateStr.endsWith("Z") || dateStr.includes("+") ? dateStr : dateStr + "Z"
    const diff = Date.now() - new Date(normalized).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return locale === "ru" ? "только что" : locale === "kz" ? "жаңа ғана" : "just now"
    if (mins < 60) return locale === "ru" ? `${mins} мин назад` : locale === "kz" ? `${mins} мин бұрын` : `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return locale === "ru" ? `${hrs} ч назад` : locale === "kz" ? `${hrs} сағ бұрын` : `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return locale === "ru" ? `${days} д назад` : locale === "kz" ? `${days} күн бұрын` : `${days}d ago`
  }

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setNotifLoading(true)
    const notifs: Notification[] = []

    // Read notification preferences
    let notifPref = { users: true, rides: true, cancelled: true }
    try { const raw = localStorage.getItem("companion_notif_settings"); if (raw) notifPref = JSON.parse(raw) } catch {}

    try {
      // Fetch from both stats and rides APIs for comprehensive notifications
      const [statsRes, usersRes, ridesRes] = await Promise.allSettled([
        fetch("/api/dashboard/stats"),
        fetch("/api/users?limit=5"),
        fetch("/api/rides?limit=5"),
      ])

      // Users (if enabled)
      if (notifPref.users && usersRes.status === "fulfilled" && usersRes.value.ok) {
        const data = await usersRes.value.json().catch(() => null)
        for (const u of data?.items ?? []) {
          if (u.roles?.includes("admin")) continue
          const createdAt = u.created_at || ""
          const roleTxt = u.roles?.includes("driver")
            ? (locale === "ru" ? "водитель" : locale === "kz" ? "жүргізуші" : "driver")
            : (locale === "ru" ? "пассажир" : locale === "kz" ? "жолаушы" : "passenger")
          notifs.push({
            id: `user-${u.id}`,
            icon: UserPlus,
            iconColor: "text-primary",
            iconBg: "bg-primary/10",
            title: locale === "ru" ? "Новый пользователь" : locale === "kz" ? "Жаңа пайдаланушы" : "New user",
            description: `${u.name} — ${roleTxt}`,
            time: createdAt ? timeAgo(createdAt) : "",
            read: isRead(`user-${u.id}`, createdAt),
            href: "/users",
          })
        }
      }

      // Rides from stats
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const data = await statsRes.value.json().catch(() => null)
        for (const r of data?.recent_rides ?? []) {
          const createdAt = r.created_at || ""
          const statusKey = String(r.status)
          const isCancelled = statusKey === "cancelled"
          const isCompleted = statusKey === "completed"
          const isActive = statusKey === "in_progress" || statusKey === "searching"

          // Skip based on preferences
          if (isCancelled && !notifPref.cancelled) continue
          if (!isCancelled && !notifPref.rides) continue

          const route = [r.from_address, r.to_address].filter(Boolean)
          const desc = route.length === 2
            ? `${String(route[0]).split(",")[0]} → ${String(route[1]).split(",")[0]}`
            : r.driver_name || String(r.ride_id).slice(0, 12)

          notifs.push({
            id: `ride-${r.ride_id}`,
            icon: isCancelled ? AlertTriangle : isCompleted ? CheckCircle : Car,
            iconColor: isCancelled ? "text-error" : isCompleted ? "text-success" : isActive ? "text-info" : "text-warning",
            iconBg: isCancelled ? "bg-error/10" : isCompleted ? "bg-success/10" : isActive ? "bg-info/10" : "bg-warning/10",
            title: isCancelled
              ? (locale === "ru" ? "Поездка отменена" : locale === "kz" ? "Сапар бас тартылды" : "Ride cancelled")
              : isCompleted
              ? (locale === "ru" ? "Поездка завершена" : locale === "kz" ? "Сапар аяқталды" : "Ride completed")
              : isActive
              ? (locale === "ru" ? "Поездка в пути" : locale === "kz" ? "Сапар жолда" : "Ride in progress")
              : (locale === "ru" ? "Новая поездка" : locale === "kz" ? "Жаңа сапар" : "New ride"),
            description: desc,
            time: createdAt ? timeAgo(createdAt) : "",
            read: isRead(`ride-${r.ride_id}`, createdAt),
            href: "/rides",
          })
        }
      }
      // Also add rides from rides-service (may have different/newer rides)
      if (ridesRes.status === "fulfilled" && ridesRes.value.ok) {
        const data = await ridesRes.value.json().catch(() => null)
        const existingIds = new Set(notifs.map(n => n.id))
        for (const r of data?.rides ?? data?.items ?? []) {
          const rideId = `ride-${r.id}`
          if (existingIds.has(rideId)) continue

          const createdAt = r.createdAt || r.created_at || ""
          const statusKey = String(r.status)
          const isCancelled = statusKey === "cancelled"
          const isCompleted = statusKey === "completed"
          const isActive = statusKey === "in_progress" || statusKey === "searching"

          if (isCancelled && !notifPref.cancelled) continue
          if (!isCancelled && !notifPref.rides) continue

          const route = [r.fromAddress, r.toAddress].filter(Boolean)
          const desc = route.length === 2
            ? `${String(route[0]).split(",")[0]} → ${String(route[1]).split(",")[0]}`
            : String(r.id).slice(0, 12)

          notifs.push({
            id: rideId,
            icon: isCancelled ? AlertTriangle : isCompleted ? CheckCircle : Car,
            iconColor: isCancelled ? "text-error" : isCompleted ? "text-success" : isActive ? "text-info" : "text-warning",
            iconBg: isCancelled ? "bg-error/10" : isCompleted ? "bg-success/10" : isActive ? "bg-info/10" : "bg-warning/10",
            title: isCancelled
              ? (locale === "ru" ? "Поездка отменена" : locale === "kz" ? "Сапар бас тартылды" : "Ride cancelled")
              : isCompleted
              ? (locale === "ru" ? "Поездка завершена" : locale === "kz" ? "Сапар аяқталды" : "Ride completed")
              : isActive
              ? (locale === "ru" ? "Поездка в пути" : locale === "kz" ? "Сапар жолда" : "Ride in progress")
              : (locale === "ru" ? "Новая поездка" : locale === "kz" ? "Жаңа сапар" : "New ride"),
            description: desc,
            time: createdAt ? timeAgo(createdAt) : "",
            read: isRead(rideId, createdAt),
            href: "/rides",
          })
        }
      }
    } catch {
      // silent
    }

    // Sort: unread first, then by newest
    notifs.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1
      return 0
    })
    setNotifications(notifs)
    if (!silent) setNotifLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  // Auto-poll for new notifications
  useEffect(() => {
    fetchNotifications(true)
    const interval = setInterval(() => fetchNotifications(true), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  function handleNotifToggle() {
    setNotifOpen(!notifOpen)
  }

  function handleNotifClick(n: Notification) {
    setNotifications((prev) => prev.map((p) => p.id === n.id ? { ...p, read: true } : p))
    const ids = getReadIds()
    ids.add(n.id)
    saveReadIds(ids)
    setNotifOpen(false)
    if (n.href) router.push(n.href)
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })))
    saveReadAllTime(new Date().toISOString())
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  // ─── Render ───

  return (
    <header className="sticky top-0 h-16 bg-card border-b border-border px-8 flex items-center justify-between z-40">
      {/* Search */}
      <div className="flex-1" ref={searchRef}>
        <div className="max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.trim() && results.length > 0) setOpen(true) }}
            placeholder={tc("search")}
            className="w-full h-10 pl-11 pr-10 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setOpen(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors animate-scale-in"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {open && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[420px] overflow-y-auto animate-fade-in">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{tc("searching")}</span>
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">{tc("noResults")}</div>
              ) : (
                Object.entries(grouped).map(([section, items]) => {
                  const meta = SECTION_ICONS[section]
                  const Icon = meta.icon
                  const sectionLabel = tc(`sections.${section}`)
                  return (
                    <div key={section} className="animate-fade-in">
                      <div className="px-4 py-2 bg-muted/50 border-b border-border/50 flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{sectionLabel}</span>
                        <span className="text-[10px] text-muted-foreground/60 ml-auto">{items.length}</span>
                      </div>
                      {items.map((r) => (
                        <button
                          key={`${r.section}-${r.id}`}
                          onClick={() => handleSelect(r)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 active:scale-[0.98] transition-all text-left border-b border-border/30 last:border-none animate-slide-in-up"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
                            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground truncate">{r.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 font-mono flex-shrink-0">{r.id.slice(0, 8)}</span>
                        </button>
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifToggle}
            className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-all relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-error rounded-full border-2 border-card text-[9px] font-bold text-white flex items-center justify-center animate-scale-in">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-full right-0 mt-2 w-[380px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    {locale === "ru" ? "Уведомления" : locale === "kz" ? "Хабарламалар" : "Notifications"}
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-bold">{unreadCount}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors">
                    {locale === "ru" ? "Прочитать все" : locale === "kz" ? "Барлығын оқу" : "Mark all read"}
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{tc("loading")}</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{locale === "ru" ? "Нет уведомлений" : locale === "kz" ? "Хабарламалар жоқ" : "No notifications"}</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = n.icon
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 active:scale-[0.99] transition-all text-left border-b border-border/30 last:border-none ${!n.read ? "bg-primary/3" : ""}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${n.iconBg}`}>
                          <Icon className={`w-4 h-4 ${n.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!n.read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>{n.title}</p>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                          </div>
                          <p className="text-[12px] text-muted-foreground truncate mt-0.5">{n.description}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 mt-1 whitespace-nowrap">{n.time}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Profile */}
        <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-muted transition-all">
          <div className="text-right">
            <p className="text-[13px] font-bold leading-none mb-1 text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted-foreground font-medium leading-none">{displayRole}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-card shadow-sm overflow-hidden flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
        </button>
      </div>
    </header>
  )
}
