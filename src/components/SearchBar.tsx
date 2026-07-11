import DateTimePicker from '@react-native-community/datetimepicker'
import { AlignLeft, Calendar, Plus, Search, Type, X } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { SaveSearchDialog } from '@/components/SaveSearchDialog'
import { useToast } from '@/context/ToastContext'
import type { Search as SearchState, SearchMode } from '@/hooks/useSearch'
import { haptic } from '@/lib/haptics'
import { formatDateKey } from '@/storage/format'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing } from '@/theme/tokens'
import type { Folder } from '@/types'

// Search bar with a mode toggle cycling Name → Content → Date.
// Name/Content: text input + dropdown (recent chips + saved searches) while
// focused-empty, and a "Save this search" link while a query is active.
// Date: native picker for the start date + optional end date row.

const MODE_META: Record<SearchMode, { label: string; Icon: typeof Type; placeholder: string }> = {
  name: { label: 'Name', Icon: Type, placeholder: 'Search by name...' },
  content: { label: 'Content', Icon: AlignLeft, placeholder: 'Search inside notes...' },
  date: { label: 'Date', Icon: Calendar, placeholder: 'Pick a start date' },
}

type Props = {
  search: SearchState
  /** For "in <folder>" hints on saved searches */
  folders?: Folder[]
  /** Called when a loaded saved search carries a folder scope */
  onLoadSavedFolder?: (folderId: string) => void
}

