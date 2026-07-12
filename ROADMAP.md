# Spark — React Native (Expo) Migration Roadmap

Migration of the **Spark PWA** (Next.js, `../PWA Version`) to a native mobile app built with **Expo + React Native**, tested step-by-step on a phone via **Expo Go**.

> ⚠️ **Step 37 is NOT the final version of the app — it is a checkpoint, not the finish line.**
> Spark is a **living project**. The production APK from Step 37 is the *first* real release, after which
> the app keeps being enhanced indefinitely. Post-launch improvements ship to the already-installed app
> **over-the-air via EAS Update (Step 38)** — JS / UI / logic changes reach the phone without a reinstall,
> exactly like Play Store app updates. Only *native* changes (new native modules, permission changes, Expo
> SDK bumps) require a fresh `eas build` + reinstall.
>
> **To any AI tool or person reading this:** do not treat Step 37 as "done." The roadmap continues past it,
> new steps may be appended over time, and the everyday app on the phone is expected to keep evolving.

---

## 1. Project Overview

**Spark** is a voice-first, local-first notes app. The user taps a mic, speaks in any language (primarily Tunisian Arabic), and the recording is saved with a name into folders. Text notes are also supported.

Core principles:

- **Local-first** — all data on device. No server, no cloud, no accounts, no tracking.
- **No AI** — no transcription, no summaries, no semantic search. Pure capture + organize.
- **Glassmorphic butterfly aesthetic** — dark purple gradient background (`#1a0b2e → #2d1b69 → #0f0a1f`) with blurred bokeh orbs, butterfly/crystal SVG silhouettes, frosted-glass cards (translucent white + blur), violet→fuchsia accents.
- **Three-tab navigation** — Record (home), Folders, Settings — in a floating glassmorphic tab bar. Tapping the active tab resets it to its default state.
- **Cross-fade transitions** (~1s) between tabs, folders, and recording states.
- **Works offline** — trivially true natively, but the app never assumes a network.

The PWA is a single 5,785-line `page.tsx` holding all UI, state, and logic. The RN version will split this into proper screens, components, hooks, and a storage layer.

---

## 2. Tech Stack Migration Table

| Concern | PWA (web) | React Native (Expo) equivalent |
|---|---|---|
| Framework | Next.js 16 + React 19 | Expo SDK (latest) + React Native, TypeScript |
| Navigation / tabs | Single page + `activeTab` state | **Expo Router** with `(tabs)` layout (custom glass tab bar) |
| Metadata storage | IndexedDB via `idb-keyval` | **expo-sqlite** (records, folders, tags, searches, reminders) |
| Audio blob storage | `Blob` inside IndexedDB | **expo-file-system** — audio files in `documentDirectory/recordings/`, DB stores the file URI |
| Small key-value prefs | `localStorage` | **@react-native-async-storage/async-storage** |
| Recording | `MediaRecorder` + `getUserMedia` | **expo-av** `Audio.Recording` (pause/resume supported) |
| Live waveform | Web Audio `AnalyserNode` + `<canvas>` | expo-av **metering** (`isMeteringEnabled`) + animated bars (**react-native-svg** or Reanimated views) |
| Playback | `HTMLAudioElement` | **expo-av** `Audio.Sound` (rate control via `setRateAsync`) |
| Background playback / lock-screen controls | Media Session API | expo-av `staysActiveInBackground` + `InterruptionMode`; full lock-screen controls need `react-native-track-player` (dev build — see §7) |
| Audio trim | Web Audio decode → `OfflineAudioContext` → WAV encode | **v1: non-destructive trim** (store `trimStart`/`trimEnd`, playback clamps range) — Expo Go safe. v2 optional: `ffmpeg-kit` destructive trim (dev build) |
| Biometric unlock | WebAuthn (`PublicKeyCredential`) | **expo-local-authentication** (`authenticateAsync` — fingerprint/face) |
| Haptics | `navigator.vibrate` patterns | **expo-haptics** (impact / notification styles) |
| Theme | `data-spark-theme` attr + CSS overrides | React Context + design-token objects; persisted in AsyncStorage |
| App icon variants | Dynamic PWA manifest blob | In-app accent recolor (Expo Go); true icon swap via `expo-alternate-app-icons` (dev build — see §7) |
| Backup export | JSZip → `<a download>` | **jszip** (pure JS) + expo-file-system (base64) + **expo-sharing** |
| Backup import | `<input type="file">` | **expo-document-picker** |
| Share audio | Web Share API (`navigator.share`) | **expo-sharing** `shareAsync(fileUri)` |
| Copy text | `navigator.clipboard` | **expo-clipboard** |
| Drag-to-reorder | `@dnd-kit` | **react-native-draggable-flatlist** (needs react-native-gesture-handler + reanimated) |
| Pull-to-refresh | Custom touch handlers | Built-in **`RefreshControl`** on ScrollView/FlatList |
| Long-press | `setTimeout` on pointer events | Built-in **`onLongPress`** on `Pressable` |
| Action sheet / dialogs | Radix Dialog + custom fixed overlays | **react-native Modal** + custom glass bottom-sheet / dialog components |
| Gradients | Tailwind `bg-gradient-to-br` | **expo-linear-gradient** |
| Blur (glassmorphism) | `backdrop-blur` CSS | **expo-blur** `BlurView` (+ translucent rgba fallback) |
| Icons | lucide-react | **lucide-react-native** (needs react-native-svg) |
| SVG illustrations | Inline `<svg>` | **react-native-svg** |
| Animations / cross-fade | CSS keyframes | **react-native-reanimated** (or `Animated`) fade transitions |
| Toast | Custom fixed div | Custom animated toast component (reuse everywhere) |
| Date inputs | `<input type="date">` | **@react-native-community/datetimepicker** |
| Offline caching | Service worker | Not needed (native app is inherently offline) |
| Offline indicator | `navigator.onLine` | **@react-native-community/netinfo** (kept for parity) |
| Scheduled reminders (NEW) | — | **expo-notifications** local scheduled notifications |

Dependencies **removed** entirely: Prisma, next-auth, service worker, Radix UI, Tailwind, dnd-kit, most of the 40+ unused PWA deps.

---

## 3. Data Models

