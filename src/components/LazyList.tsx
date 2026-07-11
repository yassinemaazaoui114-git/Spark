import { useEffect, useState } from 'react'
import { View } from 'react-native'

// Progressive list mounting (Step 26.5). Our record lists live inside
// ScrollViews, where FlatList cannot actually virtualize — so instead of one
// giant mount, rows appear in frame-sized batches: the first batch renders
// immediately, the rest stream in on subsequent frames. Combined with lazy
// player creation this keeps even 100+ record lists snappy.

type Props<T> = {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  keyExtractor: (item: T) => string
  batchSize?: number
  gap?: number
}

export function LazyList<T>({ items, renderItem, keyExtractor, batchSize = 12, gap = 8 }: Props<T>) {
  const [visibleCount, setVisibleCount] = useState(batchSize)

  // Stream in the next batch one frame at a time until everything is mounted.
  // (Never resets on refresh — shrinking lists just clamp.)
  useEffect(() => {
    if (visibleCount >= items.length) return
    const timer = setTimeout(
      () => setVisibleCount((c) => Math.min(items.length, c + batchSize)),
      16
    )
    return () => clearTimeout(timer)
  }, [visibleCount, items.length, batchSize])

  return (
    <View style={{ gap }}>
      {items.slice(0, visibleCount).map((item) => (
        <View key={keyExtractor(item)}>{renderItem(item)}</View>
      ))}
    </View>
  )
}
