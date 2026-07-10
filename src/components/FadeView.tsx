import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

// Cross-fade wrapper — the PWA's `.tab-content { animation: crossFade 1s }`.
// Fades content in every time the screen gains focus. Re-mount (key change)
// replays the fade too, which screens use for their "active tab re-tap" reset.

type Props = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  duration?: number
}

export function FadeView({ children, style, duration = 1000 }: Props) {
  const opacity = useSharedValue(0)

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0
      opacity.value = withTiming(1, { duration })
    }, [opacity, duration])
  )

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View style={[{ flex: 1 }, style, animatedStyle]}>
      {children}
    </Animated.View>
  )
}
