import { Folder, Mic, Settings } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { haptic } from '@/lib/haptics'
import { useSelection } from '@/lib/selection'
import { emitTabReset, type TabName } from '@/lib/tab-events'
import { useTheme } from '@/theme/ThemeContext'
import { radius } from '@/theme/tokens'

// Floating glassmorphic tab bar — the PWA's bottom nav:
// zinc-900/80 rounded-2xl bar, violet pill on the active tab, 9px labels.

// Screens add this much bottom padding so content clears the floating bar.
export const TAB_BAR_SPACE = 96

const TAB_META: Record<TabName, { label: string; Icon: typeof Mic }> = {
  index: { label: 'Record', Icon: Mic },
  folders: { label: 'Folders', Icon: Folder },
  settings: { label: 'Settings', Icon: Settings },
}

// Structural subset of react-navigation's BottomTabBarProps (avoids a direct
// dependency on @react-navigation/bottom-tabs types).
type Props = {
  state: { index: number; routes: { key: string; name: string }[] }
  navigation: {
    navigate: (name: string) => void
    emit: (e: { type: string; target?: string; canPreventDefault?: boolean }) => {
      defaultPrevented: boolean
    }
  }
}

export function TabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets()
  const { theme, tokens } = useTheme()

  // Gmail-style: the tab bar steps aside while multi-select is active so the
  // SelectionToolbar takes its place (and its taps).
  const sel = useSelection()
  if (sel.isActive()) return null

  return (
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor:
              theme === 'light' ? '#ffffff' : 'rgba(24,24,27,0.85)',
            borderColor: tokens.border,
          },
        ]}
      >
        {state.routes.map((route, i) => {
          const meta = TAB_META[route.name as TabName]
          if (!meta) return null
          const focused = state.index === i
          const { Icon } = meta

          const onPress = () => {
            haptic('light')
            if (focused) {
              // Re-tap on active tab → reset it to default state
              emitTabReset(route.name as TabName)
              return
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          const activeColor = '#ddd6fe' // violet-200
          const inactiveColor =
            theme === 'light' ? 'rgba(26,11,46,0.4)' : 'rgba(255,255,255,0.4)'

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[
                styles.tab,
                focused && { backgroundColor: 'rgba(167,139,250,0.15)' },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
            >
              <Icon
                size={20}
                color={focused ? activeColor : inactiveColor}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.label,
                  { color: focused ? activeColor : inactiveColor },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    // Floating shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  tab: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
  },
})
