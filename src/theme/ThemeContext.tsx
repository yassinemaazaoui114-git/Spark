import { createContext, useContext, useState, type ReactNode } from 'react'

import { palettes, type ThemeName, type Tokens } from './tokens'

type ThemeContextValue = {
  theme: ThemeName
  tokens: Tokens
  setTheme: (t: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  tokens: palettes.dark,
  setTheme: () => {},
})

// Dark is the default. Persistence + settings toggle arrive in Step 27.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('dark')
  return (
    <ThemeContext.Provider value={{ theme, tokens: palettes[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
