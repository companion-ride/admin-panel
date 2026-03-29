import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/toast"
import { LocaleProvider } from "@/components/locale-provider"
import { AuthProvider } from "@/components/auth-provider"

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Companion Admin",
  description: "Admin panel for Companion ride-sharing application",
}

export const viewport: Viewport = {
  themeColor: "#0052CC",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans" suppressHydrationWarning>
        <LocaleProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
