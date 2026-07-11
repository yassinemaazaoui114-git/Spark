import { useEffect } from 'react'
import { StyleSheet, View, type DimensionValue } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Skeleton shimmer (PWA .skeleton port) — pulsing translucent blocks shown
// during the first load.

export function Skeleton({
  width,
  height,
  round = radius.md,
  style,
}: {
  width: DimensionValue
  height: number
  round?: number
  style?: object
}) {
  const { tokens } = useTheme()
  const opacity = useSharedValue(0.45)

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 750 }), -1, true)
    return () => cancelAnimation(opacity)
  }, [opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: round, backgroundColor: tokens.surface },
        animatedStyle,
        style,
      ]}
    />
  )
}

// Home-screen skeleton layout (header, search, record panel, recent rows)
export function HomeSkeleton() {
  const { tokens } = useTheme()
  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Skeleton width={96} height={26} />
          <Skeleton width={130} height={12} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={36} height={36} round={18} />
      </View>

      {/* Search bar */}
      <Skeleton width="100%" height={44} round={16} style={{ marginBottom: spacing.md }} />

      {/* Record panel */}
      <View
        style={[
          styles.panel,
          { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
        ]}
      >
        <Skeleton width={140} height={18} />
        <Skeleton width={200} height={11} style={{ marginTop: 8 }} />
        <View style={styles.micArea}>
          <Skeleton width={64} height={64} round={32} />
          <Skeleton width={100} height={10} style={{ marginTop: 12 }} />
        </View>
      </View>

      {/* Recent rows */}
      <View
        style={[
          styles.panel,
          { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border, marginTop: spacing.lg },
        ]}
      >
        <Skeleton width={70} height={15} style={{ marginBottom: spacing.md }} />
        <Skeleton width="100%" height={64} round={16} />
        <Skeleton width="100%" height={64} round={16} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
  },
  micArea: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
})
