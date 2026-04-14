"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin-layout"

import { useToast } from "@/components/toast"
import { useTranslations } from "next-intl"
import { useLocale } from "@/components/locale-provider"
import { backendFetch } from "@/lib/backend-fetch"
import {
  Shield, UserPlus, X, Inbox,
} from "lucide-react"
import { SkeletonTable } from "@/components/skeleton"

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


  const { toast } = useToast()
  const [admins, setAdmins] = useState<BackendAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteStep, setInviteStep] = useState<"phone" | "code">("phone")
  const [invite, setInvite] = useState<InviteFormData>(emptyInvite)
  const [otpCode, setOtpCode] = useState("")
  const [formError, setFormError] = useState("")
  const [formLoading, setFormLoading] = useState(false)



  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const res = await backendFetch("/api/users?role=admin&limit=100")
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

  // Step 1: Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)
    try {
      const res = await backendFetch("/api/admins/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: invite.name, phone: invite.phone }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || t("inviteModal.error")); return }
      setInviteStep("code")
      setOtpCode("")
    } catch {
      setFormError(tc("connectionError"))
    } finally {
      setFormLoading(false)
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)
    try {
      const res = await backendFetch("/api/admins/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: invite.phone, code: otpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || (locale === "ru" ? "Неверный код" : locale === "kz" ? "Қате код" : "Invalid code")); return }
      setInviteOpen(false)
      setInviteStep("phone")
      setInvite(emptyInvite)
      setOtpCode("")
      toast(locale === "ru" ? `${invite.name} добавлен как администратор` : locale === "kz" ? `${invite.name} әкімші ретінде қосылды` : `${invite.name} added as administrator`, "ok")
      fetchAdmins()
    } catch {
      setFormError(tc("connectionError"))
    } finally {
      setFormLoading(false)
    }
  }

  function closeInviteModal() {
    setInviteOpen(false)
    setInviteStep("phone")
    setFormError("")
    setOtpCode("")
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
          <button
            onClick={() => { setInvite(emptyInvite); setFormError(""); setInviteStep("phone"); setOtpCode(""); setInviteOpen(true) }}
            className="h-10 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {t("invite")}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <table className="w-full"><SkeletonTable rows={4} cols={5} /></table>
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                      <Shield className="w-3 h-3" />
                      {t("roles.admin")}
                    </span>
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inviteStep === "phone"
                    ? t("inviteModal.subtitle")
                    : locale === "ru" ? `Код отправлен на ${invite.phone}` : locale === "kz" ? `Код ${invite.phone} нөміріне жіберілді` : `Code sent to ${invite.phone}`}
                </p>
              </div>
              <button onClick={closeInviteModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Name + Phone */}
            {inviteStep === "phone" && (
              <form onSubmit={handleSendOtp} className="p-6 flex flex-col gap-4">
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
                  <div className="px-4 py-3 bg-error/8 border border-error/20 rounded-xl text-sm text-error font-medium">{formError}</div>
                )}

                <div className="flex gap-3 mt-1">
                  <button type="button" onClick={closeInviteModal}
                    className="flex-1 h-10 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all">
                    {tc("cancel")}
                  </button>
                  <button type="submit" disabled={formLoading}
                    className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    {formLoading ? t("inviteModal.sending") : t("inviteModal.send")}
                  </button>
              </div>
              </form>
            )}

            {/* Step 2: Enter OTP code */}
            {inviteStep === "code" && (
              <form onSubmit={handleVerifyCode} className="p-6 flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center gap-3 p-3 bg-success/8 border border-success/20 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{invite.name}</p>
                    <p className="text-xs text-muted-foreground">{invite.phone}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-foreground">
                    {locale === "ru" ? "Код из SMS" : locale === "kz" ? "SMS коды" : "SMS code"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                    autoFocus
                    className="h-12 px-4 bg-background border border-border rounded-xl text-lg font-mono tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                  />
                </div>

                {formError && (
                  <div className="px-4 py-3 bg-error/8 border border-error/20 rounded-xl text-sm text-error font-medium">{formError}</div>
                )}

                <div className="flex gap-3 mt-1">
                  <button type="button" onClick={() => { setInviteStep("phone"); setFormError("") }}
                    className="flex-1 h-10 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all">
                    {locale === "ru" ? "Назад" : locale === "kz" ? "Артқа" : "Back"}
                  </button>
                  <button type="submit" disabled={formLoading || otpCode.length < 6}
                    className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {formLoading
                      ? (locale === "ru" ? "Проверка..." : locale === "kz" ? "Тексеруде..." : "Verifying...")
                      : (locale === "ru" ? "Подтвердить" : locale === "kz" ? "Растау" : "Verify")}
                  </button>
                </div>

                <button type="button" onClick={handleSendOtp} disabled={formLoading}
                  className="text-xs font-bold text-primary hover:text-primary-hover transition-colors text-center disabled:opacity-50">
                  {locale === "ru" ? "Отправить код повторно" : locale === "kz" ? "Кодты қайта жіберу" : "Resend code"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