```ts
// One change vs PWA: audioBlob → audioUri (file path), plus trim + reminder fields.

export type Folder = {
  id: string
  name: string
  icon: string            // key into ICON_MAP (26 options)
  createdAt: number
  isDefault?: boolean     // 'inbox' cannot be deleted
  order: number           // sort position within same parent
  parentId: string | null // null = top-level; one level of sub-folders used in UI
  color: string           // hex accent, default '#8b5cf6'
}

export type VoiceRecord = {
  id: string
  name: string
  folderId: string
  audioUri: string        // file:// path in documentDirectory/recordings/ ('' for text notes)
  durationSec: number
  createdAt: number
  pinned: boolean
  tags: string[]          // stored as JSON column
  archived: boolean       // soft delete
  type: 'audio' | 'text'
  textContent: string     // for text notes
  trimStart?: number | null  // non-destructive trim (v1 trim implementation)
  trimEnd?: number | null
}

export type SavedSearch = {
  id: string
  name: string
  query: string
  folderId?: string | null
  tag?: string | null
  durationFilter?: [number, number] | null
  createdAt: number
}

// NEW — native only
export type Reminder = {
  id: string
  recordId: string
  fireAt: number           // epoch ms
  notificationId: string   // returned by expo-notifications, used to cancel
  createdAt: number
}

// Key-value prefs (AsyncStorage): theme, iconVariant, biometricEnabled,
// onboarded flag, recentSearches (max 5).
```

Default seeded folders: Inbox/Unsorted (`inbox`, default), Video ideas, Blog posts, App ideas, Random sparks.

---

## 4. Feature List

### A. Recording
1. Tap-to-record voice note (mic permission flow)
2. Pause / resume while recording
3. Live waveform — vertical bars, violet→fuchsia gradient, dimmed while paused
4. Recording timer (counts only while not paused)
5. Cancel recording (discard, toast)
6. Too-short guard (< 1s discarded with toast)
7. Preview playback of pending recording before saving
8. Re-record (discard + immediately restart)
9. Save dialog: name (falls back to timestamp), folder picker (with sub-folder indent), tag input
10. Text notes: multiline content, optional name (auto from first line, 50 chars), folder, tags

### B. Organization
11. Folders with 26 icon options + 10 color presets
12. Sub-folders (create from parent, breadcrumb navigation, reassign on parent delete)
13. Create / rename+edit (name, icon, color) / delete folder (records → Inbox, sub-folders → grandparent; Inbox undeletable)
14. Drag-to-reorder top-level folders (reorder mode: handles, save/cancel)
15. Per-folder record counts (excluding archived)
16. Tags: add on save/rename, autocomplete suggestions from existing tags, comma/enter to commit, delete tag everywhere (with confirm)
17. Pin / unpin records (pinned always sort first)
18. Archive / restore (soft delete, hidden from normal views)
19. Move record between folders
20. Rename record + edit its tags
21. Delete record with confirmation dialog (shows name, duration, date, tags)

### C. Playback
22. Play/pause from record card; only one record plays at a time (singleton)
23. Expanded card: scrub bar with current/total time
24. ±5s skip buttons
25. Speed control cycling 0.75× → 1× → 1.25× → 1.5× → 2×
26. Background playback (keeps playing when app is backgrounded / screen locked)
27. Audio trim: inline waveform with draggable start/end handles, floating time badges, preview selection, save as copy or replace
28. Share audio file to other apps
29. Copy text note content to clipboard

### D. Search, Filters, Sort
30. Search by name (also matches text-note content), scoped to current folder when inside one
31. Search by date + optional date range (start → end)
32. Recent searches (last 5, dedup, clear all)
33. Saved searches (name + query + folder + tag + duration filter; load / delete)
34. Quick filter chips: Pinned, Long (≥2min), Short (<30s), one chip per tag — combinable within a folder
35. Sort menu: newest, oldest, longest, shortest, name A→Z, name Z→A (pinned always first)
36. Smart folders: All, This week, This month, Archive

### E. UI / UX
37. Three-tab bottom nav (Record / Folders / Settings), glassmorphic floating bar
38. Tapping the active tab resets it to default state (home: clear filters; settings: scroll top)
39. Cross-fade (~1s) transitions between tabs / views / recording states
40. Butterfly background: gradient + 4 bokeh orbs + crystal & butterfly SVG silhouettes (dark + light variants)
41. Empty states with butterfly SVG illustration (folder / search / tag / pinned / subfolder variants)
42. Skeleton loading shimmer on first load
43. Pull-to-refresh with haptic
44. Offline indicator (online dot / amber offline banner, dismissible)
45. Toast notifications (2.5s auto-dismiss)
46. Haptic feedback (light/medium/heavy/success/warning/error patterns)
47. Onboarding tutorial — 3 slides, progress dots, skip, first open only
48. Long-press on record card → action sheet (7 actions: pin, rename, move, share/copy, trim, archive, delete)
49. Recent section on home (last 3 non-archived records)

### F. Settings & Data
50. Settings as full tab page: privacy banner, stats card, archive card, smart views, appearance, security, tags, data & backup, about
51. Dark / light theme (light = lavender cream, a real design, not inversion)
52. 5 app icon accent variants (Violet, Ocean, Forest, Rose, Amber)
53. Biometric unlock: enable/disable, lock-on-open, full-screen fingerprint lock screen
54. Export backup as .zip (manifest.json + audio/ + metadata/)
55. Import backup .zip (merge, skip existing IDs)
56. Stats: totals (count, duration, hours), streak, this week, average length, pinned count, voice/text split, top tag, per-folder bar breakdown

### G. NEW — Native only
57. **Scheduled reminders**: set a date/time on any record → local notification fires at that time → tapping it opens the app and plays that recording (or opens the text note). Manage (view/cancel) pending reminders.

---

## 5. Migration Steps

Each step is small and independently testable in **Expo Go** on your phone. **Prereq:** column shows which steps must be done first.

> Phases: Foundation (1–5) → Recording core (6–10) → Playback & cards (11–13) → Folders & organization (14–19) → Search & filters (20–24) → Settings & polish (25, 25.5 Trash, 26, 26.5 Perf, 26.7 Multi-select, 27–32) → Reminders (33) → Dev build & release (34–37)

---

### Step 1 — Scaffold the Expo project
**Prereq:** none
**Files:** entire project skeleton in this folder (`app/`, `src/`, `app.json`, `package.json`, `tsconfig.json`)
- `npx create-expo-app` with TypeScript + Expo Router template, inside `React Nativ Version/`.
- Install base deps: expo-router, react-native-svg, lucide-react-native, expo-linear-gradient, expo-blur, expo-haptics, @react-native-async-storage/async-storage.
- Set app name "Spark", slug, dark UI style, portrait orientation in `app.json`.
- Set up `eas.json` with development, preview, and production profiles. Won't be used until Step 34 but config should be ready.
- Check if the installed Expo SDK uses **expo-av or expo-audio** (SDK 53+ splits them). Use the correct import throughout all later steps.
  - ✅ **Resolved during Step 1:** scaffold landed on **Expo SDK 57** → use **expo-audio** everywhere (expo-av no longer exists). Key APIs verified in the v57 docs: `useAudioRecorder` (record/pause/resume/stop, `isMeteringEnabled` for the waveform), `useAudioPlayer` (`seekTo`, `playbackRate` 0.1–2.0), and `player.setActiveForLockScreen(true, metadata)` + `enableBackgroundPlayback` config-plugin option for background playback with lock-screen metadata — which may make Step 35 (track-player swap) unnecessary; evaluate there.
