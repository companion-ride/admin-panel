import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  change: string
  changeType: "positive" | "negative"
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

export function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconColor,
  iconBg,
}: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div
          className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {change && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-bold",
              changeType === "positive" ? "text-success" : "text-error"
            )}
          >
            {change}
            {changeType === "positive" ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
        {title}
      </p>
      <h3 className="text-[28px] font-bold text-foreground mt-1">{value}</h3>
    </div>
  )
}
