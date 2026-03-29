"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/components/locale-provider"

interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  className?: string
}

const MONTH_NAMES: Record<string, string[]> = {
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  kz: ["Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым", "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан"],
}

const DAY_NAMES: Record<string, string[]> = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  kz: ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"],
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday = 0
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const parsed = value ? new Date(value) : new Date()
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())

  const months = MONTH_NAMES[locale] ?? MONTH_NAMES.ru
  const days = DAY_NAMES[locale] ?? DAY_NAMES.ru

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDay = firstDayOfMonth(viewYear, viewMonth)
  const today = new Date()
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  function selectDay(day: number) {
    onChange(toISO(viewYear, viewMonth, day))
    setOpen(false)
  }

  function selectToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    onChange(todayISO)
    setOpen(false)
  }

  // Format display value
  const displayValue = value
    ? new Date(value).toLocaleDateString(locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" })
    : ""

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 px-3 bg-muted border border-border/50 rounded-lg text-xs text-foreground hover:bg-muted/80 transition-all flex items-center gap-2 min-w-[130px]"
      >
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <span className={value ? "font-medium" : "text-muted-foreground"}>{displayValue || "—"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-2xl p-3 w-[280px] animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-bold text-foreground">
              {months[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-1">
            {days.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground/50 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1
              const iso = toISO(viewYear, viewMonth, day)
              const isSelected = iso === value
              const isToday = iso === todayISO
              const isSunday = (startDay + i) % 7 === 6

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "w-full aspect-square rounded-lg text-[13px] font-medium transition-all flex items-center justify-center",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : isToday
                      ? "bg-primary/10 text-primary font-bold"
                      : isSunday
                      ? "text-error/60 hover:bg-muted"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false) }}
              className="text-[11px] font-bold text-muted-foreground hover:text-error transition-colors"
            >
              {locale === "ru" ? "Очистить" : locale === "kz" ? "Тазалау" : "Clear"}
            </button>
            <button
              type="button"
              onClick={selectToday}
              className="text-[11px] font-bold text-primary hover:text-primary-hover transition-colors"
            >
              {locale === "ru" ? "Сегодня" : locale === "kz" ? "Бүгін" : "Today"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
