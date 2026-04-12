"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { StatusBadge } from "@/components/status-badge"
import { Search, RotateCw, User, Car, X, ChevronRight, Inbox, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { SkeletonTable } from "@/components/skeleton"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { backendFetch } from "@/lib/backend-fetch"
import { useToast } from "@/components/toast"
import { allUsers } from "@/lib/data"
import type { AppUser } from "@/lib/data"

interface ApiUser {
  id: string
  name: string
  phone: string
  roles: string[]
  status: "active" | "suspended"
  created_at: string
  vehicle?: { car: string; license_plate: string }
}

function getUserRole(user: ApiUser): "driver" | "passenger" {
  return user.roles.includes("driver") ? "driver" : "passenger"
}

interface ApiUsersResponse {
  items: ApiUser[]
  total: number
  page: number
  limit: number
}

function MaskedName({ fullName, className }: { fullName: string; className?: string }) {
  const parts = fullName.trim().split(" ")
  const first = parts[0]
  const lastInitial = parts[1] ? parts[1].charAt(0) + "." : ""
  return <span className={className}>{first}{lastInitial ? " " + lastInitial : ""}</span>
}

type FilterType = "all" | "driver" | "passenger"

// Конвертируем статические данные в ApiUser для fallback
function toApiUser(u: AppUser): ApiUser {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    roles: [u.type],
    status: u.status === "pending" ? "active" : u.status,
    created_at: new Date().toISOString(),
    vehicle: u.vehicle ? { car: u.vehicle, license_plate: u.licensePlate ?? "" } : undefined,
  }
}

const FALLBACK_USERS: ApiUser[] = allUsers.map(toApiUser)

