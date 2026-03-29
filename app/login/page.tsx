"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft } from "lucide-react"

type Step = "phone" | "code"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === "code") {
      codeRef.current?.focus()
      startCountdown()
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function startCountdown() {
    setCountdown(60)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Не удалось отправить код"); return }
      setStep("code")
    } catch {
      setError("Ошибка подключения. Попробуйте снова.")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Неверный код"); return }
      router.push("/")
      router.refresh()
    } catch {
      setError("Ошибка подключения. Попробуйте снова.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError("")
    setCode("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Не удалось отправить код"); return }
      startCountdown()
    } catch {
      setError("Ошибка подключения. Попробуйте снова.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image src="/logo.png" alt="Companion" width={40} height={40} className="rounded-xl flex-shrink-0" unoptimized />
          <div>
            <span className="text-lg font-bold tracking-tight text-foreground block leading-none">Companion</span>
            <span className="text-[11px] text-muted-foreground leading-none">Панель администратора</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] p-8">
          {step === "phone" ? (
            <>
              <div className="mb-6">
                <h1 className="text-[22px] font-bold text-foreground leading-tight">Вход в панель</h1>
                <p className="text-sm text-muted-foreground mt-1">Введите номер телефона для получения кода</p>
              </div>

              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-foreground">Номер телефона</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    autoComplete="tel"
                    required
                    className="h-11 px-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground"
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 bg-error/8 border border-error/20 rounded-xl text-sm text-error font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  {loading ? "Отправка..." : "Получить код"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <button
                  onClick={() => { setStep("phone"); setCode(""); setError("") }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>
                <h1 className="text-[22px] font-bold text-foreground leading-tight">Введите код</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Код отправлен на <span className="font-semibold text-foreground">{phone}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-foreground">Код из SMS</label>
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="______"
                    autoComplete="one-time-code"
                    required
                    className="h-11 px-4 bg-background border border-border rounded-xl text-sm text-center tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground placeholder:tracking-normal"
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 bg-error/8 border border-error/20 rounded-xl text-sm text-error font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length < 4}
                  className="h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  {loading ? "Проверка..." : "Войти"}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">Повторная отправка через {countdown} сек</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-sm text-primary font-semibold hover:underline disabled:opacity-50"
                    >
                      Отправить код повторно
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          © {new Date().getFullYear()} Companion · Все права защищены
        </p>
      </div>
    </div>
  )
}
