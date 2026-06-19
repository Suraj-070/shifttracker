// ============================================
// Database Types — mirrors the Prisma schema
// ============================================

export type ShiftStatus = 'Paid' | 'Unpaid'

export interface UserProfile {
  id: string
  name: string | null
  email: string | null
  username: string | null
  image: string | null
  createdAt: string
  totalShifts: number
  totalEarnings: number
}

export interface Shift {
  id: string
  userId: string
  coveringFor: string     // e.g. "Sarah Mitchell" — person the shift covers for
  shiftDate: string       // ISO date string e.g. "2026-06-15"
  locationName: string    // e.g. "Eastgardens", "Town Hall"
  notes: string           // free-text note about the shift
  shiftDay: string        // e.g. "Sunday", "Monday"
  amountEarned: string    // Decimal string e.g. "180.00"
  status: ShiftStatus
  createdAt: string       // ISO timestamp
}

export interface ShiftCreateInput {
  coveringFor: string
  shiftDate: string
  locationName: string
  notes?: string
  shiftDay: string
  amountEarned: string
  status?: ShiftStatus
}

export interface ShiftUpdateInput {
  status?: ShiftStatus
  coveringFor?: string
  locationName?: string
  notes?: string
  amountEarned?: string
}

// Grouped shifts by month for the Shifts tab
export interface MonthGroup {
  monthKey: string        // e.g. "2026-06"
  monthLabel: string      // e.g. "June 2026"
  shifts: Shift[]
  totalEarned: number
  paidCount: number
  unpaidCount: number
}

// Analytics summary
export interface AnalyticsSummary {
  totalEarned: number
  totalPaid: number
  totalUnpaid: number
  totalShifts: number
  paidShifts: number
  unpaidShifts: number
  averagePerShift: number
}

export interface MonthlyEarning {
  monthKey: string
  monthLabel: string
  earned: number
  paid: number
  unpaid: number
  shiftCount: number
}

// API response types
export interface ShiftsResponse {
  shifts: Shift[]
  userId: string
}

export interface ProfileResponse {
  profile: UserProfile
}