export function SearchBar({ search, folders = [], onLoadSavedFolder }: Props) {
  const { tokens } = useTheme()
  const { showToast } = useToast()
  const [focused, setFocused] = useState(false)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { mode } = search
  const meta = MODE_META[mode]
  const showDropdown =
    mode !== 'date' &&
    focused &&
    !search.query &&
    (search.recents.length > 0 || search.saved.length > 0)


  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {/* Input (name/content) or date pressable */}
        {mode === 'date' ? (
          <Pressable
            onPress={() => setShowStartPicker(true)}
            style={[
              styles.inputRow,
              styles.flex,
              { backgroundColor: tokens.surface, borderColor: tokens.borderStrong },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pick start date"
          >
            <Calendar size={16} color={tokens.textMuted} strokeWidth={2} />
            <Text
              style={[
                styles.dateText,
                { color: search.startDate ? tokens.textPrimary : tokens.textFaint },
              ]}
            >
              {search.startDate ? formatDateKey(search.startDate) : meta.placeholder}
            </Text>
            {search.startDate && (
              <Pressable
                onPress={() => {
                  search.setStartDate(null)
                  search.setEndDate(null)
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear date"
              >
                <X size={16} color={tokens.textMuted} strokeWidth={2} />
              </Pressable>
            )}
          </Pressable>
        ) : (
          <View
            style={[
              styles.inputRow,
              styles.flex,
              { backgroundColor: tokens.surface, borderColor: tokens.borderStrong },
            ]}
          >
            <Search size={16} color={tokens.textMuted} strokeWidth={2} />
            <TextInput
              value={search.query}
              onChangeText={search.setQuery}
              onFocus={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current)
                setFocused(true)
              }}
              onBlur={() => {
                // Delay so recent-chip taps land before the dropdown hides
                blurTimer.current = setTimeout(() => setFocused(false), 200)
              }}
              onSubmitEditing={() => search.submit()}
              placeholder={meta.placeholder}
              placeholderTextColor={tokens.textFaint}
              style={[styles.input, { color: tokens.textPrimary }]}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {search.query.length > 0 && (
              <Pressable
                onPress={() => search.setQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={16} color={tokens.textMuted} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        )}

        {/* Mode toggle */}
        <Pressable
          onPress={() => {
            haptic('light')
            search.cycleMode()
          }}
          style={({ pressed }) => [
            styles.modeBtn,
            {
              backgroundColor: pressed ? tokens.surfaceStrong : tokens.surface,
              borderColor: tokens.borderStrong,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Search mode: ${meta.label}. Tap to switch.`}
        >
          <meta.Icon size={14} color={tokens.textSecondary} strokeWidth={2} />
          <Text style={[styles.modeText, { color: tokens.textSecondary }]}>{meta.label}</Text>
        </Pressable>
      </View>

      {/* End-date row — only in date mode with a start date picked */}
      {mode === 'date' && search.startDate && (
        <View style={styles.endRow}>
          <Text style={[styles.endLabel, { color: tokens.textFaint }]}>to</Text>
          <Pressable
            onPress={() => setShowEndPicker(true)}
            style={[
              styles.endBtn,
              { backgroundColor: tokens.surface, borderColor: tokens.borderStrong },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pick end date"
          >
            <Text
              style={[
                styles.endText,
                { color: search.endDate ? tokens.textPrimary : tokens.textFaint },
              ]}
            >
              {search.endDate ? formatDateKey(search.endDate) : 'End date (optional)'}
            </Text>
          </Pressable>
          {search.endDate && (
            <Pressable onPress={() => search.setEndDate(null)} hitSlop={6}>
              <Text style={[styles.clearEnd, { color: tokens.textFaint }]}>Clear end</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* "Save this search" link — while a text query is active */}
      {mode !== 'date' && search.active && (
        <Pressable
          onPress={() => {
            haptic('light')
            setShowSaveDialog(true)
          }}
          hitSlop={6}
          style={styles.saveLink}
          accessibilityRole="button"
          accessibilityLabel="Save this search"
        >
          <Plus size={11} color="#c4b5fd" strokeWidth={2} />
          <Text style={styles.saveLinkText}>Save this search</Text>
        </Pressable>
      )}

      {/* Dropdown: recent chips + saved searches */}
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: tokens.sheet, borderColor: tokens.sheetBorder },
          ]}
        >
          {search.recents.length > 0 && (
            <>
              <View style={styles.dropdownHeader}>
                <Text style={[styles.dropdownLabel, { color: tokens.textFaint }]}>RECENT</Text>
                <Pressable onPress={search.clearRecents} hitSlop={6}>
                  <Text style={[styles.clearLink, { color: tokens.textFaint }]}>Clear</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {search.recents.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      haptic('light')
                      search.setQuery(s)
                      search.submit(s)
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: pressed ? tokens.surface : tokens.surfaceSubtle,
                        borderColor: tokens.border,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: tokens.textSecondary }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {search.saved.length > 0 && (
            <>
              <Text
                style={[
                  styles.dropdownLabel,
                  { color: tokens.textFaint },
                  search.recents.length > 0 && { marginTop: spacing.md },
                ]}
              >
                SAVED
              </Text>
              <View style={styles.savedList}>
                {search.saved.map((s) => {
                  const folderName = s.folderId
                    ? folders.find((f) => f.id === s.folderId)?.name
                    : null
                  return (
                    <View
                      key={s.id}
                      style={[
                        styles.savedRow,
                        { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.border },
                      ]}
                    >
                      <Pressable
                        onPress={() => {
                          haptic('light')
                          search.loadSaved(s)
                          if (s.folderId && onLoadSavedFolder) {
                            onLoadSavedFolder(s.folderId)
                          }
                        }}
                        style={styles.savedBody}
                        accessibilityRole="button"
                        accessibilityLabel={`Run saved search ${s.name}`}
                      >
                        <Search size={12} color="#c4b5fd" strokeWidth={2} />
                        <Text
                          style={[styles.savedName, { color: tokens.textPrimary }]}
                          numberOfLines={1}
                        >
                          {s.name}
                        </Text>
                        <Text
                          style={[styles.savedMeta, { color: tokens.textFaint }]}
                          numberOfLines={1}
                        >
                          {s.query}
                          {s.mode === 'content' ? ' · content' : ''}
                          {folderName ? ` · ${folderName}` : ''}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => search.deleteSaved(s.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete saved search ${s.name}`}
                      >
                        <X size={12} color={tokens.textFaint} strokeWidth={2} />
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            </>
          )}
        </View>
      )}

      <SaveSearchDialog
        visible={showSaveDialog}
        contextLine={`Save the current ${mode} search "${search.query.trim()}" so you can run it again with one tap.`}
        onClose={() => setShowSaveDialog(false)}
        onSave={async (name) => {
          await search.saveCurrent(name)
          setShowSaveDialog(false)
          haptic('success')
          showToast('Search saved')
        }}
      />

      {/* Native date pickers (v9 API: onValueChange on pick, onDismiss on cancel) */}
      {showStartPicker && (
        <DateTimePicker
          value={search.startDate ?? new Date()}
          mode="date"
          onValueChange={(_event, date) => {
            setShowStartPicker(false)
            if (date) search.setStartDate(date)
          }}
          onDismiss={() => setShowStartPicker(false)}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={search.endDate ?? search.startDate ?? new Date()}
          mode="date"
          onValueChange={(_event, date) => {
            setShowEndPicker(false)
            if (date) search.setEndDate(date)
          }}
          onDismiss={() => setShowEndPicker(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 11,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 13,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 12,
  },
  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  endLabel: {
    fontSize: 12,
  },
  endBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  endText: {
    fontSize: 13,
  },
  clearEnd: {
    fontSize: 11,
  },
  dropdown: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dropdownLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  clearLink: {
    fontSize: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  saveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 2,
  },
  saveLinkText: {
    fontSize: 12,
    color: '#c4b5fd',
  },
  savedList: {
    gap: 4,
    marginTop: spacing.sm,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  savedBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  savedName: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  savedMeta: {
    fontSize: 10,
    flexShrink: 1,
  },
})
