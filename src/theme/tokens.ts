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

// Tailwind shade ramps per accent variant (Step 29). The picked variant
// drives every accent-* token, so the whole UI recolors with the icon choice.
// (Real launcher-icon swapping needs a dev build — Step 34+ via
// expo-alternate-app-icons; assets already live in assets/icons/.)
type AccentRamp = {
  s100: string
  s200: string
  s300: string
  s400: string
  s500: string
  s600: string
  s700: string
  s800: string
}

const ACCENT_RAMPS: Record<IconVariant, AccentRamp> = {
  violet: {
    s100: '#ede9fe', s200: '#ddd6fe', s300: '#c4b5fd', s400: '#a78bfa',
    s500: '#8b5cf6', s600: '#7c3aed', s700: '#6d28d9', s800: '#5b21b6',
  },
  blue: {
    s100: '#dbeafe', s200: '#bfdbfe', s300: '#93c5fd', s400: '#60a5fa',
    s500: '#3b82f6', s600: '#2563eb', s700: '#1d4ed8', s800: '#1e40af',
  },
  emerald: {
    s100: '#d1fae5', s200: '#a7f3d0', s300: '#6ee7b7', s400: '#34d399',
    s500: '#10b981', s600: '#059669', s700: '#047857', s800: '#065f46',
  },
  // "Rose" swatch #ec4899 is Tailwind's pink ramp
  rose: {
    s100: '#fce7f3', s200: '#fbcfe8', s300: '#f9a8d4', s400: '#f472b6',
    s500: '#ec4899', s600: '#db2777', s700: '#be185d', s800: '#9d174d',
  },
  amber: {
    s100: '#fef3c7', s200: '#fde68a', s300: '#fcd34d', s400: '#fbbf24',
    s500: '#f59e0b', s600: '#d97706', s700: '#b45309', s800: '#92400e',
  },
}

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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
  // Primary dialog buttons (white on dark, deep purple on light)
  primaryBtnBg: string
  primaryBtnText: string
  // Accent-tinted icons/text — pale violet in dark, deep violet in light,
  // so they stay readable on white cards
  accentIcon: string // 300 ↔ 600 (workhorse icon color)
  accentIconSoft: string // 200 ↔ 700
  accentTextStrong: string // 100 ↔ 800 (chip labels, active menu items)
  accentText: string // 200/80 ↔ 700/85 (tag chip text)
  accentTextFaint: string // 200/60 ↔ 700/60
  // Accent fills / borders for active + selected states (same in both themes)
  accentSolid: string // 500 (check avatars, spinners)
  accentTint: string // 500/15 (selected rows, tag chips, active tab pill)
  accentTintStrong: string // 500/30 (active filter chips)
  accentBorderSoft: string // 400/25
  accentBorder: string // 400/40
  accentBorderStrong: string // 400/50
  blueIcon: string // blue-300 ↔ blue-600 (text-note pen)
  blueBadgeText: string // blue-300/60 ↔ blue-600/75 (TEXT badge)
  // Status bar / system chrome
  statusBarStyle: 'light' | 'dark'
}

// Theme bases — everything except the accent-variant fields.
type AccentTokenKeys =
  | 'accentIcon'
  | 'accentIconSoft'
  | 'accentTextStrong'
  | 'accentText'
  | 'accentTextFaint'
  | 'accentSolid'
  | 'accentTint'
  | 'accentTintStrong'
  | 'accentBorderSoft'
  | 'accentBorder'
  | 'accentBorderStrong'
type BaseTokens = Omit<Tokens, AccentTokenKeys>

const darkBase: BaseTokens = {
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
  primaryBtnBg: '#ffffff',
  primaryBtnText: '#18181b',
  blueIcon: '#93c5fd',
  blueBadgeText: 'rgba(147,197,253,0.6)',
  statusBarStyle: 'light',
}

// Light = lavender cream, a real light design (PWA light theme CSS).
const lightBase: BaseTokens = {
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
  primaryBtnBg: '#1a0b2e',
  primaryBtnText: '#ffffff',
  blueIcon: '#2563eb',
  blueBadgeText: 'rgba(37,99,235,0.75)',
  statusBarStyle: 'dark',
}

// Accent-variant fields: pale shades on dark, deep shades on light (so they
// stay readable on white cards); fills/borders are translucent in both.
function accentTokens(theme: ThemeName, variant: IconVariant): Pick<Tokens, AccentTokenKeys> {
  const r = ACCENT_RAMPS[variant]
  const dark = theme === 'dark'
  return {
    accentIcon: dark ? r.s300 : r.s600,
    accentIconSoft: dark ? r.s200 : r.s700,
    accentTextStrong: dark ? r.s100 : r.s800,
    accentText: dark ? rgba(r.s200, 0.8) : rgba(r.s700, 0.85),
    accentTextFaint: dark ? rgba(r.s200, 0.6) : rgba(r.s700, 0.6),
    accentSolid: r.s500,
    accentTint: rgba(r.s500, 0.15),
    accentTintStrong: rgba(r.s500, 0.3),
    accentBorderSoft: rgba(r.s400, 0.25),
    accentBorder: rgba(r.s400, 0.4),
    accentBorderStrong: rgba(r.s400, 0.5),
  }
}

const tokenCache = new Map<string, Tokens>()

export function getTokens(theme: ThemeName, variant: IconVariant): Tokens {
  const key = `${theme}:${variant}`
  let tokens = tokenCache.get(key)
  if (!tokens) {
    tokens = {
      ...(theme === 'dark' ? darkBase : lightBase),
      ...accentTokens(theme, variant),
    }
    tokenCache.set(key, tokens)
  }
  return tokens
}
