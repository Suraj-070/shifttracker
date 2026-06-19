import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'card' | 'list' | 'table'
type CardDensity = 'compact' | 'comfortable' | 'spacious'
type ThemeMode = 'light' | 'dark' | 'system'
type AccentColor = 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'orange'

interface SettingsState {
  // View preferences
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Appearance
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  accentColor: AccentColor
  setAccentColor: (color: AccentColor) => void

  // Customization
  cardDensity: CardDensity
  setCardDensity: (density: CardDensity) => void

  // Behavior
  enableAnimations: boolean
  setEnableAnimations: (enabled: boolean) => void
  enableHaptics: boolean
  setEnableHaptics: (enabled: boolean) => void

  // Notifications
  weeklyReminder: boolean
  setWeeklyReminder: (enabled: boolean) => void
  paymentReminder: boolean
  setPaymentReminder: (enabled: boolean) => void

  // Data
  lastSyncTime: string | null
  setLastSyncTime: (time: string) => void
}

export type { ViewMode, CardDensity, ThemeMode, AccentColor, SettingsState }

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // View preferences
      viewMode: 'card',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Appearance
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      accentColor: 'emerald',
      setAccentColor: (color) => set({ accentColor: color }),

      // Customization
      cardDensity: 'comfortable',
      setCardDensity: (density) => set({ cardDensity: density }),

      // Behavior
      enableAnimations: true,
      setEnableAnimations: (enabled) => set({ enableAnimations: enabled }),
      enableHaptics: true,
      setEnableHaptics: (enabled) => set({ enableHaptics: enabled }),

      // Notifications
      weeklyReminder: true,
      setWeeklyReminder: (enabled) => set({ weeklyReminder: enabled }),
      paymentReminder: true,
      setPaymentReminder: (enabled) => set({ paymentReminder: enabled }),

      // Data
      lastSyncTime: null,
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
    }),
    {
      name: 'shift-tracker-settings',
    }
  )
)
