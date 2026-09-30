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
  coveredBy: string | null  // person who covered this shift on your behalf
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
  coveredBy?: string | null
}

export interface ShiftUpdateInput {
  status?: ShiftStatus
  coveringFor?: string
  locationName?: string
  notes?: string
  amountEarned?: string
  hoursWorked?: number
  coveredBy?: string | null
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
// export function buildStationNotes(taxWithheld: number, userNote: string): string {
//   const note = (userNote ?? '').trim()
//   return note
//     ? `tax:${taxWithheld.toFixed(2)}||${note}`
//     : `tax:${taxWithheld.toFixed(2)}`
// }

export function buildStationNotes(
  tax: number,
  userNote: string,
  clockin?: string,   // HH:MM
  clockout?: string,  // HH:MM
): string {
  let meta = `__station__|tax:${tax.toFixed(2)}`;
  if (clockin) meta += `|clockin:${clockin}`;
  if (clockout) meta += `|clockout:${clockout}`;
  return `${meta}||${userNote ?? ""}`;
}

export function parseStationClockin(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/clockin:(\d{2}:\d{2})/);
  return m ? m[1] : null;
}

export function parseStationClockout(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/clockout:(\d{2}:\d{2})/);
  return m ? m[1] : null;
}


/** Extract user-visible note from station shift notes field. */
export function parseStationUserNote(notes: string): string {
  const idx = notes.indexOf('||')
  return idx >= 0 ? notes.slice(idx + 2).trim() : ''
}

// ============================================
// Hall shift fines
// Stored inside the notes field (no schema change), like station tax:
//   __fine__|amt:20.00|inc:1||user note
// `inc` = 1 means the fine is deducted from the shift total.
// ============================================

const FINE_TAG = '__fine__|'

export interface HallFine {
  amount: number
  included: boolean
}

export function parseHallFine(notes: string | null | undefined): HallFine {
  if (!notes || !notes.startsWith(FINE_TAG)) return { amount: 0, included: false }
  const head = notes.split('||')[0]
  const a = head.match(/amt:([\d.]+)/)
  const i = head.match(/inc:([01])/)
  const amount = a ? Number(a[1]) : 0
  return { amount: Number.isNaN(amount) ? 0 : amount, included: i ? i[1] === '1' : false }
}

/** User-visible note of a hall shift, with any fine metadata stripped. */
export function parseHallUserNote(notes: string | null | undefined): string {
  if (!notes) return ''
  if (!notes.startsWith(FINE_TAG)) return notes
  const idx = notes.indexOf('||')
  return idx >= 0 ? notes.slice(idx + 2).trim() : ''
}

export function buildHallNotes(fineAmount: number, included: boolean, userNote: string): string {
  const note = (userNote ?? '').trim()
  if (!(fineAmount > 0)) return note
  return `${FINE_TAG}amt:${fineAmount.toFixed(2)}|inc:${included ? 1 : 0}||${note}`
}

/** User-visible note for any shift (hall or station). */
export function shiftUserNote(shift: Pick<Shift, 'locationName' | 'notes'>): string {
  return isStationShift(shift) ? parseStationUserNote(shift.notes ?? '') : parseHallUserNote(shift.notes)
}

/** Fine info for a shift (always zero for station shifts). */
export function shiftFine(shift: Pick<Shift, 'locationName' | 'notes'>): HallFine {
  return isStationShift(shift) ? { amount: 0, included: false } : parseHallFine(shift.notes)
}

/** Amount that counts toward totals: earned minus the fine when it is included. */
export function effectiveAmount(shift: Pick<Shift, 'locationName' | 'notes' | 'amountEarned'>): number {
  const gross = parseFloat(shift.amountEarned) || 0
  const fine = shiftFine(shift)
  return fine.included ? Math.max(0, gross - fine.amount) : gross
}
