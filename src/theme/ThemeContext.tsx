import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { PREF_KEYS, getPref, setPref } from '@/storage/prefs'

import { ICON_VARIANTS, getTokens, type IconVariant, type ThemeName, type Tokens } from './tokens'

type ThemeContextValue = {
  theme: ThemeName
  accent: IconVariant
  tokens: Tokens
  setTheme: (t: ThemeName) => void
  setAccent: (a: IconVariant) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  accent: 'violet',
  tokens: getTokens('dark', 'violet'),
  setTheme: () => {},
  setAccent: () => {},
})

function isVariant(v: string | null): v is IconVariant {
  return ICON_VARIANTS.some((x) => x.id === v)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // null = prefs still loading; we hold the first frame so a light-theme user
  // never sees a dark flash (AsyncStorage resolves in a few ms).
  const [theme, setThemeState] = useState<ThemeName | null>(null)
  const [accent, setAccentState] = useState<IconVariant>('violet')

  useEffect(() => {
    Promise.all([getPref(PREF_KEYS.theme), getPref(PREF_KEYS.iconVariant)]).then(
      ([savedTheme, savedAccent]) => {
        if (isVariant(savedAccent)) setAccentState(savedAccent)
        setThemeState(savedTheme === 'light' ? 'light' : 'dark')
      }
    )
  }, [])

  const setTheme = (t: ThemeName) => {
    setThemeState(t)
    setPref(PREF_KEYS.theme, t)
  }

  const setAccent = (a: IconVariant) => {
    setAccentState(a)
    setPref(PREF_KEYS.iconVariant, a)
  }

  if (theme === null) return null

  return (
    <ThemeContext.Provider
      value={{ theme, accent, tokens: getTokens(theme, accent), setTheme, setAccent }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
