import { Check } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

// Gmail-style coin-flip avatar (Step 26.7 polish): the leading circle
// Y-rotates 180°, crossfading at the 90° midpoint to a violet check circle.
// Deselect plays the same animation in reverse. withTiming retargets from
// the current rotation, so rapid taps never snap mid-flip.

const FLIP_MS = 250

type Props = {
  selected: boolean
  onPress: () => void
  onLongPress?: () => void
  /** The normal face (play circle / pen icon) */
  children: React.ReactNode
  accessibilityLabel?: string
}

export function FlipAvatar({ selected, onPress, onLongPress, children, accessibilityLabel }: Props) {
  const progress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: FLIP_MS })
  }, [selected, progress])

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${progress.value * 180}deg` }],
    // Hard crossfade exactly at the 90° midpoint
    opacity: interpolate(progress.value, [0, 0.5, 0.5001, 1], [1, 1, 0, 0]),
  }))

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${progress.value * 180 - 180}deg` }],
    opacity: interpolate(progress.value, [0, 0.4999, 0.5, 1], [0, 0, 1, 1]),
  }))

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[styles.face, frontStyle]}>{children}</Animated.View>
      <Animated.View style={[styles.face, styles.checkFace, backStyle]}>
        <Check size={18} color="#ffffff" strokeWidth={3} />
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 40,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  checkFace: {
    backgroundColor: '#8b5cf6',
  },
})
