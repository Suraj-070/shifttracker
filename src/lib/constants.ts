export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const DEFAULT_LOCATIONS: string[] = []
export const DEFAULT_COVER_NAMES: string[] = []
export const DEFAULT_SHIFT_AMOUNT = '115'

export const CHART_CONFIG = {
  paid: { label: 'Paid', color: 'oklch(0.7 0.17 155)' },
  unpaid: { label: 'Unpaid', color: 'oklch(0.65 0.2 25)' },
  earned: { label: 'Earned', color: 'oklch(0.7 0.17 155)' },
} as const

// ── Station rates — updated from payslip 22/7/2026 ───────────────────────────
// CAS Afternoon: $37.91/hr (was $36.19)
// Saturday/Sunday estimates scaled by same ratio (37.91/36.19 = 1.0475)
export const STATION_RATES = {
  Afternoon: 37.91,
  Saturday:  47.38,   // 45.24 × 1.0475
  Sunday:    60.94,   // 58.16 × 1.0475
} as const

export type StationRateKey = keyof typeof STATION_RATES

/** PAYG withholding rate from Cleantech1 payslip ($68 tax on $1137.30 = 5.98%) */
export const STATION_TAX_RATE = 0.0598
