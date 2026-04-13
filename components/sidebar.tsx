"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Car,
  MessageSquare,
  LogOut,
  Settings,
  Shuffle,
  Map,

  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useLocale, type Locale } from "@/components/locale-provider"
import { useAuth } from "@/components/auth-provider"
import { backendFetch } from "@/lib/backend-fetch"
import { useState, useEffect, useCallback } from "react"

const SIDEBAR_KEY = "companion_sidebar_collapsed"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("sidebar")
  const { locale, setLocale } = useLocale()
  const { admin, refresh } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [openTickets, setOpenTickets] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY)
      if (saved === "true") setCollapsed(true)
    } catch {}
  }, [])

  const fetchOpenTickets = useCallback(async () => {
    try {
      const res = await backendFetch("/api/tickets?status=open&limit=1")
      if (res.ok) {
        const data = await res.json()
        setOpenTickets(data.total ?? 0)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchOpenTickets()
    const interval = setInterval(fetchOpenTickets, 30000)
    return () => clearInterval(interval)
  }, [fetchOpenTickets])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_KEY, String(next))
  }

  const locales: { value: Locale; label: string }[] = [
    { value: "ru", label: "RU" },
    { value: "kz", label: "ҚЗ" },
    { value: "en", label: "EN" },
  ]

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    refresh()
    router.push("/login")
  }

  type NavItem = {
    label: string
    href: string
    icon: React.ElementType
    badge?: string
    badgeColor?: string
  }

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: t("sections.overview"),
      items: [
        { label: t("nav.overview"), href: "/", icon: LayoutDashboard },
        { label: t("nav.map"), href: "/map", icon: Map },
      ],
    },
    {
      title: t("sections.users"),
      items: [
        { label: t("nav.users"), href: "/users", icon: Users },
      ],
    },
    {
      title: t("sections.rides"),
      items: [
        { label: t("nav.rides"), href: "/rides", icon: Car },
        { label: t("nav.matching"), href: "/matching", icon: Shuffle },
      ],
    },

    {
      title: t("sections.platform"),
      items: [
        { label: t("nav.support"), href: "/support", icon: MessageSquare, ...(openTickets > 0 ? { badge: String(openTickets), badgeColor: "bg-error text-primary-foreground" } : {}) },
        { label: t("nav.settings"), href: "/settings", icon: Settings },
        ...(admin?.role === "super" || admin?.permissions?.viewAdmins
          ? [{ label: t("nav.admins"), href: "/admins", icon: UserCog }]
          : []),
      ],
    },
  ]

  const initials = admin?.name ? admin.name.charAt(0).toUpperCase() : "A"
  const displayName = admin?.name || t("admin")
  const displayRole = admin?.role === "super" ? t("superAdmin") : t("admin")

  return (
    <aside className={cn(
      "bg-card border-r border-border h-screen sticky top-0 flex flex-col z-30 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Logo */}
      <div className={cn("h-16 flex items-center border-b border-border/50", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image src="/logo.png" alt="Companion" width={32} height={32} className="rounded-lg flex-shrink-0" unoptimized />
            <div className="min-w-0">
              <span className="text-sm font-bold tracking-tight text-foreground block leading-none">
                {t("brand")}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">{t("subtitle")}</span>
            </div>
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex-shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 hide-scrollbar flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-2.5 mb-1.5">
                {section.title}
              </p>
            )}
            <nav className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-xl font-medium transition-all duration-200 text-[13px] relative",
                      collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5"
                    )}
                  >
                    <item.icon className="w-[16px] h-[16px] flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                    {item.badge && (
                      collapsed ? (
                        <span className={cn("absolute top-1 right-1 w-2 h-2 rounded-full", item.badgeColor?.replace("text-primary-foreground", ""))} />
                      ) : (
                        <span className={cn("ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full", item.badgeColor)}>
                          {item.badge}
                        </span>
                      )
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={cn("border-t border-border/50", collapsed ? "p-2" : "p-3")}>
        {/* Language switcher */}
        {!collapsed ? (
          <div className="flex items-center gap-1 mb-2 px-2.5">
            {locales.map((l) => (
              <button
                key={l.value}
                onClick={() => setLocale(l.value)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  locale === l.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => {
              const idx = locales.findIndex(l => l.value === locale)
              setLocale(locales[(idx + 1) % locales.length].value)
            }}
            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-primary bg-primary/10 mb-2 transition-all"
            title={`Language: ${locale.toUpperCase()}`}
          >
            {locale.toUpperCase()}
          </button>
        )}

        {/* Profile */}
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-muted mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-foreground leading-none truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{displayRole}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
          </div>
        ) : (
          <div className="flex justify-center mb-1" title={`${displayName} · ${displayRole}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground text-xs font-bold relative">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title={collapsed ? t("signOut") : undefined}
          className={cn(
            "flex items-center rounded-xl text-error hover:bg-error-light w-full transition-all font-medium text-[13px]",
            collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2"
          )}
        >
          <LogOut className="w-[16px] h-[16px]" />
          {!collapsed && <span>{t("signOut")}</span>}
        </button>
      </div>
    </aside>
  )
}
