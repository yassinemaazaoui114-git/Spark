// Spark design tokens — ported from the PWA's Tailwind styles.
// Every component reads colors from here (via ThemeContext), never hardcodes.

export type ThemeName = 'dark' | 'light'

// ---- Brand accents (same in both themes) ----
export const accent = {
  violet: '#8b5cf6',
  fuchsia: '#d946ef',
  blue: '#3b82f6',
  amber: '#f59e0b',
  emerald: '#10b981',
  red: '#ef4444',
} as const

// 10 folder color presets (PWA FOLDER_COLORS)
export const FOLDER_COLORS = [
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // rose
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#a855f7', // purple
  '#64748b', // slate
] as const

// 5 app icon accent variants (PWA ICON_VARIANTS)
export const ICON_VARIANTS = [
  { id: 'violet', name: 'Violet', swatch: '#8b5cf6' },
  { id: 'blue', name: 'Ocean', swatch: '#3b82f6' },
  { id: 'emerald', name: 'Forest', swatch: '#10b981' },
  { id: 'rose', name: 'Rose', swatch: '#ec4899' },
  { id: 'amber', name: 'Amber', swatch: '#f59e0b' },
] as const

export type IconVariant = (typeof ICON_VARIANTS)[number]['id']

// ---- Radii / spacing (PWA rounded-xl/2xl/3xl, p-3/4/5/6) ----
export const radius = {
  sm: 8,
  md: 12, // rounded-xl
  lg: 16, // rounded-2xl
  xl: 24, // rounded-3xl
  full: 999,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

// ---- Per-theme semantic tokens ----
export type Tokens = {
  // Background gradient stops (diagonal, top-left → bottom-right)
  bgGradient: [string, string, string]
  // Bokeh orb colors (already include their opacity)
  orbs: [string, string, string, string]
  // Text
  textPrimary: string
  textSecondary: string // ~80%
  textMuted: string // ~60%
  textFaint: string // ~40%
  // Glass surfaces
  surface: string // card fill        (bg-white/10)
  surfaceSubtle: string // chip fill  (bg-white/5)
  surfaceStrong: string // active fill (bg-white/15-20)
  border: string // border-white/10
  borderStrong: string // border-white/20
  // Dialogs / sheets (near-opaque)
  sheet: string
  sheetBorder: string
  // Status bar / system chrome
  statusBarStyle: 'light' | 'dark'
}

export const darkTokens: Tokens = {
  bgGradient: ['#1a0b2e', '#2d1b69', '#0f0a1f'],
  orbs: [
    'rgba(147, 51, 234, 0.30)', // purple-600/30
    'rgba(37, 99, 235, 0.30)', // blue-600/30
    'rgba(192, 38, 211, 0.25)', // fuchsia-600/25
    'rgba(139, 92, 246, 0.20)', // violet-500/20
  ],
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.8)',
  textMuted: 'rgba(255,255,255,0.6)',
  textFaint: 'rgba(255,255,255,0.4)',
  surface: 'rgba(255,255,255,0.10)',
  surfaceSubtle: 'rgba(255,255,255,0.05)',
  surfaceStrong: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.20)',
  sheet: 'rgba(24,24,27,0.97)',
  sheetBorder: 'rgba(255,255,255,0.20)',
  statusBarStyle: 'light',
}

// Light = lavender cream, a real light design (PWA light theme CSS).
export const lightTokens: Tokens = {
  bgGradient: ['#f5f0ff', '#ede4ff', '#faf5ff'],
  orbs: [
    'rgba(196, 181, 253, 0.30)', // violet-300/30
    'rgba(147, 197, 253, 0.25)', // blue-300/25
    'rgba(240, 171, 252, 0.20)', // fuchsia-300/20
    'rgba(233, 213, 255, 0.30)', // purple-200/30
  ],
  textPrimary: '#1a0b2e',
  textSecondary: 'rgba(26,11,46,0.85)',
  textMuted: 'rgba(26,11,46,0.65)',
  textFaint: 'rgba(26,11,46,0.45)',
  surface: '#ffffff',
  surfaceSubtle: '#f3eeff',
  surfaceStrong: '#ffffff',
  border: 'rgba(139,92,246,0.15)',
  borderStrong: 'rgba(139,92,246,0.25)',
  sheet: '#ffffff',
  sheetBorder: 'rgba(139,92,246,0.15)',
  statusBarStyle: 'dark',
}

export const palettes: Record<ThemeName, Tokens> = {
  dark: darkTokens,
  light: lightTokens,
}
