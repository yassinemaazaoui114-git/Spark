import NetInfo from '@react-native-community/netinfo'
import { X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'

// Online dot / offline banner (PWA port). Purely informational — Spark is
// local-first, nothing needs the network.

export function OnlineIndicator() {
  const { tokens } = useTheme()
  const [isOnline, setIsOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false
      setIsOnline(online)
      if (!online) {
        // Re-show the banner on every new offline event
        setDismissed(false)
      }
    })
    return unsubscribe
  }, [])

  if (!isOnline && !dismissed) {
    return (
      <View style={styles.banner}>
        <View style={styles.amberDot} />
        <Text style={styles.bannerText}>
          You&apos;re offline — everything still works. Your recordings are safe on this
          device.
        </Text>
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <X size={14} color="rgba(253,230,138,0.6)" strokeWidth={2} />
        </Pressable>
      </View>
    )
  }

  if (isOnline) {
    return (
      <View style={styles.dotRow}>
        <View style={styles.greenDot} />
        <Text style={[styles.dotText, { color: tokens.textFaint }]}>Online</Text>
      </View>
    )
  }

  // Offline + dismissed: show nothing
  return null
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    marginBottom: spacing.md,
  },
  amberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
  },
  bannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(254,243,199,0.9)',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(52,211,153,0.6)',
  },
  dotText: {
    fontSize: 10,
  },
})
