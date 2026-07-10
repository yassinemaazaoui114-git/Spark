import AsyncStorage from '@react-native-async-storage/async-storage'

// Small key-value preferences (theme, flags, recent searches).
// Anything with structure/volume goes in SQLite instead.

export const PREF_KEYS = {
  theme: 'spark:theme',
  iconVariant: 'spark:icon-variant',
  biometricEnabled: 'spark:biometric-enabled',
  onboarded: 'spark:onboarded',
  recentSearches: 'spark:recent-searches',
} as const

export async function getPref(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key)
  } catch {
    return null
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value)
  } catch {
    // Non-critical — prefs failing to persist should never crash the app
  }
}

export async function removePref(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export async function getJsonPref<T>(key: string, fallback: T): Promise<T> {
  const raw = await getPref(key)
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function setJsonPref<T>(key: string, value: T): Promise<void> {
  await setPref(key, JSON.stringify(value))
}
