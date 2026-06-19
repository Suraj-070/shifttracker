import { useSettingsStore } from "@/stores/settings-store";

/**
 * Returns a vibrate() function that respects the enableHaptics setting.
 * Usage: const haptics = useHaptics(); haptics(10); // 10ms buzz
 */
export function useHaptics() {
  const enabled = useSettingsStore((s) => s.enableHaptics);

  return (duration = 8) => {
    if (!enabled) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(duration);
    }
  };
}