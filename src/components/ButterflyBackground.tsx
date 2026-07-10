import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg'

import { useTheme } from '@/theme/ThemeContext'

// Full-screen animated-feel background: diagonal purple gradient, four soft
// bokeh orbs, two crystal shapes, two butterfly silhouettes.
// SVG paths and gradient stops are ported 1:1 from the PWA's ButterflyBackground.

const BUTTERFLY_PATH =
  'M50 50 Q30 20 15 35 Q5 50 25 60 Q40 65 50 50 Z M50 50 Q70 20 85 35 Q95 50 75 60 Q60 65 50 50 Z M50 50 Q35 75 25 85 Q15 90 20 80 Q30 70 50 50 Z M50 50 Q65 75 75 85 Q85 90 80 80 Q70 70 50 50 Z'

const CRYSTAL_POINTS = '50,5 75,35 65,90 35,90 25,35'

// One soft orb — an SVG radial gradient fading to transparent stands in for
// the CSS blur-3xl circles (RN views can't be blurred).
function Orb({
  size,
  color,
  style,
}: {
  size: number
  color: string
  style: object
}) {
  const id = `orb-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <Svg width={size} height={size} style={[styles.abs, style]} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="60%" stopColor={color} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  )
}

function Crystal({
  size,
  opacity,
  stops,
  style,
  idSuffix,
}: {
  size: number
  opacity: number
  stops: [string, number, string, number] // [color1, op1, color2, op2]
  style: object
  idSuffix: string
}) {
  const id = `crystal-${idSuffix}`
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={[styles.abs, style]} opacity={opacity} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={stops[0]} stopOpacity={stops[1]} />
          <Stop offset="100%" stopColor={stops[2]} stopOpacity={stops[3]} />
        </SvgLinearGradient>
      </Defs>
      <Polygon points={CRYSTAL_POINTS} fill={`url(#${id})`} />
    </Svg>
  )
}

function Butterfly({
  size,
  opacity,
  stops,
  style,
  idSuffix,
}: {
  size: number
  opacity: number
  stops: Array<[string, string, number]> // [offset, color, opacity]
  style: object
  idSuffix: string
}) {
  const id = `butterfly-${idSuffix}`
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={[styles.abs, style]} opacity={opacity} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {stops.map(([offset, color, op]) => (
            <Stop key={offset} offset={offset} stopColor={color} stopOpacity={op} />
          ))}
        </SvgLinearGradient>
      </Defs>
      <Path d={BUTTERFLY_PATH} fill={`url(#${id})`} />
    </Svg>
  )
}

export function ButterflyBackground() {
  const { theme, tokens } = useTheme()
  const { height } = useWindowDimensions()
  const light = theme === 'light'

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base diagonal gradient */}
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Bokeh orbs — positions mirror the PWA (-top-32 -left-20 etc.) */}
      <Orb size={384} color={tokens.orbs[0]} style={{ top: -128, left: -80 }} />
      <Orb size={384} color={tokens.orbs[1]} style={{ top: height / 3, right: -128 }} />
      <Orb size={384} color={tokens.orbs[2]} style={{ bottom: -128, left: '25%' }} />
      <Orb size={288} color={tokens.orbs[3]} style={{ top: height / 2, left: '50%' }} />

      {/* Crystals */}
      <Crystal
        size={64}
        opacity={light ? 0.3 : 0.4}
        stops={light ? ['#8b5cf6', 0.6, '#3b82f6', 0.3] : ['#a78bfa', 0.8, '#3b82f6', 0.4]}
        style={{ top: 40, right: 32 }}
        idSuffix="a"
      />
      <Crystal
        size={48}
        opacity={light ? 0.25 : 0.3}
        stops={light ? ['#60a5fa', 0.5, '#c084fc', 0.3] : ['#60a5fa', 0.7, '#c084fc', 0.4]}
        style={{ bottom: 80, left: 24 }}
        idSuffix="b"
      />

      {/* Butterfly silhouettes */}
      <Butterfly
        size={40}
        opacity={light ? 0.4 : 0.5}
        stops={
          light
            ? [
                ['0%', '#8b5cf6', 0.8],
                ['50%', '#3b82f6', 0.6],
                ['100%', '#d946ef', 0.5],
              ]
            : [
                ['0%', '#8b5cf6', 0.9],
                ['50%', '#3b82f6', 0.7],
                ['100%', '#d946ef', 0.6],
              ]
        }
        style={{ top: '25%', left: 16 }}
        idSuffix="a"
      />
      <Butterfly
        size={56}
        opacity={light ? 0.3 : 0.4}
        stops={
          light
            ? [
                ['0%', '#60a5fa', 0.7],
                ['100%', '#a855f7', 0.4],
              ]
            : [
                ['0%', '#60a5fa', 0.8],
                ['100%', '#a855f7', 0.5],
              ]
        }
        style={{ top: '66%', right: 48 }}
        idSuffix="b"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
})