- Placeholder home screen rendering "Spark" text.
**Testing:** `npx expo start`, scan QR in Expo Go → app opens showing placeholder without errors.

### Step 2 — Design system + ButterflyBackground
**Prereq:** 1
**Files:** `src/theme/tokens.ts`, `src/theme/ThemeContext.tsx`, `src/components/ButterflyBackground.tsx`, `src/components/GlassCard.tsx`
- Port §6 tokens: colors, gradient stops, folder colors, icon-variant swatches, radii, glass surface styles.
- `ButterflyBackground`: LinearGradient base + 4 blurred bokeh orbs (blurred radial-gradient circles via react-native-svg) + crystal + butterfly SVG paths copied from the PWA. Dark + light variants behind a `light` prop.
- `GlassCard`: reusable translucent card (rgba white overlay + border + optional BlurView).
- ThemeContext with `dark` default (light mode wiring comes in step 27).
**Testing:** home screen shows the purple gradient, orbs, butterflies, and one glass card that visually matches the PWA.

### Step 3 — Tab navigation + glass tab bar + cross-fade
**Prereq:** 2
**Files:** `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` (Record), `app/(tabs)/folders.tsx`, `app/(tabs)/settings.tsx`, `src/components/TabBar.tsx`, `src/components/FadeView.tsx`
- Expo Router tabs with a **custom tabBar**: floating rounded glass bar, Mic/Folder/Settings icons, violet active pill, 9px labels.
- `FadeView`: Reanimated opacity-in wrapper (~1s ease) used by every tab screen and later views.
- Re-tap active tab → emit "reset" (context or event) — each screen resets its local state (wired up as screens gain state).
**Testing:** three tabs switch with visible cross-fade; tab bar floats over the background; haptic tick on tab press.

### Step 4 — Storage layer (SQLite + file system)
**Prereq:** 1
**Files:** `src/storage/db.ts`, `src/storage/folders.ts`, `src/storage/records.ts`, `src/storage/tags.ts`, `src/storage/searches.ts`, `src/storage/prefs.ts`, `src/storage/format.ts`, `src/types.ts`
- expo-sqlite database `spark.db`: tables `folders`, `records`, `tags`, `saved_searches`, `reminders` (schema from §3; tags on records as JSON column).
- Port every CRUD function from the PWA `storage.ts`: seed folders, get/save/delete folder (with record→inbox + subfolder reassignment), folder ordering, records index/sort (pinned first, newest first), moveRecord, tag add/remove/deleteCompletely, recent searches (AsyncStorage, cap 5), saved searches.
- Port formatting helpers verbatim: `formatTimestamp`, `formatDuration`, `formatRelativeTime`, `buildRecordName`, `stripStoredTimestampPrefix`, `uid()`.
- expo-file-system helper: `recordings/` dir ensure + save/delete audio file by record id.
**Testing:** temporary debug panel on home: seed folders, insert a fake record, list both, delete — survives full app restart.

### Step 5 — Haptics + Toast
**Prereq:** 1
**Files:** `src/lib/haptics.ts`, `src/components/Toast.tsx`, `src/context/ToastContext.tsx`
- Map PWA patterns → expo-haptics: light/medium/heavy = impact styles; success/warning/error = notification types.
- Global toast provider: bottom-center dark pill, 2.5s auto-dismiss, fade in/out.
**Testing:** debug buttons trigger each haptic (feel on phone) and a toast appears/disappears.

### Step 6 — Record screen idle UI
**Prereq:** 3
**Files:** `app/(tabs)/index.tsx`, `src/components/RecordPanel.tsx`
- Header ("Spark / Capture every thought" + new-folder button placeholder), "What's the idea?" glass panel, big round mic button ("TAP TO RECORD"), "or type a note" divider row.
**Testing:** home tab matches PWA layout; buttons show press feedback + haptic (no recording yet).

### Step 7 — Voice recording (record / pause / resume / stop / cancel)
**Prereq:** 4, 6
**Files:** `src/hooks/useRecorder.ts`, update `RecordPanel.tsx`
- expo-av: request mic permission, configure audio mode (`allowsRecordingIOS`), start `Audio.Recording` (high-quality preset, metering enabled).
- Timer counts only while not paused; red pulsing dot ↔ amber dot when paused; pause/resume/stop/cancel buttons (frosted circles); <1s guard discards with toast.
- Stop → keep file URI + duration in "pending" state (save dialog is step 9).
- **Web API replaced:** MediaRecorder/getUserMedia → expo-av Recording.
**Testing:** record with the panel; pause and confirm the timer freezes; resume; stop → console/debug shows a valid file URI and correct duration; cancel discards; denying mic permission shows the error toast.

### Step 8 — Live waveform
**Prereq:** 7
**Files:** `src/components/LiveWaveform.tsx`
- Poll `recording.getStatusAsync().metering` (dB) ~10–15×/s; maintain a rolling array of bar heights; render ~40 rounded bars with violet→fuchsia gradient (interpolate per-bar color); dim to 25% opacity when paused.
- **Web API replaced:** AnalyserNode+canvas → metering + animated views. (Note: metering gives one amplitude, not a spectrum — bars scroll like classic voice-memo apps.)
**Testing:** bars react visibly to voice loudness while recording; dim when paused; clear when stopped.

### Step 9 — Save-recording dialog (name, folder, tags, preview, re-record)
**Prereq:** 5, 7
**Files:** `src/components/SaveRecordingDialog.tsx`, `src/components/FolderPickerList.tsx`, `src/components/TagInput.tsx`
- Glass modal: duration line, Play back / Re-record buttons (expo-av Sound preview), name input, TagInput (chips, enter/comma commits, backspace deletes last, suggestions from all existing tags), scrollable folder list (sub-folders indented, "in <parent>" hint), Discard / Save.
- Save: move temp file to `recordings/<id>.m4a`, insert record, register tags, success haptic + toast. Empty name → timestamp name.
**Testing:** record → dialog appears → preview plays → save with a name+tag → record persists after app restart; Discard removes the temp file; Re-record starts a new recording immediately.

### Step 10 — Text notes
**Prereq:** 9
**Files:** `src/components/TextNoteDialog.tsx`
- "or type a note" opens modal: multiline content, optional name (auto first line ≤50 chars), TagInput, folder picker. Saves a `type:'text'` record (no audio file, durationSec 0).
**Testing:** save a text note without a name → name auto-generated; appears in Recent (after step 11) and persists.

