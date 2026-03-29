"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Save, Globe, Bell, CheckCircle, Server, Plus, X, ChevronRight, RefreshCw, Code, Inbox, Wifi, WifiOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { useToast } from "@/components/toast"
import { useLocale } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

interface Service {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
}

interface ServiceConfig {
  id?: string
  config: Record<string, unknown>
  checksum?: string
  is_active?: boolean
  created_at?: string
  created_by?: string
  service_id?: string
}

interface EndpointStatus {
  name: string
  url: string
  ok: boolean | null
}

const NOTIF_SETTINGS_KEY = "companion_notif_settings"

function getNotifSettings(): { users: boolean; rides: boolean; cancelled: boolean } {
  try {
    const raw = localStorage.getItem(NOTIF_SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { users: true, rides: true, cancelled: true }
}

export default function SettingsPage() {
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const { locale } = useLocale()
  const localeCode = locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US"
  const { toast } = useToast()

  // Tabs
  const [activeTab, setActiveTab] = useState<"api" | "notifications" | "services">("api")

  // Notification settings
  const [notifUsers, setNotifUsers] = useState(true)
  const [notifRides, setNotifRides] = useState(true)
  const [notifCancelled, setNotifCancelled] = useState(true)
  const [initialNotif, setInitialNotif] = useState({ users: true, rides: true, cancelled: true })
  const [saved, setSaved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // API health
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([])
  const [checking, setChecking] = useState(false)

  // Config Service
  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configJson, setConfigJson] = useState("")
  const [schemaJson, setSchemaJson] = useState("")
  const [newServiceName, setNewServiceName] = useState("")
  const [newServiceOpen, setNewServiceOpen] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState("")
  const [configTab, setConfigTab] = useState<"config" | "schema">("config")
  const [configSaving, setConfigSaving] = useState(false)

  // Load notification settings
  useEffect(() => {
    const s = getNotifSettings()
    setNotifUsers(s.users)
    setNotifRides(s.rides)
    setNotifCancelled(s.cancelled)
    setInitialNotif(s)
  }, [])

  const notifChanged = notifUsers !== initialNotif.users || notifRides !== initialNotif.rides || notifCancelled !== initialNotif.cancelled

  function confirmSaveNotif() {
    const settings = { users: notifUsers, rides: notifRides, cancelled: notifCancelled }
    localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings))
    setInitialNotif(settings)
    setConfirmOpen(false)
    setSaved(true)
    toast(t("saved"), "ok")
    setTimeout(() => setSaved(false), 2000)
  }

  // Check API health
  async function checkEndpoints() {
    setChecking(true)
    const checks: EndpointStatus[] = [
      { name: "Auth API", url: "/api/auth/me", ok: null },
      { name: "Users API", url: "/api/users?limit=1", ok: null },
      { name: "Rides API", url: "/api/rides?limit=1", ok: null },
      { name: "Matching API", url: "/api/matching/stats", ok: null },
      { name: "Drivers API", url: "/api/drivers/active", ok: null },
      { name: "Map Config", url: "/api/map-config", ok: null },
    ]

    const results = await Promise.allSettled(
      checks.map(async (ep) => {
        const res = await fetch(ep.url)
        return { ...ep, ok: res.ok }
      })
    )

    setEndpoints(results.map((r, i) =>
      r.status === "fulfilled" ? r.value : { ...checks[i], ok: false }
    ))
    setChecking(false)
  }

  useEffect(() => { checkEndpoints() }, [])

  // Config Service
  const fetchServices = useCallback(async () => {
    setServicesLoading(true)
    try {
      const res = await fetch("/api/config/services")
      if (res.ok) setServices(Array.isArray(await res.json().then(d => d)) ? await fetch("/api/config/services").then(r => r.json()) : [])
    } catch {} finally { setServicesLoading(false) }
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

  async function fetchConfig(service: Service) {
    setSelectedService(service)
    setConfigLoading(true)
    setConfigTab("config")
    try {
      const res = await fetch(`/api/config/${service.name}`)
      if (res.ok) {
        const data = await res.json()
        setServiceConfig(data)
        setConfigJson(JSON.stringify(data.config ?? {}, null, 2))
      } else { setServiceConfig(null); setConfigJson("{}") }
    } catch { setServiceConfig(null); setConfigJson("{}") }
    finally { setConfigLoading(false) }
    setSchemaJson("")
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault()
    if (!newServiceName.trim()) return
    try {
      const res = await fetch("/api/config/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newServiceName.trim() }) })
      const data = await res.json()
      if (res.ok) { setCreatedApiKey(data.api_key || ""); setNewServiceName(""); fetchServices(); if (!data.api_key) { setNewServiceOpen(false); toast("Сервис создан", "ok") } }
      else toast(data.error || data.detail || "Ошибка", "err")
    } catch { toast(tc("connectionError"), "err") }
  }

  async function handleSaveConfig() {
    if (!selectedService) return
    setConfigSaving(true)
    try {
      const parsed = JSON.parse(configJson)
      const res = await fetch(`/api/config/${selectedService.name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: parsed }) })
      const data = await res.json()
      if (res.ok) { setServiceConfig(data); toast(locale === "ru" ? "Конфигурация сохранена" : "Config saved", "ok") }
      else toast(data.error || "Error", "err")
    } catch { toast("Invalid JSON", "err") }
    finally { setConfigSaving(false) }
  }

  async function handleSaveSchema() {
    if (!selectedService) return
    setConfigSaving(true)
    try {
      const parsed = JSON.parse(schemaJson)
      const res = await fetch(`/api/config/${selectedService.name}/schema`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schema: parsed }) })
      if (res.ok) toast(locale === "ru" ? "Схема сохранена" : "Schema saved", "ok")
      else { const data = await res.json(); toast(data.error || "Error", "err") }
    } catch { toast("Invalid JSON", "err") }
    finally { setConfigSaving(false) }
  }

  const tabs: { id: "api" | "notifications" | "services"; label: string; icon: typeof Globe }[] = [
    { id: "api", label: t("api.title"), icon: Globe },
    { id: "notifications", label: t("notifications.title"), icon: Bell },
    { id: "services", label: locale === "ru" ? "Сервисы" : locale === "kz" ? "Сервистер" : "Services", icon: Server },
  ]

  const onlineCount = endpoints.filter(e => e.ok === true).length
  const totalEndpoints = endpoints.length

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-muted p-1 rounded-xl flex gap-0.5 border border-border/50 mb-6 max-w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2",
                activeTab === tab.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "api" && totalEndpoints > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${onlineCount === totalEndpoints ? "bg-success/10 text-success" : "bg-warning/10 text-warning-dark"}`}>
                  {onlineCount}/{totalEndpoints}
                </span>
              )}
              {tab.id === "notifications" && notifChanged && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      <div className="max-w-4xl">
        {/* API Health */}
        {activeTab === "api" && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">{t("api.subtitle")}</p>
              <button onClick={checkEndpoints} disabled={checking}
                className="h-8 px-3 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                {locale === "ru" ? "Проверить" : "Check"}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {endpoints.map((ep) => (
                <div key={ep.name} className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    {ep.ok === null ? (
                      <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                    ) : ep.ok ? (
                      <Wifi className="w-4 h-4 text-success" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-error" />
                    )}
                    <span className="text-sm font-medium text-foreground">{ep.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-muted-foreground">{ep.url}</code>
                    {ep.ok !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ep.ok ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                        {ep.ok ? "OK" : "ERR"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] animate-fade-in">
            <p className="text-sm text-muted-foreground mb-6">{t("notifications.subtitle")}</p>
            <div className="flex flex-col gap-1 mb-6">
              {[
                { label: locale === "ru" ? "Новые пользователи" : locale === "kz" ? "Жаңа пайдаланушылар" : "New users", desc: locale === "ru" ? "Уведомления о регистрации новых пользователей" : locale === "kz" ? "Жаңа пайдаланушылар тіркелгені туралы хабарламалар" : "Notifications about new user registrations", value: notifUsers, set: setNotifUsers },
                { label: locale === "ru" ? "Новые поездки" : locale === "kz" ? "Жаңа сапарлар" : "New rides", desc: locale === "ru" ? "Уведомления о создании новых поездок" : locale === "kz" ? "Жаңа сапарлар жасалғаны туралы хабарламалар" : "Notifications about new rides created", value: notifRides, set: setNotifRides },
                { label: locale === "ru" ? "Отменённые поездки" : locale === "kz" ? "Бас тартылған сапарлар" : "Cancelled rides", desc: locale === "ru" ? "Уведомления об отмене поездок" : locale === "kz" ? "Сапарлардан бас тартылғаны туралы хабарламалар" : "Notifications about cancelled rides", value: notifCancelled, set: setNotifCancelled },
              ].map(({ label, desc, value, set }) => (
                <label key={label} className="flex items-center justify-between cursor-pointer px-4 py-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <div>
                    <span className="text-sm font-bold text-foreground block">{label}</span>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                  <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)}
                    className="w-10 h-6 rounded-full appearance-none bg-muted checked:bg-primary transition-all cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-card before:rounded-full before:top-1 before:left-1 before:transition-all checked:before:translate-x-4" />
                </label>
              ))}
            </div>
            <button onClick={() => setConfirmOpen(true)} disabled={!notifChanged}
              className="h-10 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              {saved ? <><CheckCircle className="w-4 h-4" />{t("saved")}</> : <><Save className="w-4 h-4" />{t("saveChanges")}</>}
            </button>
          </div>
        )}

        {/* Config Service */}
        {activeTab === "services" && (
          <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">{locale === "ru" ? "Управление конфигами микросервисов" : locale === "kz" ? "Микросервис конфигтерін басқару" : "Manage microservice configs"}</p>
              <div className="flex items-center gap-2">
                <button onClick={fetchServices} disabled={servicesLoading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                  <RefreshCw className={`w-3.5 h-3.5 ${servicesLoading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => { setNewServiceOpen(true); setCreatedApiKey(""); setNewServiceName("") }}
                  className="h-8 px-3 bg-primary text-primary-foreground rounded-lg font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />{locale === "ru" ? "Добавить" : "Add"}
                </button>
              </div>
            </div>

            <div className="flex gap-4 min-h-[350px]">
              <div className="w-52 flex-shrink-0 border-r border-border/50 pr-4">
                {servicesLoading && services.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">{tc("loading")}</p>
                ) : services.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
                    <Inbox className="w-8 h-8 opacity-30" />
                    <p className="text-xs">{locale === "ru" ? "Нет сервисов" : "No services"}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {services.map((s) => (
                      <button key={s.id} onClick={() => fetchConfig(s)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-sm ${selectedService?.id === s.id ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                          <span className="truncate font-medium">{s.name}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {!selectedService ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <Code className="w-8 h-8 opacity-30" />
                    <p className="text-sm">{locale === "ru" ? "Выберите сервис" : "Select a service"}</p>
                  </div>
                ) : configLoading ? (
                  <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">{tc("loading")}</p></div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                        <button onClick={() => setConfigTab("config")}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${configTab === "config" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          {locale === "ru" ? "Конфигурация" : "Config"}
                        </button>
                        <button onClick={() => setConfigTab("schema")}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${configTab === "schema" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          JSON Schema
                        </button>
                      </div>
                      {serviceConfig?.checksum && configTab === "config" && (
                        <span className="text-[10px] font-mono text-muted-foreground">checksum: {serviceConfig.checksum.slice(0, 12)}...</span>
                      )}
                    </div>

                    {configTab === "config" ? (
                      <>
                        <textarea value={configJson} onChange={(e) => setConfigJson(e.target.value)} spellCheck={false}
                          className="flex-1 min-h-[200px] p-4 bg-background border border-border rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-[11px] text-muted-foreground">
                            {serviceConfig?.created_at && <span>{locale === "ru" ? "Обновлён" : "Updated"}: {new Date(serviceConfig.created_at).toLocaleString(localeCode)}</span>}
                          </div>
                          <button onClick={handleSaveConfig} disabled={configSaving}
                            className="h-9 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" />{configSaving ? tc("saving") : locale === "ru" ? "Сохранить" : "Save"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <textarea value={schemaJson} onChange={(e) => setSchemaJson(e.target.value)} spellCheck={false}
                          placeholder='{"type": "object", "properties": {...}}'
                          className="flex-1 min-h-[200px] p-4 bg-background border border-border rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40" />
                        <div className="flex justify-end mt-3">
                          <button onClick={handleSaveSchema} disabled={configSaving || !schemaJson.trim()}
                            className="h-9 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" />{configSaving ? tc("saving") : locale === "ru" ? "Сохранить схему" : "Save schema"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Service Modal */}
      {newServiceOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm animate-scale-in">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
              <h2 className="text-base font-bold text-foreground">{locale === "ru" ? "Новый сервис" : "New service"}</h2>
              <button onClick={() => setNewServiceOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {createdApiKey ? (
              <div className="p-6 flex flex-col gap-4">
                <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-xl">
                  <p className="text-sm font-bold text-success mb-1">{locale === "ru" ? "Сервис создан!" : "Service created!"}</p>
                  <p className="text-xs text-muted-foreground mb-2">{locale === "ru" ? "Скопируйте API-ключ. Он показывается только один раз." : "Copy the API key. It's shown only once."}</p>
                  <code className="block bg-background p-3 rounded-lg text-xs font-mono text-foreground break-all select-all border border-border">{createdApiKey}</code>
                </div>
                <button onClick={() => { setNewServiceOpen(false); setCreatedApiKey("") }}
                  className="h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">OK</button>
              </div>
            ) : (
              <form onSubmit={handleCreateService} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-foreground">{locale === "ru" ? "Название сервиса" : "Service name"}</label>
                  <input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="rides" required
                    className="h-10 px-3.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setNewServiceOpen(false)}
                    className="flex-1 h-10 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all">{tc("cancel")}</button>
                  <button type="submit"
                    className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">{locale === "ru" ? "Создать" : "Create"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Confirm notification save */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm animate-scale-in p-6">
            <h2 className="text-base font-bold text-foreground mb-2">
              {locale === "ru" ? "Сохранить настройки?" : locale === "kz" ? "Баптауларды сақтау?" : "Save settings?"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {locale === "ru"
                ? "Настройки уведомлений будут обновлены. Изменения вступят в силу сразу."
                : locale === "kz"
                ? "Хабарлама баптаулары жаңартылады. Өзгерістер бірден күшіне енеді."
                : "Notification settings will be updated. Changes take effect immediately."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 h-10 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all">
                {tc("cancel")}
              </button>
              <button onClick={confirmSaveNotif}
                className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all">
                {t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
