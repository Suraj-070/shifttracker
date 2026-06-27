// ============================================
// Database Types — mirrors the Supabase schema
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
  coveringFor: string     // hall: person name | station: station name e.g. "Central"
  shiftDate: string       // ISO date string e.g. "2026-06-15"
  locationName: string    // hall: location | station: "Station Cleaning"
  notes: string           // hall: free text | station: "tax:90.50"
  shiftDay: string        // e.g. "Sunday", "Monday"
  amountEarned: string    // Decimal string e.g. "180.00"
  hoursWorked: number     // hours worked (0 for hall shifts if not tracked)
  status: ShiftStatus
  createdAt: string
}

export interface ShiftCreateInput {
  coveringFor: string
  shiftDate: string
  locationName: string
  notes?: string
  shiftDay: string
  amountEarned: string
  hoursWorked?: number
  status?: ShiftStatus
}

export interface ShiftUpdateInput {
  status?: ShiftStatus
  coveringFor?: string
  locationName?: string
  notes?: string
  amountEarned?: string
  hoursWorked?: number
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

// ============================================
// Station Cleaning helpers
// ============================================

/** Sentinel location value that marks a shift as a station-cleaning shift. */
export const STATION_LOCATION = 'Station Cleaning'

/** Returns true when the given shift is a station-cleaning shift. */
export function isStationShift(shift: Pick<Shift, 'locationName'>): boolean {
  return shift.locationName === STATION_LOCATION
}

/** Parsed tax withheld from station shift notes field. */
export function parseStationTax(notes: string): number {
  const match = notes.match(/tax:([\d.]+)/)
  if (!match) return 0
  const n = Number(match[1])
  return Number.isNaN(n) ? 0 : n
}

/** Build the notes string for a station shift. */
export function buildStationNotes(taxWithheld: number, userNote: string): string {
  const note = (userNote ?? '').trim()
  return note
    ? `tax:${taxWithheld.toFixed(2)}||${note}`
    : `tax:${taxWithheld.toFixed(2)}`
}

/** Extract user-visible note from station shift notes field. */
export function parseStationUserNote(notes: string): string {
  const idx = notes.indexOf('||')
  return idx >= 0 ? notes.slice(idx + 2).trim() : ''
}