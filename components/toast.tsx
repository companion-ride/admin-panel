"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { CheckCircle, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "ok" | "err" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
  removing?: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICON_MAP = {
  ok: { icon: CheckCircle, bg: "bg-success/10", border: "border-success/30", color: "text-success" },
  err: { icon: AlertCircle, bg: "bg-error/10", border: "border-error/30", color: "text-error" },
  info: { icon: Info, bg: "bg-primary/10", border: "border-primary/30", color: "text-primary" },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, removing: true } : t))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300)
  }, [])

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-3 pointer-events-none">
        {toasts.map((t) => {
          const style = ICON_MAP[t.type]
          const Icon = style.icon
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] backdrop-blur-sm text-sm font-medium pointer-events-auto transition-all duration-300",
                "bg-card/95",
                style.border,
                t.removing ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0 animate-slide-in-up"
              )}
              style={{ minWidth: 280, maxWidth: 380 }}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", style.bg)}>
                <Icon className={cn("w-4 h-4", style.color)} />
              </div>
              <span className="flex-1 text-foreground leading-snug">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}
