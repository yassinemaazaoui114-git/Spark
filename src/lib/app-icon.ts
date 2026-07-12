import Constants, { ExecutionEnvironment } from 'expo-constants'

import type { IconVariant } from '@/theme/tokens'

// Real launcher-icon switching (Step 36). expo-alternate-app-icons is a
// native module — absent from Expo Go AND from any APK built before this
// step. Requiring the JS package throws at module eval when the native side
// is missing, and even a caught require gets reported to LogBox by Metro in
// dev. So before requiring we ask expo-modules-core's registry
// (global.expo.modules — the same source requireNativeModule reads) whether
// the binary actually contains the module; if not, the accent recolor stays
// the only effect and no require ever runs.
const ICON_SWITCH_SUPPORTED =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

function nativeModulePresent(): boolean {
  const g = globalThis as { expo?: { modules?: Record<string, unknown> } }
  return g.expo?.modules?.ExpoAlternateAppIcons != null
}

type IconsModule = typeof import('expo-alternate-app-icons')
let iconsCache: IconsModule | null | undefined
function getIconsModule(): IconsModule | null {
  if (iconsCache === undefined) {
    if (!ICON_SWITCH_SUPPORTED || !nativeModulePresent()) {
      iconsCache = null
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        iconsCache = require('expo-alternate-app-icons') as IconsModule
      } catch {
        iconsCache = null
      }
    }
  }
  return iconsCache
}

// Violet is the build's default icon → reset to it; the other four are
// activity-aliases registered by the config plugin (PascalCase names must
// match app.json exactly).
const ICON_ALIAS: Record<IconVariant, string | null> = {
  violet: null,
  blue: 'Blue',
  emerald: 'Emerald',
  rose: 'Rose',
  amber: 'Amber',
}

// Returns true when the launcher icon actually changed (so the caller can
// toast only where it's real). Android may briefly refresh the launcher
// shortcut while the activity-alias flips — expected.
export async function applyLauncherIcon(variant: IconVariant): Promise<boolean> {
  const icons = getIconsModule()
  if (!icons || !icons.supportsAlternateIcons) return false
  const alias = ICON_ALIAS[variant]
  try {
    if (alias === null) {
      await icons.resetAppIcon()
    } else {
      await icons.setAlternateAppIcon(alias)
    }
    return true
  } catch (e) {
    console.error('[app-icon] switch failed:', e)
    return false
  }
}
