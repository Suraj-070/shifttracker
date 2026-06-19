'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string
  icon: React.ElementType
  accent: 'default' | 'emerald' | 'rose'
}

const accentStyles = {
  default: {
    iconBg: 'bg-muted',
    iconText: 'text-muted-foreground',
  },
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    iconText: 'text-emerald-600 dark:text-emerald-400',
  },
  rose: {
    iconBg: 'bg-rose-100 dark:bg-rose-950/50',
    iconText: 'text-rose-600 dark:text-rose-400',
  },
}

export function StatCard({ title, value, icon: Icon, accent }: StatCardProps) {
  const styles = accentStyles[accent]

  return (
    <Card className="gap-3 py-4">
      <div className="px-4 flex items-center gap-3">
        <div className={cn('flex size-8 items-center justify-center rounded-lg', styles.iconBg)}>
          <Icon className={cn('size-4', styles.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-base font-bold tracking-tight truncate">{value}</p>
        </div>
      </div>
    </Card>
  )
}
