"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Save, Globe, Bell, Shield, CheckCircle, Server, Plus, X, ChevronRight, RefreshCw, Code, Inbox } from "lucide-react"
import { useTranslations } from "next-intl"
import { useToast } from "@/components/toast"

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

export default function SettingsPage() {
  const t = useTranslations("settings")
  const { toast } = useToast()

  // Local settings
  const [apiUrl, setApiUrl] = useState("")
  const [gisKey, setGisKey] = useState("")
  const [whatsappToken, setWhatsappToken] = useState("")
  const [notifySupport, setNotifySupport] = useState(true)
  const [notifyCancel, setNotifyCancel] = useState(true)
  const [notifyDowntime, setNotifyDowntime] = useState(true)
  const [saved, setSaved] = useState(false)

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

  useEffect(() => {
    const s = localStorage.getItem("companion_settings")
    if (!s) return
    try {
      const parsed = JSON.parse(s)
      if (parsed.apiUrl !== undefined) setApiUrl(parsed.apiUrl)
      if (parsed.gisKey !== undefined) setGisKey(parsed.gisKey)
      if (parsed.whatsappToken !== undefined) setWhatsappToken(parsed.whatsappToken)
      if (parsed.notifySupport !== undefined) setNotifySupport(parsed.notifySupport)
      if (parsed.notifyCancel !== undefined) setNotifyCancel(parsed.notifyCancel)
      if (parsed.notifyDowntime !== undefined) setNotifyDowntime(parsed.notifyDowntime)
    } catch {}
  }, [])

  const fetchServices = useCallback(async () => {
    setServicesLoading(true)
    try {
      const res = await fetch("/api/config/services")
      if (res.ok) {
        const data = await res.json()
        setServices(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setServicesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

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
      } else if (res.status === 404) {
        setServiceConfig(null)
        setConfigJson("{}")
      }
    } catch {
      setServiceConfig(null)
      setConfigJson("{}")
    } finally {
      setConfigLoading(false)
    }
    setSchemaJson("")
  }

  function handleSave() {
    localStorage.setItem(
      "companion_settings",
      JSON.stringify({ apiUrl, gisKey, whatsappToken, notifySupport, notifyCancel, notifyDowntime })
    )
    setSaved(true)
    toast(t("saved"), "ok")
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault()
    if (!newServiceName.trim()) return
    try {
      const res = await fetch("/api/config/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newServiceName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreatedApiKey(data.api_key || "")
        setNewServiceName("")
        fetchServices()
        if (!data.api_key) {
          setNewServiceOpen(false)
          toast("Сервис создан", "ok")
        }
      } else {
        toast(data.error || data.detail || "Ошибка создания", "err")
      }
    } catch {
      toast("Ошибка подключения", "err")
    }
  }

  async function handleSaveConfig() {
    if (!selectedService) return
    setConfigSaving(true)
    try {
      const parsed = JSON.parse(configJson)
      const res = await fetch(`/api/config/${selectedService.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: parsed }),
      })
      const data = await res.json()
      if (res.ok) {
        setServiceConfig(data)
        toast("Конфигурация сохранена", "ok")
      } else {
        toast(data.error || data.detail || "Ошибка сохранения", "err")
      }
    } catch {
      toast("Невалидный JSON", "err")
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleSaveSchema() {
    if (!selectedService) return
    setConfigSaving(true)
    try {
      const parsed = JSON.parse(schemaJson)
      const res = await fetch(`/api/config/${selectedService.name}/schema`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: parsed }),
      })
      if (res.ok) {
        toast("Схема сохранена", "ok")
      } else {
        const data = await res.json()
        toast(data.error || data.detail || "Ошибка сохранения", "err")
      }
    } catch {
      toast("Невалидный JSON", "err")
    } finally {
      setConfigSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button onClick={handleSave}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
          {saved ? <><CheckCircle className="w-4 h-4" />{t("saved")}</> : <><Save className="w-4 h-4" />{t("saveChanges")}</>}
        </button>
      </div>

      <div className="flex flex-col gap-6 max-w-4xl">
        {/* Config Service */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Server className="w-5 h-5 text-info" /></div>
              <div>
                <h3 className="text-base font-bold text-foreground">Сервисы и конфигурации</h3>
                <p className="text-xs text-muted-foreground">Управление конфигами микросервисов</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchServices}
                disabled={servicesLoading}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${servicesLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => { setNewServiceOpen(true); setCreatedApiKey(""); setNewServiceName("") }}
                className="h-9 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить сервис
              </button>
            </div>
          </div>

          <div className="flex gap-4 min-h-[300px]">
            {/* Services List */}
            <div className="w-56 flex-shrink-0 border-r border-border/50 pr-4">
              {servicesLoading && services.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">Загрузка...</p>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
                  <Inbox className="w-8 h-8 opacity-30" />
                  <p className="text-xs">Нет сервисов</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => fetchConfig(s)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                        selectedService?.id === s.id
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
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

            {/* Config Editor */}
            <div className="flex-1 min-w-0">
              {!selectedService ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Code className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Выберите сервис</p>
                </div>
              ) : configLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Загрузка конфига...</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                      <button
                        onClick={() => setConfigTab("config")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          configTab === "config" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Конфигурация
                      </button>
                      <button
                        onClick={() => setConfigTab("schema")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          configTab === "schema" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        JSON Schema
                      </button>
                    </div>
                    {serviceConfig?.checksum && configTab === "config" && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        checksum: {serviceConfig.checksum.slice(0, 12)}...
                      </span>
                    )}
                  </div>

                  {configTab === "config" ? (
                    <>
                      <textarea
                        value={configJson}
                        onChange={(e) => setConfigJson(e.target.value)}
                        spellCheck={false}
                        className="flex-1 min-h-[200px] p-4 bg-background border border-border rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-[11px] text-muted-foreground">
                          {serviceConfig?.created_at && (
                            <span>Обновлён: {new Date(serviceConfig.created_at).toLocaleString("ru-RU")}</span>
                          )}
                        </div>
                        <button
                          onClick={handleSaveConfig}
                          disabled={configSaving}
                          className="h-9 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {configSaving ? "Сохранение..." : "Сохранить конфиг"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <textarea
                        value={schemaJson}
                        onChange={(e) => setSchemaJson(e.target.value)}
                        spellCheck={false}
                        placeholder='{"type": "object", "properties": {...}, "required": [...]}'
                        className="flex-1 min-h-[200px] p-4 bg-background border border-border rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40"
                      />
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleSaveSchema}
                          disabled={configSaving || !schemaJson.trim()}
                          className="h-9 px-5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {configSaving ? "Сохранение..." : "Сохранить схему"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Config */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Globe className="w-5 h-5 text-primary" /></div>
            <div>
              <h3 className="text-base font-bold text-foreground">{t("api.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("api.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 block">{t("api.baseUrl")}</label>
              <input type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                className="w-full h-11 px-4 bg-muted border border-border/50 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 block">{t("api.gisKey")}</label>
              <input type="password" value={gisKey} onChange={(e) => setGisKey(e.target.value)} placeholder="••••••••••••••••"
                className="w-full h-11 px-4 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 block">{t("api.whatsappToken")}</label>
              <input type="password" value={whatsappToken} onChange={(e) => setWhatsappToken(e.target.value)} placeholder="••••••••••••••••"
                className="w-full h-11 px-4 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all" />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Bell className="w-5 h-5 text-warning" /></div>
            <div>
              <h3 className="text-base font-bold text-foreground">{t("notifications.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("notifications.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: t("notifications.supportAlerts"),      value: notifySupport,  set: setNotifySupport  },
              { label: t("notifications.cancellationAlerts"), value: notifyCancel,   set: setNotifyCancel   },
              { label: t("notifications.downtimeAlerts"),     value: notifyDowntime, set: setNotifyDowntime },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => set(e.target.checked)}
                  className="w-10 h-6 rounded-full appearance-none bg-muted checked:bg-primary transition-all cursor-pointer relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-card before:rounded-full before:top-1 before:left-1 before:transition-all checked:before:translate-x-4"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center"><Shield className="w-5 h-5 text-error" /></div>
            <div>
              <h3 className="text-base font-bold text-foreground">{t("security.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("security.subtitle")}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 block">{t("security.password")}</label>
            <input type="password" defaultValue="••••••••••••"
              className="w-full h-11 px-4 bg-muted border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all" />
          </div>
        </div>
      </div>

      {/* New Service Modal */}
      {newServiceOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm animate-scale-in">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
              <h2 className="text-base font-bold text-foreground">Новый сервис</h2>
              <button onClick={() => setNewServiceOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {createdApiKey ? (
              <div className="p-6 flex flex-col gap-4">
                <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-xl">
                  <p className="text-sm font-bold text-success mb-1">Сервис создан!</p>
                  <p className="text-xs text-muted-foreground mb-2">Скопируйте API-ключ. Он показывается только один раз.</p>
                  <code className="block bg-background p-3 rounded-lg text-xs font-mono text-foreground break-all select-all border border-border">
                    {createdApiKey}
                  </code>
                </div>
                <button
                  onClick={() => { setNewServiceOpen(false); setCreatedApiKey("") }}
                  className="h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                >
                  Готово
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateService} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-foreground">Название сервиса</label>
                  <input
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="rides"
                    required
                    className="h-10 px-3.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewServiceOpen(false)}
                    className="flex-1 h-10 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