### Step 11 — RecordCard + Recent section
**Prereq:** 9, 10
**Files:** `src/components/RecordCard.tsx`, home screen Recent section
- Card: play button (audio) or blue pen icon + "note" badge (text), name with pin indicator, timestamp line, meta line (duration or quoted text preview · relative time · folder name · hint), tag chips. Tap body toggles expanded (text notes: scrollable full content).
- Home "Recent": last 3 non-archived records in a glass section.
**Testing:** recent shows saved records with correct metadata; expanding a text note reveals full content.

### Step 12 — Audio playback (play/pause, scrub, skip, speed)
**Prereq:** 11
**Files:** `src/hooks/usePlayer.ts`, `src/lib/playback-manager.ts`, update `RecordCard.tsx`
- expo-av `Audio.Sound` per card, loaded lazily; **singleton manager**: starting one pauses the previously active one (port of `media-session.ts` logic).
- Expanded controls: scrub `Slider` (community slider or custom), ±5s buttons, speed pill cycling 0.75/1/1.25/1.5/2 (`setRateAsync(rate, true)` for pitch correction), time labels.
- **Web API replaced:** HTMLAudioElement → Audio.Sound; playbackRate → setRateAsync.
**Testing:** play two records — the first stops when the second starts; scrub jumps position; ±5s works; each speed audibly changes without chipmunk pitch.

### Step 13 — Background playback
**Prereq:** 12
**Files:** `src/lib/playback-manager.ts`, audio-mode setup
- `Audio.setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true, ... })`.
- **Web API replaced:** Media Session API. Note: rich lock-screen controls need react-native-track-player in a dev build (§7) — deferred; playback continuing in background is the v1 requirement.
**Testing:** start playback, background the app / lock the screen → audio keeps playing.

### Step 14 — Folders tab: list + create folder
**Prereq:** 4, 5
**Files:** `app/(tabs)/folders.tsx`, `src/components/NewFolderDialog.tsx`, `src/components/FolderIconPicker.tsx`, `src/components/FolderColorPicker.tsx`, `src/constants/icons.ts`
- Folder rows tinted by folder color (bg `color+'12'`, icon chip `color+'40'`), record count pill, sub-folder count line; dashed "New folder" row; header FolderPlus button.
- New-folder dialog: name, 26-icon grid picker, 10-color swatch picker, optional parent picker.
**Testing:** create a folder with custom icon/color → appears styled correctly; count shows 0; persists after restart.

### Step 15 — Folder detail view + edit/delete folder
**Prereq:** 11, 14
**Files:** `app/(tabs)/folders.tsx` (detail state), `src/components/FolderDetail.tsx`, `src/components/EditFolderDialog.tsx`
- Opening a folder shows breadcrumb (Home › [parent ›] name), color-tinted header with icon, record list (RecordCards), pencil → edit dialog (name/icon/color), trash → confirm delete (records → Inbox, sub-folders → grandparent; hidden for Inbox).
- Save dialogs (steps 9/10) default their folder to the currently open folder.
**Testing:** open folder → see its records; edit icon/color reflects immediately; delete a folder containing a record → record found in Inbox.

### Step 16 — Sub-folders
**Prereq:** 15
**Files:** `FolderDetail.tsx`, `NewFolderDialog.tsx`
- Sub-folders section inside folder detail + "Add sub-folder to <name>" dashed button (locks parent in dialog, with Change link); navigating into sub-folder updates breadcrumb; back navigation via breadcrumb taps.
**Testing:** create a sub-folder from inside a folder; navigate in via row, out via breadcrumb; delete parent → sub-folder promoted to top level.

### Step 17 — Drag-to-reorder folders
**Prereq:** 14
**Files:** `src/components/FolderReorderList.tsx` (+ deps: react-native-gesture-handler, react-native-reanimated, react-native-draggable-flatlist)
- Reorder mode toggle on folders tab: rows get grip handles, drag to reorder top-level folders, Save order / Cancel buttons; persists via `saveFolderOrder`.
- **Web API replaced:** dnd-kit → draggable-flatlist.
**Testing:** reorder three folders, save, restart app → order kept; Cancel reverts.

### Step 18 — Long-press action sheet + pin/archive/move/rename/delete
**Prereq:** 12, 15
**Files:** `src/components/RecordActionSheet.tsx`, `src/components/MoveRecordDialog.tsx`, `src/components/RenameRecordDialog.tsx`, `src/components/DeleteRecordDialog.tsx`
- Long-press (500ms, medium haptic) or ⋮ button → slide-up glass bottom sheet: record header + 7 actions (Pin/Unpin, Rename/edit tags, Move, Share/Copy, Trim [audio only], Archive/Restore, Delete red) + Cancel.
- Wire all flows: pin toggle (toast), archive toggle, move dialog (folder list, current disabled), rename dialog (name + TagInput), delete confirm (shows metadata).
- **Web API replaced:** pointer-event long-press timer → `Pressable onLongPress`.
**Testing:** every one of the 7 actions works from the sheet; pinned record jumps to top with pin icon; archived record disappears from folder view.

### Step 19 — Tags management + tag data integrity
**Prereq:** 18
**Files:** `src/components/settings/TagsSection.tsx` (used in step 25), storage already from step 4
- Delete-tag-everywhere flow with confirmation dialog (removes from tag list + every record).
- Ensure rename/save flows register new tags into the central list.
**Testing:** add a tag via rename; delete the tag from the (debug or settings) list → gone from the record too.

### Step 20 — Search by name + recent searches
**Prereq:** 11
**Files:** `src/components/SearchBar.tsx`, `src/hooks/useSearch.ts`, results section on home/folders screens
- Persistent search bar under the header (home + folders tabs): matches record name **and** text-note content, case-insensitive; scoped to active folder when inside one; clear (×) button.
- Submit adds to recent searches (cap 5); focused-empty state shows Recent chips + Clear.
- Results list of RecordCards with count header; empty state placeholder (illustration in step 26).
**Testing:** search finds a record by partial name and a text note by body text; recent chips reappear after restart; searching inside a folder only returns that folder's records.

