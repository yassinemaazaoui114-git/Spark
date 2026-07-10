import * as Haptics from 'expo-haptics'

// Haptic feedback helper — port of the PWA's vibration patterns onto
// expo-haptics' semantic API. Fire-and-forget, never throws.

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

export function haptic(pattern: HapticPattern = 'light') {
  const run = () => {
    switch (pattern) {
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      case 'heavy':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }
  run().catch(() => {
    // Haptics are a nice-to-have, never a requirement
  })
}
