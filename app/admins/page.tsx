"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/toast"
import { useTranslations } from "next-intl"
import { useLocale } from "@/components/locale-provider"
import {
  ShieldCheck, Shield, Lock, UserPlus, X, Inbox,
} from "lucide-react"

interface BackendAdmin {
  id: string
  name: string
  phone: string
  roles: string[]
  status: string
  created_at: string
}

interface InviteFormData {
  name: string
  phone: string
}

const emptyInvite: InviteFormData = { name: "", phone: "" }

export default function AdminsPage() {
  const t = useTranslations("admins")
  const tc = useTranslations("common")
  const { locale } = useLocale()
  const localeCode = locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US"
  const { admin: currentAdmin } = useAuth()
  const { toast } = useToast()
  const [admins, setAdmins] = useState<BackendAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState<InviteFormData>(emptyInvite)
  const [formError, setFormError] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  const canView = currentAdmin?.role === "super" || currentAdmin?.permissions?.viewAdmins

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users?role=admin&limit=100")
      if (res.ok) {
        const data = await res.json()
        setAdmins(data.items ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)
    try {
      const res = await fetch("/api/admins/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: invite.name, phone: invite.phone }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || t("inviteModal.error")); return }
      setInviteOpen(false)
      setInvite(emptyInvite)
      toast(t("inviteModal.sent", { phone: invite.phone }), "ok")
      fetchAdmins()
    } catch {
      setFormError(tc("connectionError"))
    } finally {
      setFormLoading(false)
    }
  }

  function isSuper(a: BackendAdmin) {
    return a.roles.includes("super") || a.roles.includes("superadmin")
  }

  if (!canView) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Lock className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">{t("noAccess")}</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-[15px] text-muted-foreground mt-1">
            {t("subtitle")}
            {admins.length > 0 && <span className="ml-1 text-foreground font-bold">· {admins.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(currentAdmin?.role === "super" || currentAdmin?.permissions?.inviteAdmins) && (
            <button
              onClick={() => { setInvite(emptyInvite); setFormError(""); setInviteOpen(true) }}
              className="h-10 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {t("invite")}
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">{tc("loading")}</div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Inbox className="w-10 h-10 opacity-30" />
            <p className="text-sm">{t("noAdmins")}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                {[t("table.name"), t("table.phone"), t("table.role"), t("table.status"), t("table.created")].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {admins.map((a) => (
                <tr key={a.id} className={`hover:bg-muted/30 transition-all ${a.status === "suspended" ? "opacity-50" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${a.status !== "suspended" ? "bg-gradient-to-br from-primary to-info text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {a.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground">{a.name}</span>
                        <p className="text-[11px] font-mono text-muted-foreground/70 mt-0.5">{a.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{a.phone}</td>
                  <td className="px-6 py-4">
                    {isSuper(a) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning-dark text-[11px] font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        {t("roles.super")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        <Shield className="w-3 h-3" />
                        {t("roles.admin")}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {a.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        {tc("status.active")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        {a.status === "suspended" ? tc("status.suspended") : a.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString(localeCode, { day: "numeric", month: "long", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
              <div>
                <h2 className="text-base font-bold text-foreground">{t("inviteModal.title")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t("inviteModal.subtitle")}</p>
              </div>
              <button onClick={() => setInviteOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground">{t("inviteModal.name")}</label>
                <input
                  value={invite.name}
                  onChange={(e) => setInvite((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t("inviteModal.namePlaceholder")}
                  required
                  className="h-10 px-3.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground">{t("inviteModal.phone")}</label>
                <input
                  type="tel"
                  value={invite.phone}
                  onChange={(e) => setInvite((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={t("inviteModal.phonePlaceholder")}
                  required
                  className="h-10 px-3.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
                />
              </div>

              {formError && (
                <div className="px-4 py-3 bg-error/8 border border-error/20 rounded-xl text-sm text-error font-medium">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="flex-1 h-10 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {formLoading ? t("inviteModal.sending") : t("inviteModal.send")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
