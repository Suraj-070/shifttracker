export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Starting suggestions only — the app also learns new locations and
// names you type in and adds them to the suggestion list automatically.
export const DEFAULT_LOCATIONS = []

export const DEFAULT_COVER_NAMES = []

export const DEFAULT_SHIFT_AMOUNT = '115'

export const CHART_CONFIG = {
  paid: { label: 'Paid', color: 'oklch(0.7 0.17 155)' },
  unpaid: { label: 'Unpaid', color: 'oklch(0.65 0.2 25)' },
  earned: { label: 'Earned', color: 'oklch(0.7 0.17 155)' },
} as const
