import { LinearGradient } from 'expo-linear-gradient'
import { Folder as FolderIcon, Mic, Sparkles, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { haptic } from '@/lib/haptics'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// First-open tutorial (PWA onboarding, reworded for native — no "install to
// home screen"). Three slides over a dark backdrop; parent persists the
// `onboarded` flag when this calls onDone.

type Slide = {
  Icon: LucideIcon
  title: string
  lines: [string, string]
}

const SLIDES: Slide[] = [
  {
    Icon: Mic,
    title: 'Welcome to Spark',
    lines: [
      'Capture every thought the moment it crosses your mind.',
      'Tap the mic, speak naturally in your own language, and your idea is saved forever.',
    ],
  },
  {
    Icon: FolderIcon,
    title: 'Organize your way',
    lines: [
      'Sort thoughts into folders, sub-folders, and tags.',
      'Pin the important ones, search by name or date, and find anything in seconds.',
    ],
  },
  {
    Icon: Sparkles,
    title: 'Yours, offline & private',
    lines: [
      'Everything stays on your phone. No account, no server, no cloud.',
      'Works fully offline — your thoughts are always in your pocket.',
    ],
  },
]

type Props = {
  onDone: () => void
}

export function Onboarding({ onDone }: Props) {
  const { tokens } = useTheme()
  const [step, setStep] = useState(0)

  const slide = SLIDES[step]
  const last = step === SLIDES.length - 1

  const finish = () => {
    haptic('success')
    onDone()
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.root}>
      <View style={[styles.card, { backgroundColor: tokens.sheet, borderColor: tokens.sheetBorder }]}>
        {/* Slide content — re-keyed so each slide fades in */}
        <Animated.View key={step} entering={FadeIn.duration(250)} style={styles.slide}>
          <LinearGradient
            colors={['rgba(139,92,246,0.3)', 'rgba(217,70,239,0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconCircle, { borderColor: tokens.borderStrong }]}
          >
            <slide.Icon size={40} color={tokens.accentIconSoft} strokeWidth={1.8} />
          </LinearGradient>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>{slide.title}</Text>
          <Text style={[styles.line, { color: tokens.textMuted }]}>{slide.lines[0]}</Text>
          <Text style={[styles.line, { color: tokens.textMuted }]}>{slide.lines[1]}</Text>
        </Animated.View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                haptic('light')
                setStep(i)
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Slide ${i + 1}`}
            >
              <View
                style={[
                  styles.dot,
                  i === step
                    ? { width: 24, backgroundColor: tokens.textPrimary }
                    : { width: 6, backgroundColor: tokens.borderStrong },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {step > 0 && (
            <Pressable
              onPress={() => {
                haptic('light')
                setStep(step - 1)
              }}
              style={({ pressed }) => [
                styles.ghostBtn,
                pressed && { backgroundColor: tokens.surfaceSubtle },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={[styles.ghostText, { color: tokens.textSecondary }]}>Back</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              if (last) {
                finish()
              } else {
                haptic('light')
                setStep(step + 1)
              }
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: tokens.primaryBtnBg },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={last ? 'Get started' : 'Next'}
          >
            <Text style={[styles.primaryText, { color: tokens.primaryBtnText }]}>
              {last ? 'Get started' : 'Next'}
            </Text>
          </Pressable>
        </View>

        {/* Skip (hidden on the last slide — "Get started" is the exit there) */}
        {!last && (
          <Pressable
            onPress={finish}
            style={styles.skipBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Skip tutorial"
          >
            <Text style={[styles.skipText, { color: tokens.textFaint }]}>Skip</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9000, // below the biometric lock screen (9999)
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  slide: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  line: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: spacing.xl,
  },
  dot: {
    height: 6,
    borderRadius: radius.full,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ghostBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ghostText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipBtn: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  skipText: {
    fontSize: 12,
  },
})
