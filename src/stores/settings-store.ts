import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'card' | 'list' | 'table'
type CardDensity = 'compact' | 'comfortable' | 'spacious'
type ThemeMode = 'light' | 'dark' | 'system'
type AccentColor = 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'orange'
type DefaultTab = 'dashboard' | 'shifts' | 'calendar'
type HapticsStrength = 'light' | 'medium' | 'strong'
type SwipeSensitivity = 'low' | 'medium' | 'high'

// ── Pay rate settings ────────────────────────────────────────────────────────
export interface PayRateSettings {
  afternoonRate: number;
  saturdayRate: number;
  sundayRate: number;
  taxRate: number;        // decimal e.g. 0.0598
  defaultHallAmount: number;
}

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
  hapticsStrength: HapticsStrength
  setHapticsStrength: (strength: HapticsStrength) => void

  // Mobile specific
  payRates: PayRateSettings
  setPayRates: (rates: PayRateSettings) => void
  defaultTab: DefaultTab
  setDefaultTab: (tab: DefaultTab) => void
  swipeSensitivity: SwipeSensitivity
  setSwipeSensitivity: (s: SwipeSensitivity) => void
  compactDashboard: boolean
  setCompactDashboard: (v: boolean) => void
  longPressDelay: number  // ms
  setLongPressDelay: (ms: number) => void

  // Notifications
  weeklyReminder: boolean
  setWeeklyReminder: (enabled: boolean) => void
  paymentReminder: boolean
  setPaymentReminder: (enabled: boolean) => void

  // Data
  lastSyncTime: string | null
  setLastSyncTime: (time: string) => void
}

export type {
  ViewMode, CardDensity, ThemeMode, AccentColor,
  DefaultTab, HapticsStrength, SwipeSensitivity, SettingsState
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      viewMode: 'card',
      setViewMode: (mode) => set({ viewMode: mode }),

      theme: 'system',
      setTheme: (theme) => set({ theme }),
      accentColor: 'emerald',
      setAccentColor: (color) => set({ accentColor: color }),

      cardDensity: 'comfortable',
      setCardDensity: (density) => set({ cardDensity: density }),

      enableAnimations: true,
      setEnableAnimations: (enabled) => set({ enableAnimations: enabled }),
      enableHaptics: true,
      setEnableHaptics: (enabled) => set({ enableHaptics: enabled }),
      hapticsStrength: 'medium',
      setHapticsStrength: (strength) => set({ hapticsStrength: strength }),

      payRates: {
        afternoonRate: 37.91,
        saturdayRate: 47.38,
        sundayRate: 60.94,
        taxRate: 0.0598,
        defaultHallAmount: 115,
      },
      setPayRates: (rates) => set({ payRates: rates }),
      defaultTab: 'dashboard',
      setDefaultTab: (tab) => set({ defaultTab: tab }),
      swipeSensitivity: 'medium',
      setSwipeSensitivity: (s) => set({ swipeSensitivity: s }),
      compactDashboard: false,
      setCompactDashboard: (v) => set({ compactDashboard: v }),
      longPressDelay: 450,
      setLongPressDelay: (ms) => set({ longPressDelay: ms }),

      weeklyReminder: true,
      setWeeklyReminder: (enabled) => set({ weeklyReminder: enabled }),
      paymentReminder: true,
      setPaymentReminder: (enabled) => set({ paymentReminder: enabled }),

      lastSyncTime: null,
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
    }),
    { name: 'shift-tracker-settings' }
  )
)
