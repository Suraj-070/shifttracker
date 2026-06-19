import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getDayFromDate(dateStr: string): string {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const d = new Date(dateStr + 'T00:00:00')
  return DAYS[d.getDay()]
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr + 'T00:00:00')
  return d.toDateString() === today.toDateString()
}

export function isThisWeek(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr + 'T00:00:00')
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return d >= startOfWeek && d < endOfWeek
}

export function isThisMonth(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr + 'T00:00:00')
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

/**
 * Builds an autocomplete suggestion list from past values plus a
 * starting default list, most-used first, with no duplicates.
 */
export function buildSuggestions(history: string[], defaults: string[]): string[] {
  const counts = new Map<string, number>()
  for (const v of history) {
    const trimmed = v.trim()
    if (!trimmed) continue
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
  }
  for (const v of defaults) {
    if (!counts.has(v)) counts.set(v, 0)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
}
