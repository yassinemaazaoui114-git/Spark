import { StyleSheet, Text, View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'

import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/tokens'

// Butterfly empty-state illustration (PWA EmptyState port) — glowing
// butterfly silhouette + title + message.

const WING_PATH =
  'M0 0 Q-30 -45 -55 -25 Q-70 0 -45 20 Q-25 25 0 0 Z M0 0 Q30 -45 55 -25 Q70 0 45 20 Q25 25 0 0 Z M0 0 Q-25 30 -40 50 Q-55 60 -50 45 Q-35 30 0 0 Z M0 0 Q25 30 40 50 Q55 60 50 45 Q35 30 0 0 Z'

type Props = {
  title: string
  message: string
}

export function EmptyState({ title, message }: Props) {
  const { tokens } = useTheme()

  return (
    <View style={styles.wrap}>
      <Svg width={96} height={96} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="emptyGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="emptyWing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#8b5cf6" />
            <Stop offset="50%" stopColor="#3b82f6" />
            <Stop offset="100%" stopColor="#d946ef" />
          </LinearGradient>
        </Defs>
        {/* Soft glow */}
        <Circle cx={50} cy={50} r={40} fill="url(#emptyGlow)" opacity={0.3} />
        {/* Butterfly silhouette */}
        <G x={50} y={50} scale={0.5}>
          <Path d={WING_PATH} fill="url(#emptyWing)" opacity={0.5} />
          <Line
            x1={0}
            y1={-30}
            x2={0}
            y2={40}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <Text style={[styles.title, { color: tokens.textSecondary }]}>{title}</Text>
      <Text style={[styles.message, { color: tokens.textMuted }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 240,
  },
})
