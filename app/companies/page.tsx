"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Construction } from "lucide-react"
import { useTranslations } from "next-intl"

export default function CompaniesPage() {
  const t = useTranslations("companies")
  const tc = useTranslations("common")

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-[15px] text-muted-foreground mt-1">{t("subtitle", { count: 0 })}</p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Construction className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-foreground">{tc("inDevelopment")}</p>
          <p className="text-sm text-muted-foreground mt-1">{tc("pageNotUsed")}</p>
        </div>
      </div>
    </AdminLayout>
  )
}
