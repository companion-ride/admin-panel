"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building2,
  Car,
  MessageSquare,
  LogOut,
  Settings,
  Shuffle,
  Map,
  CreditCard,
  UserCog,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useLocale, type Locale } from "@/components/locale-provider"
import { useAuth } from "@/components/auth-provider"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("sidebar")
  const { locale, setLocale } = useLocale()
  const { admin, refresh } = useAuth()

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
        { label: t("nav.map"), href: "/map", icon: Map, badge: "3", badgeColor: "bg-error text-primary-foreground" },
      ],
    },
    {
      title: t("sections.users"),
      items: [
        { label: t("nav.users"), href: "/users", icon: Users },
        { label: t("nav.companies"), href: "/companies", icon: Building2 },
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
      title: t("sections.finance"),
      items: [
        { label: t("nav.billing"), href: "/billing", icon: CreditCard },
      ],
    },
    {
      title: t("sections.platform"),
      items: [
        { label: t("nav.support"), href: "/support", icon: MessageSquare, badge: "3", badgeColor: "bg-error text-primary-foreground" },
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
    <aside className="w-60 bg-card border-r border-border h-screen sticky top-0 flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Companion" width={32} height={32} className="rounded-lg flex-shrink-0" unoptimized />
          <div>
            <span className="text-sm font-bold tracking-tight text-foreground block leading-none">
              {t("brand")}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">{t("subtitle")}</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 hide-scrollbar flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-2.5 mb-1.5">
              {section.title}
            </p>
            <nav className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium transition-all duration-200 text-[13px]",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5"
                    )}
                  >
                    <item.icon className="w-[16px] h-[16px] flex-shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={cn("ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full", item.badgeColor)}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        {/* Language switcher */}
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
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-error hover:bg-error-light w-full transition-all font-medium text-[13px]"
        >
          <LogOut className="w-[16px] h-[16px]" />
          <span>{t("signOut")}</span>
        </button>
      </div>
    </aside>
  )
}