### Step 21 — Search modes: Content + Date (+ date range)
**Prereq:** 20
**Files:** `SearchBar.tsx` (mode toggle), `useSearch.ts` (modes), datetimepicker integration
- Mode toggle button cycles **Name / Content / Date** *(Content mode added 2026-07-11 by Yassine's request — text-note content searchable as its own type, separate from name matching)*:
  - **Name**: matches record names only.
  - **Content**: matches inside text-note bodies only.
  - **Date**: native date picker for start date, optional end date row ("to <date>", Clear end); filters by local calendar date range.
- **Web API replaced:** `<input type="date">` → @react-native-community/datetimepicker.
**Testing:** name mode no longer matches note bodies; content mode finds a word that exists only inside a note's body; date mode: pick today → today's records; a range spanning yesterday–today → both days' records.

### Step 22 — Filter chips + sort menu
**Prereq:** 20
**Files:** `src/components/FilterChips.tsx`, `src/components/SortMenu.tsx`
- Horizontal chip row: Pinned (amber), Long ≥120s / Short <30s (emerald), one violet chip per tag; combinable within folder view; active states match PWA colors; filtered result views with "Clear" buttons.
- SortMenu dropdown (glass popover): 6 options, pinned always first; applied to every record list.
**Testing:** combine Pinned + a tag inside a folder → intersection shown; each sort option visibly reorders; check name Z→A.

### Step 23 — Smart folders
**Prereq:** 20
**Files:** `src/components/SmartFolderView.tsx` (rendered on home), entries wired from settings (step 25)
- All / This week (7d) / This month (30d) / Archive views on the home tab with icon header, count, sort menu, Clear; archive view shows archived records (restore via action sheet).
**Testing:** archive a record → visible only in Archive smart view; restore returns it; This week excludes older records (fake an old `createdAt` via debug to verify).

### Step 24 — Saved searches
**Prereq:** 21, 22
**Files:** `src/components/SaveSearchDialog.tsx`, saved list inside search-focused dropdown
- "Save this search" link when search active → name dialog capturing query + folder + tag + duration filter; saved list under Recent chips (load applies everything; × deletes).
**Testing:** save a search with a tag filter, clear everything, load it → query + filter restored; delete removes it permanently.

### Step 25 — Settings page
**Prereq:** 19, 23
**Files:** `app/(tabs)/settings.tsx`, `src/components/settings/*` (PrivacyBanner, StatsCard, ArchiveCard, SmartViews, AppearanceSection, SecuritySection, TagsSection, DataSection, AboutSection)
- Full scrollable settings tab in PWA order: privacy banner (violet, shield), stats card (summary line, opens step 28), archive card (count, jumps to Archive smart view on home), smart views 3-grid, appearance (theme + icon variant placeholders until 27/29), security placeholder (until 30), tags management (from 19), data & backup placeholder (until 31), about rows (version / storage "On-device (SQLite)" / account none).
- Re-tapping Settings tab scrolls to top.
**Testing:** all sections render and scroll; archive card navigates to Archive view; tag deletion works from settings.

### Step 25.5 — Recently Deleted (Trash) 🗑️ *(added 2026-07-11 by Yassine's request)*
**Prereq:** 18 (delete flow), 25 (Settings page hosts the entry card)
**Files:** `src/storage/db.ts` (migration), `src/storage/records.ts`, `src/storage/folders.ts`, `src/types.ts`, `src/components/DeleteRecordDialog.tsx`, `src/components/FolderDetail.tsx` (folder delete), `src/components/settings/RecentlyDeletedCard.tsx`, `src/components/RecentlyDeletedView.tsx`
- **Data model:** add `deletedAt: number | null` to `VoiceRecord` and `Folder` (null = active). SQLite migration via `PRAGMA user_version` (`ALTER TABLE records ADD COLUMN deletedAt`, same for folders — existing installs must migrate cleanly). **Every existing read adds `WHERE deletedAt IS NULL`** — since all queries go through the storage layer, search/stats/smart-folders/backup inherit the filter automatically.
- **Behavior:**
  - Record "Delete" → **soft delete** (`deletedAt = Date.now()`). Dialog copy becomes: *"Move to Recently Deleted? You can restore it for 30 days."* with Cancel / **Move to Trash**.
  - Folder "Delete" → soft-deletes the folder AND all its records (sub-folders still promote to the grandparent, as today).
  - **Restore** record → clears `deletedAt` (back to its folder). **Restore folder** → clears folder + its records.
  - **Delete Forever** → removes row + audio file (the old hard delete). **Empty Trash** → hard-deletes everything soft-deleted.
  - **Auto-purge on app open:** hard-delete records with `deletedAt` older than 30 days.
- **Storage API:** `getDeletedRecords()` (sorted `deletedAt` DESC), `restoreRecord(id)`, `restoreFolder(id)`, `permanentlyDeleteRecord(id)`, `purgeOldDeleted(threshold)`.
- **UI:** "Recently Deleted" card in Settings (Archive-card style) with "N items · auto-purged after 30 days" → opens a Recently Deleted view: rows show trash icon (instead of play/note), name, original folder, "deleted Xh ago", **Restore** (green) + **Delete Forever** (red) per row, **Empty Trash** button at top (with confirm).
- **Archive stays separate and unchanged:** Archive = hide but keep permanently; Trash = pending deletion with a 30-day grace period.
**Testing:** delete a record → gone from all lists but visible in Recently Deleted with correct folder + age; restore → back in its folder; Delete Forever → gone for good (audio file too); delete a folder → it and its records restorable together; Empty Trash clears everything; fake an old `deletedAt` (>30 days, via debug) → purged on next app open; archived records are unaffected by all of this.

### Step 26 — Empty states, skeletons, pull-to-refresh, offline dot
**Prereq:** 20
**Files:** `src/components/EmptyState.tsx`, `src/components/Skeleton.tsx`, screens updated
- EmptyState: butterfly SVG with glow (port PWA paths/gradients) + title + message; used for folder/search/tag/pinned/subfolder cases.
- Skeleton shimmer placeholders during initial load (animated opacity loop).
- `RefreshControl` on home/folders lists → reload from DB with haptic.
- NetInfo: green "Online" dot / dismissible amber offline banner.
**Testing:** empty folder shows butterfly; kill+reopen app fast enough to glimpse skeletons; pull down refreshes with haptic; airplane mode shows the amber banner.

### Step 26.5 — Performance pass: lazy players + list virtualization *(added 2026-07-11 — Yassine noticed heavy lists mount visibly slower)*
**Prereq:** 26 (it reworks the same lists that get RefreshControl/skeletons there)
**Files:** `src/hooks/usePlayer.ts`, list rendering in FolderDetail / FilteredResults / SearchResults / RecentlyDeletedView
- **Lazy player creation** (biggest win): today every RecordCard creates a native audio player at mount even if never played — switch `usePlayer` to expo-audio's imperative `createAudioPlayer()` on first play, with manual release (`player.remove()`) + status via the `playbackStatusUpdate` event. Zero native players for cards that are never played.
- **Progressive list mounting** (`LazyList`): FlatList cannot actually virtualize nested inside our ScrollView screens, so long lists (folder detail, filtered, search, smart views) mount in frame-sized batches (12 rows per frame) instead of one giant mount. Revisit true FlatList-as-scroll-root only if lists ever reach a scale where memory (not mount time) hurts.
- Placed right after Step 26 so it lands before real data volume grows, and before the heavy Settings-era views (stats, trash) build on the same lists.
**Testing:** open a folder with 30+ records → noticeably faster mount than before; scrolling stays smooth; playback, expand, action sheet, and pull-to-refresh all still work on virtualized lists; play → pause → navigate away → no crash (player release is clean).

### Step 26.7 — Multi-select & batch actions *(added 2026-07-12 by Yassine's request — deleting records one by one felt slow)*
**Prereq:** 26.5 (built on the finalized/virtualized lists), 25.5 (batch trash)
**Files:** `src/components/RecordCard.tsx` (selection mode), `src/hooks/useSelection.ts`, `src/components/SelectionToolbar.tsx`, list screens
- **Enter selection mode**: "Select" action added to the record action sheet (or long-press while already in a list header's select affordance). In selection mode, cards show a checkbox instead of the play/pen icon; tapping toggles selection; playback/expand disabled while selecting.
- **Selection toolbar** (replaces the tab bar or floats above it): "N selected", Select all, then batch actions: **Move to folder** (one folder picker for all), **Archive/Unarchive**, **Move to Trash** (single confirm with count), Cancel.
- Batch operations run through the existing storage functions in a loop (or one SQL `IN (...)` update for speed).
- Works in every record list: folder detail, filtered, search results, smart views, and the trash screen (batch Restore / Delete Forever there).
**Testing:** select 3 records across a folder → batch Move → all land in the target folder; batch Trash with one confirm → all in Recently Deleted; Select all works; Cancel exits cleanly; in the trash screen, batch Restore returns everything at once.

### Step 27 — Light theme
**Prereq:** 25
**Files:** `src/theme/tokens.ts` (light palette), `ThemeContext`, all components via tokens
- Light palette from PWA CSS: lavender-cream gradient (`#f5f0ff → #ede4ff → #faf5ff`), solid white cards with soft purple shadows, dark-purple text (`#1a0b2e` at graded opacities), purple-tinted borders, light ButterflyBackground variant.
- Theme picker in Settings → Appearance (two preview cards with check), persisted; every component reads tokens, no hardcoded colors.
**Testing:** toggle to light → whole app (all tabs, dialogs, cards, tab bar) flips correctly and stays after restart.

### Step 28 — Stats page
**Prereq:** 25
**Files:** `src/components/StatsSheet.tsx` (modal from settings)
- Port stats computation: 4 gradient hero tiles (recordings, total audio, day streak, this week), secondary rows (avg length, pinned, voice/text, top tag), per-folder horizontal bar breakdown, empty message.
**Testing:** numbers match reality (record 2 notes today → streak ≥1, this week 2); per-folder bars scale to the biggest folder.

### Step 29 — App icon accent variants
**Prereq:** 27
**Files:** `src/components/settings/IconVariantPicker.tsx`, `src/theme` accent handling, `assets/` 5 icon PNGs (copied from PWA `public/`)
- 5 gradient swatches (Violet/Ocean/Forest/Rose/Amber) in Appearance; selection persists and drives the in-app **accent color**.
- **Limitation (honest):** real home-screen icon swapping is impossible in Expo Go; document that a dev build + `expo-alternate-app-icons` enables it later. Icon assets prepared now.
**Testing:** pick Ocean → accents (active tab, chips, buttons) turn blue; persists after restart.

### Step 30 — Biometric unlock + lock screen
**Prereq:** 25
**Files:** `src/lib/biometric.ts`, `src/components/LockScreen.tsx`, root layout gate
- expo-local-authentication: `hasHardwareAsync` + `isEnrolledAsync` gate the setting; enable runs a test `authenticateAsync`; enabled flag in AsyncStorage.
- On app open (and on returning from background >N seconds — optional) show full-screen lock: gradient + bokeh, big fingerprint button, verifying spinner, "Disable biometric unlock" underline link (confirm dialog).
- **Web API replaced:** WebAuthn → local-authentication (much simpler: no credential storage needed).
**Testing:** enable → kill + reopen app → lock screen appears → fingerprint unlocks; failed/cancelled auth shows error toast and stays locked; disable from lock screen works.

### Step 31 — Backup export / import (.zip)
**Prereq:** 15 (real data to export)
**Files:** `src/lib/backup.ts`, `src/components/settings/DataSection.tsx`
- Export: jszip builds `manifest.json` (folders + tags + counts) + `metadata/<id>.json` + `audio/<id>.<ext>` (read via FileSystem base64) → write zip to cache → `Sharing.shareAsync` ("spark-backup-YYYY-MM-DD.zip").
- Import: DocumentPicker (.zip) → parse manifest → merge folders/tags/records skipping existing IDs → write audio files back to `recordings/` → toast with counts.
- Keep the zip format **byte-compatible with the PWA backup** so users can migrate PWA data into the native app.
- **Web APIs replaced:** `<a download>` → Sharing; file input → DocumentPicker.
**Testing:** export → save to phone; wipe app data (reinstall) → import the zip → all records play. **BONUS TEST: Export a backup from the PWA version, import it here — all records should play.**

### Step 32 — Onboarding + audio trim + final polish
**Prereq:** 12 (trim), 3 (onboarding)
**Files:** `src/components/Onboarding.tsx`, `src/components/TrimSheet.tsx`, `src/components/WaveformTrimmer.tsx`
- **Onboarding:** 3 slides (mic / folders / private-offline — reworded without "install to home screen"), progress dots, Back/Next/Get started/Skip, `onboarded` flag, shown once.
- **Trim v1 (non-destructive, Expo Go-safe):** static waveform from sampled metering-or-amplitude approximation (or uniform bars if amplitude unavailable), draggable start/end handles (gesture-handler) with floating time badges, "Preview selection" (seek to start, auto-stop at end), save as **copy** (new record, same audio file + trim metadata, "(trimmed)" name) or **replace** (set trim on original). Playback engine (step 12) respects `trimStart/trimEnd`; duration displays show the trimmed length.
  - *Deferred v2:* destructive re-encode via ffmpeg-kit in an EAS dev build (§7).
- Final polish pass: verify cross-fades everywhere, active-tab reset behaviors, haptics coverage.
**Testing:** fresh install shows onboarding once; trim a recording to its middle 5s → playback starts/stops at the handles, duration label updates; "save as copy" keeps original intact.

### Step 32.5 — Remove-middle trim mode ✂️ *(added 2026-07-12 by Yassine's request — right after testing Step 32's keep-selection trim)*
**Prereq:** 32 (built on the TrimSheet/WaveformTrimmer and the non-destructive trim engine)
**Files:** `src/lib/trim.ts` (new — shared segment math), `src/types.ts`, `src/storage/db.ts` (migration), `src/storage/records.ts`, `src/lib/backup.ts`, `src/hooks/usePlayer.ts`, `src/components/TrimSheet.tsx`, `src/components/WaveformTrimmer.tsx`, `src/components/RecordCard.tsx`
- **Second trim style:** cut a range out of the *middle* of a recording, keeping both sides. New nullable `cutStart`/`cutEnd` columns on records (ALTER TABLE migration); a record's playable audio = trim window minus the cut — up to two segments, computed by `src/lib/trim.ts` and shared by playback and preview.
- **TrimSheet mode toggle:** "Keep selection" (Step 32 behavior) / "Remove middle" (handles select the part to delete; the middle dims with a red border, kept sides stay violet→fuchsia). Preview plays the exact result, skipping the hole.
- **Normalization:** a removal that touches the window's start/end is saved as a plain trim (no cut fields), so data stays canonical; removing everything is blocked. Keep-mode reshapes preserve an existing cut (clamped into the new window).
- **Playback:** `usePlayer` seeks over the gap mid-play; scrubber/±5s/labels present the stitched segments as one continuous track. Backup zips carry `cutStart`/`cutEnd` as extra JSON keys (PWA importer ignores them).
**Testing:** remove the middle of a recording → playback audibly skips it and the duration shrinks; scrub across the seam; preview matches the saved result; a removal dragged to touch an edge becomes a plain trim; restore by re-trimming to full width.

### Step 33 — NEW: Scheduled reminders 🔔
**Prereq:** 12, 18
**Files:** `src/lib/reminders.ts`, `src/components/ReminderDialog.tsx`, action-sheet entry, `src/components/settings/RemindersSection.tsx`, notification handler in root layout
- Add "Remind me" (8th action) to the record action sheet → date+time picker dialog → `Notifications.scheduleNotificationAsync` (title = record name, body "Tap to listen", data `{ recordId }`); store Reminder row; request notification permission on first use (Android: create a notification channel).
- Notification response listener in root layout: navigate to the record and **auto-play it** (text notes: open expanded).
- Pending reminders list (per record indicator + settings section) with cancel (cancels scheduled notification + deletes row); fired reminders cleaned up.
- **Finding from Step 33:** expo-notifications cannot even be *imported* in Expo Go on Android — SDK 53+ removed its push native module from the Go client, and the package touches it during module evaluation and throws (a static import crashed every route). It is now lazy-required behind `getNotifications()` in `src/lib/reminders.ts` (returns null in Expo Go). Everything ships now — dialog, storage, settings list, tap-through auto-play — but scheduling is disabled in Expo Go with an explanatory note in the dialog; the real fire→tap→auto-play test happens in the **Step 34 dev build**.
**Testing (Expo Go):** app boots cleanly; "Remind me" opens the dialog with presets + pickers; the dialog shows the dev-build notice and Save is disabled.
**Testing (moved to Step 34):** set a reminder 2 minutes out, close the app → notification fires on time → tapping it opens Spark and the recording plays automatically; cancelling a reminder prevents it from firing.

---

### Phase: Dev build & release (34–37) — after everything above works in Expo Go

### Step 34 — EAS development build
**Prereq:** 1–33 (all Expo Go features complete)
**Files:** `eas.json` (from Step 1), `app.json` tweaks as needed
- Create a development build with `eas build --profile development` (Android APK), install it on the phone. From here on it replaces Expo Go: same QR/hot-reload workflow, but it can host custom native modules.
**Testing:** install the dev build APK, connect with `npx expo start --dev-client`, and verify **all features from steps 1–33 still work** (record, playback, biometrics, notifications, backup).

### Step 35 — lock-screen media controls
**Prereq:** 34
**Files:** `src/hooks/usePlayer.ts` (flip the `LOCK_SCREEN_SUPPORTED` gate), possibly nothing else
- **Finding from Step 13:** expo-audio's `setActiveForLockScreen(true, metadata)` is already wired into `usePlayer` with the PWA's Media Session metadata (record name / Spark / folder), but it requires the native `AudioControlsService` that only exists in a dev/production build (config plugin `enableBackgroundPlayback: true` is already set in app.json). The call is gated off in Expo Go because it logs a native "service binding failed" error there.
- In the Step 34 dev build, verify the media notification + lock-screen controls simply work via expo-audio. Only if they prove insufficient (missing seek/±5s buttons, flaky metadata), fall back to swapping the engine for **react-native-track-player** behind the `usePlayer` hook.
- ✅ **Verified during Step 34 (2026-07-12):** nothing to flip — `LOCK_SCREEN_SUPPORTED` keys off `executionEnvironment`, so it self-enabled in the dev build. Lock-screen/notification controls show the record name + "Spark", pause works, and background playback survives >3 min. expo-audio is sufficient; **no react-native-track-player swap needed**.
**Testing:** play a record in the dev build, lock the phone → media notification shows the record name + "Spark" + controls; pause from the lock screen works; playback survives >3 min backgrounded on Android.

### Step 36 — expo-alternate-app-icons (real icon switching)
**Prereq:** 34
**Files:** `app.json` (config plugin), `assets/icons/` (5 PNG variants from the PWA `public/`), `src/components/settings/IconVariantPicker.tsx`
- Wire the existing icon-variant picker to **expo-alternate-app-icons** so choosing Violet/Ocean/Forest/Rose/Amber actually changes the home-screen icon (Android activity-alias + iOS alternate icons). Keep the in-app accent recolor behavior too.
- ✅ **Done 2026-07-12.** `src/lib/app-icon.ts` — violet = default icon (reset), the other 4 are plugin-registered aliases (PascalCase). **Pattern for any future native module:** check `global.expo.modules.<Name>` BEFORE requiring the JS package — Metro reports even *caught* module-eval failures to LogBox in dev, so a try/catch alone still spams the log on binaries that predate the module (expo-notifications and this both hit it). Required a new dev build (first real exercise of the "native change = rebuild" rule).
**Testing:** pick Ocean in settings → home-screen icon changes to the blue variant (Android may briefly refresh the launcher shortcut — expected); accent colors still follow the variant.

### Step 37 — Production build
**Prereq:** 34 (35–36 recommended first)
**Files:** `eas.json` (production profile), `app.json`, `assets/` (icon, adaptive icon, splash)
- Configure app signing (EAS-managed keystore), splash screen assets, and `app.json` metadata: version/versionCode, Android permissions (RECORD_AUDIO, notifications, biometrics), Play-Store-ready icons. Run `eas build --profile production` for the final APK/AAB.
**Testing:** install the production APK on the phone (fresh install), run through onboarding, record + play + set a reminder — everything works with no dev server running.
> Step 37 ships the *first* release — **not the last**. Enhancement continues via Step 38 (below).

### Step 38 — Over-the-air updates (EAS Update) — *ongoing, makes 37 not-final*
**Prereq:** 37
**Files:** install `expo-updates`; `app.json` (`updates` + `runtimeVersion`), `eas.json` (update channel per profile)
- Wire **EAS Update** so post-launch enhancements reach the installed app **without a rebuild or reinstall**. `eas update --branch production` publishes a new JS/asset bundle; the installed app fetches it on next launch. Updates are **runtimeVersion-gated**, so the app never loads JS that expects native code the installed binary doesn't have.
- **This is the mechanism that makes Step 37 not-final.** Everyday flow: build the production APK once (37), then most future work — new screens, features built on already-installed native capabilities, bug fixes, design polish — ships **over-the-air** from Claude Code / Expo Go here. Only *native* additions (e.g. the ffmpeg destructive-trim v2, new permissions, an Expo SDK upgrade) require a new `eas build` + reinstall (which bumps runtimeVersion).
- **Workflow after this step is set up:** enhance + test in Expo Go / dev build → `eas update` → the daily-use app on the phone updates itself silently. The production app and ongoing development stay decoupled; the app is never "frozen" at Step 37.
- Optional later: decide **Play Store vs. sideload** distribution — both support EAS Update for the OTA layer; the Play Store only adds managed distribution of the *native* builds.
**Testing:** change a label/screen in JS → `eas update --branch production` → reopen the installed app (no reinstall) → the change appears. Then make a *native* change and confirm it correctly requires a new build instead.

---

## 6. Design System

### Colors
| Token | Value | Use |
|---|---|---|
| bg gradient (dark) | `#1a0b2e → #2d1b69 → #0f0a1f` (diagonal) | App background |
| bg gradient (light) | `#f5f0ff → #ede4ff → #faf5ff` | Light background |
| violet (primary) | `#8b5cf6` | Accents, default folder color, waveform start |
| fuchsia | `#d946ef` | Waveform/gradient end |
| blue | `#3b82f6` | Secondary accents, text-note icon |
| amber | `#f59e0b` / amber-300 | Pin, warnings, offline banner |
| emerald | `#10b981` | Success, duration chips, share |
| red | `#ef4444` | Delete, destructive |
| dark text (light mode) | `#1a0b2e` at 95/85/75/65/55/45/40/35% | Replaces white/NN |

Bokeh orbs (dark): purple-600/30, blue-600/30, fuchsia-600/25, violet-500/20 — huge blurred circles at corners.
Folder colors (10): `#8b5cf6 #3b82f6 #10b981 #f59e0b #ec4899 #ef4444 #06b6d4 #84cc16 #a855f7 #64748b`.
Icon variants (5): Violet `#8b5cf6`, Ocean `#3b82f6`, Forest `#10b981`, Rose `#ec4899`, Amber `#f59e0b`.

### Glassmorphism
- Cards: `rgba(255,255,255,0.05–0.10)` fill, 1px `rgba(255,255,255,0.10–0.20)` border, radius 16–24 (`rounded-2xl/3xl`), blur where cheap (BlurView on dialogs/tab bar; plain translucency on list cards for FlatList performance).
- Dialogs/sheets: near-opaque dark `rgba(24,24,27,0.95)` + blur + white/20 border.
- Light mode: solid white cards + soft purple shadows (`rgba(139,92,246,0.08–0.25)`) + purple-tinted borders instead of translucency.

### Waveform gradient
Per-bar interpolation violet→fuchsia: `r: 139→217, g: 92→70, b: 246→239` across bar index; 25% opacity when paused.

### Typography & spacing
System font. Title 24 semibold; section 18–20 semibold; body 14; meta 11–12 at 40–60% white; label caps 10 uppercase tracking-wide at 40%. Screen padding 16; card padding 16–24; list gap 8.

### Motion
- Cross-fade ~1000ms ease-in-out on tab/view switches; 200ms fade-slide for lists appearing; slide-up 250ms for bottom sheets; skeleton shimmer loop 1.5s; recording dot pulse.
- Haptics on: tab switch, record start/stop, save success, delete warning, pin, long-press, refresh trigger.

### Illustrations
Butterfly + crystal SVG paths (copied verbatim from PWA into react-native-svg): background silhouettes (2 butterflies, 2 crystals) and the EmptyState butterfly with radial glow.

---

## 7. Key Architecture Decisions

1. **SQLite over AsyncStorage for data** — records need filtering/sorting/counting; SQL keeps that fast and transactional. AsyncStorage only for tiny prefs (theme, flags, recent searches). This also fixes the PWA's O(n) read-everything pattern.
2. **Audio as files, not blobs** — expo-file-system `documentDirectory/recordings/<id>.m4a`; DB stores the URI. Files survive app updates and are directly shareable/zippable.
3. **expo-av for record + playback** — the one Expo Go-compatible library covering recording with pause/resume, metering (waveform), rate control, and background playback. (If the SDK version deprecates expo-av in favor of `expo-audio`, evaluate at step 1 — API mapping is near-identical.)
4. **Non-destructive trim first** — Expo Go can't run ffmpeg and Android can't record WAV via MediaRecorder, so v1 stores `trimStart/trimEnd` and the player honors them. Destructive re-encode is an explicit later upgrade via EAS dev build + ffmpeg-kit. Same UI either way.
5. **Expo Router tabs with custom tabBar** — file-based `(tabs)` group mirrors the PWA's three tabs; a custom `tabBar` component reproduces the floating glass design exactly. Folder detail stays in-tab state (matching the PWA) rather than a pushed route, preserving the "re-tap tab to reset" behavior.
6. **Design tokens + ThemeContext instead of CSS overrides** — the PWA light theme is a pile of `!important` class overrides; natively every component reads semantic tokens (`surface`, `textPrimary`, `accent`), so light mode is a palette swap, and icon-variant accent colors ride the same mechanism.
7. **Component decomposition** — the 5,785-line `page.tsx` becomes ~30 focused files (screens, components, hooks, storage modules) so each roadmap step touches an isolated area.
8. **Backup format stays PWA-compatible** — identical zip layout (`manifest.json`, `audio/`, `metadata/`) so existing PWA users can export there and import here on day one.
9. **Expo Go first, dev-build features flagged** — everything in steps 1–33 runs in Expo Go. Three features are explicitly documented as dev-build upgrades: true app-icon switching, lock-screen media controls (react-native-track-player), destructive ffmpeg trim.
10. **Reminders via local notifications only** — no push infrastructure; `expo-notifications` scheduled locally, with the notification payload carrying `recordId` for the tap→open→play deep link.

---

*Roadmap — a **living plan**, not a fixed-length list. Steps 1–33 (incl. 25.5, 26.5, 26.7, 32.5) run in Expo Go; 34–37 are the dev build & first release; **Step 37 is a checkpoint, not the finish line** — Step 38 (EAS Update) and any future steps keep the installed app evolving over-the-air. Built one step at a time; each step is tested on-phone before the next begins.*
