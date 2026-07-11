import * as LocalAuthentication from 'expo-local-authentication'

import { PREF_KEYS, getPref, removePref, setPref } from '@/storage/prefs'

// Biometric unlock (Step 30). The PWA used WebAuthn with a stored credential;
// native is far simpler — expo-local-authentication talks straight to the OS
// keystore, so there is nothing to store beyond an on/off flag.

// Device actually has fingerprint/face hardware AND the user has enrolled at
// least one — both are required before we offer the setting.
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ])
    return hasHardware && isEnrolled
  } catch {
    return false
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await getPref(PREF_KEYS.biometricEnabled)) === '1'
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await setPref(PREF_KEYS.biometricEnabled, '1')
  } else {
    await removePref(PREF_KEYS.biometricEnabled)
  }
}

// Prompt the OS biometric sheet. Returns true only on a verified success.
// Used both to unlock and to gate security changes (e.g. disabling the lock),
// so the prompt message is caller-supplied.
export async function authenticate(promptMessage = 'Unlock Spark'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      // Allow the device passcode as a fallback so a failed fingerprint scan
      // never locks the user out of their own notes.
      disableDeviceFallback: false,
    })
    return result.success
  } catch {
    return false
  }
}
