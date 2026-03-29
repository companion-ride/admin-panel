"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"
import en from "@/messages/en.json"
import ru from "@/messages/ru.json"
import kz from "@/messages/kz.json"

export type Locale = "en" | "ru" | "kz"

const messages: Record<Locale, typeof en> = { en, ru, kz }

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ru",
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru")

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null
    if (saved && ["en", "ru", "kz"].includes(saved) && saved !== "ru") {
      setLocaleState(saved)
    }
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem("locale", l)
    document.documentElement.lang = l
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} key={locale} timeZone="Asia/Almaty">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