export default function UsersPage() {
  const t = useTranslations("users")
  const tc = useTranslations("common")
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [isLive, setIsLive] = useState(false)
  const [backendDown, setBackendDown] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)
  const [sortKey, setSortKey] = useState<"name" | "phone" | "created_at" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSort(key: "name" | "phone" | "created_at") {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function sortedUsers(list: ApiUser[]) {
    if (!sortKey) return list
    return [...list].sort((a, b) => {
      let va: string, vb: string
      if (sortKey === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase() }
      else if (sortKey === "phone") { va = a.phone; vb = b.phone }
      else { va = a.created_at; vb = b.created_at }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === "asc" ? cmp : -cmp
    })
  }

  async function fetchUsers(role: FilterType, search: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (role !== "all") params.set("role", role)
      if (search.trim()) params.set("search", search.trim())
      params.set("limit", "100")

      const res = await backendFetch(`/api/users?${params}`)
      const data: ApiUsersResponse = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Ошибка ${res.status}`)
      setUsers(data.items ?? [])
      setTotal(data.total ?? 0)
      setIsLive(true)
      setBackendDown(false)
    } catch {
      // API недоступна — показываем fallback
      const filtered = FALLBACK_USERS.filter((u) => {
        const matchRole = role === "all" || getUserRole(u) === role
        const matchSearch = !search.trim() || u.name.toLowerCase().includes(search.toLowerCase())
        return matchRole && matchSearch
      })
      setUsers(filtered)
      setTotal(filtered.length)
      setIsLive(false)
      setBackendDown(true)
    } finally {
      setLoading(false)
    }
  }

  // Единый эффект: немедленно при смене фильтра, с debounce при поиске
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = searchQuery !== "" ? 400 : 0
    debounceRef.current = setTimeout(() => fetchUsers(filter, searchQuery), delay)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchQuery])

  const statusMap: Record<"active" | "suspended", { label: string; variant: "success" | "error" }> = {
    active:    { label: tc("status.active"),    variant: "success" },
    suspended: { label: tc("status.suspended"), variant: "error"   },
  }

  async function toggleStatus(user: ApiUser) {
    const newStatus: "active" | "suspended" = user.status === "active" ? "suspended" : "active"
    // Оптимистичное обновление
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u))
    setSelectedUser((prev) => prev?.id === user.id ? { ...prev, status: newStatus } : prev)
    try {
      const res = await backendFetch(`/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("status_error")
      toast(
        newStatus === "suspended"
          ? `${user.name.split(" ")[0]} заблокирован`
          : `${user.name.split(" ")[0]} активирован`,
        newStatus === "suspended" ? "err" : "ok"
      )
    } catch {
      // Откатываем обратно если API вернул ошибку
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: user.status } : u))
      setSelectedUser((prev) => prev?.id === user.id ? { ...prev, status: user.status } : prev)
      toast("Не удалось изменить статус", "err")
    }
  }

  const filters: { label: string; value: FilterType }[] = [
    { label: t("filters.all"),        value: "all"       },
    { label: t("filters.passengers"), value: "passenger" },
    { label: t("filters.drivers"),    value: "driver"    },
  ]

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
            {backendDown && (
              <span className="px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-[11px] font-bold text-warning-dark">
                {tc("demo")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}{total > 0 && <span className="ml-1 text-foreground font-bold">· {total}</span>}
          </p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="bg-card rounded-t-2xl border-x border-t border-border p-4 flex items-center justify-between">
        <div className="bg-muted p-1 rounded-xl flex gap-0.5 border border-border/50">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all",
                filter === f.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full h-10 pl-10 pr-4 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => fetchUsers(filter, searchQuery)}
            disabled={loading}
            className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-all disabled:opacity-50"
          >
            <RotateCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-b-2xl border border-border overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/50 border-b border-border/50">
            <tr>
              {([
                { label: t("table.user"), key: "name" as const },
                { label: t("table.type"), key: null },
                { label: t("table.status"), key: null },
                { label: tc("phone"), key: "phone" as const },
                { label: tc("registered"), key: "created_at" as const },
                { label: "", key: null },
              ]).map((col, i) => (
                <th key={col.label || i}
                  className={cn(
                    "px-5 py-4 text-[11px] font-bold uppercase tracking-widest",
                    col.key
                      ? "cursor-pointer select-none text-muted-foreground/60 hover:text-foreground transition-colors group"
                      : "text-muted-foreground/60"
                  )}
                  onClick={() => col.key && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.key && (
                      sortKey === col.key
                        ? sortDir === "asc"
                          ? <ArrowUp className="w-3 h-3 text-primary" />
                          : <ArrowDown className="w-3 h-3 text-primary" />
                        : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="w-10 h-10 opacity-30" />
                    <p className="text-sm">{t("noUsers")}</p>
                  </div>
                </td>
              </tr>
            ) : sortedUsers(users).map((user) => (
              <tr
                key={user.id}
                className="hover:bg-muted/30 transition-all cursor-pointer"
                onClick={() => setSelectedUser(user)}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0", getUserRole(user) === "driver" ? "bg-success/10" : "bg-primary/10")}>
                      {getUserRole(user) === "driver"
                        ? <Car className="w-4 h-4 text-success" />
                        : <User className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <MaskedName fullName={user.name} className="text-sm font-bold text-foreground" />
                      <p className="text-[11px] font-mono text-muted-foreground/70 mt-0.5">{user.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge variant={getUserRole(user) === "driver" ? "success" : "info"}>
                    {getUserRole(user) === "driver" ? tc("types.driver") : tc("types.passenger")}
                  </StatusBadge>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge variant={statusMap[user.status].variant}>{statusMap[user.status].label}</StatusBadge>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{user.phone}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-4">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User detail drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedUser(null)} />
          <div className="relative w-[420px] bg-card h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", getUserRole(selectedUser) === "driver" ? "bg-success/10" : "bg-primary/10")}>
                  {getUserRole(selectedUser) === "driver"
                    ? <Car className="w-5 h-5 text-success" />
                    : <User className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <MaskedName fullName={selectedUser.name} className="text-base font-bold text-foreground" />
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{selectedUser.id.slice(0, 8)}…</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-all text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge variant={getUserRole(selectedUser) === "driver" ? "success" : "info"}>
                  {getUserRole(selectedUser) === "driver" ? tc("types.driver") : tc("types.passenger")}
                </StatusBadge>
                <StatusBadge variant={statusMap[selectedUser.status].variant}>
                  {statusMap[selectedUser.status].label}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-xl p-4 col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{tc("phone")}</p>
                  <p className="text-sm font-bold text-foreground font-mono">{selectedUser.phone}</p>
                </div>
                <div className="bg-muted rounded-xl p-4 col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{tc("registered")}</p>
                  <p className="text-sm font-bold text-foreground">
                    {new Date(selectedUser.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {getUserRole(selectedUser) === "driver" && selectedUser.vehicle && (
                <div className="bg-muted rounded-2xl p-5">
                  <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">{t("drawer.vehicle")}</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t("drawer.car")}</span>
                      <span className="text-sm font-bold text-foreground">{selectedUser.vehicle.car}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t("drawer.licensePlate")}</span>
                      <span className="text-sm font-bold text-foreground font-mono">{selectedUser.vehicle.license_plate}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-auto pt-2">
                {selectedUser.status === "active" ? (
                  <button
                    onClick={() => toggleStatus(selectedUser)}
                    className="flex-1 h-11 rounded-xl bg-error/10 text-error font-bold text-sm hover:bg-error/20 transition-all"
                  >
                    {t("drawer.suspendUser")}
                  </button>
                ) : (
                  <button
                    onClick={() => toggleStatus(selectedUser)}
                    className="flex-1 h-11 rounded-xl bg-success/10 text-success font-bold text-sm hover:bg-success/20 transition-all"
                  >
                    {t("drawer.activateUser")}
                  </button>
                )}
                <button
                  onClick={() => { setSelectedUser(null); router.push("/rides") }}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
                >
                  {t("drawer.viewRides")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
