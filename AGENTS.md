# Spark — React Native (Expo) — Project Guide

> This file is loaded at the start of every session. It explains what this project is,
> how we work, and where everything lives. **Start every session by reading `handoff.md`**
> (what just happened + the single next action), then continue from there.

## What Spark is

A **voice-first notes app**: tap the mic, speak (users primarily speak Tunisian Arabic),
the recording saves with a name into folders. Text notes too. **Local-first** (SQLite +
files on device, no server, no accounts), **no AI**, glassmorphic butterfly aesthetic
(dark purple gradient, frosted glass cards, violet→fuchsia accents). This repo is the
React Native migration of a finished PWA that lives at `../PWA Version` — reference it
for logic and design, but **never copy-paste web code**; write clean native code.

## The three documents

- **`ROADMAP.md`** — the plan of record: 40 numbered steps, each small and phone-testable.
  Steps 1–33 (incl. 25.5, 26.5, 26.7, 32.5) run in Expo Go; 34–37 are dev-build/release.
- **`handoff.md`** — rewritten at the end of every session: what was done, decisions,
  where we are, the single next action. **The source of truth for current state.**
- **`AGENTS.md`** (this file) — durable working rules and the architecture map.

## How we work (non-negotiable rhythm)

1. Build **exactly one roadmap step** per request. No skipping ahead.
2. Verify with `npx tsc --noEmit`.
3. **STOP** and give Yassine a numbered phone-test checklist. He tests every step on his
   physical Android phone via **Expo Go** before the next step starts.
4. When a step adds a new npm package or a new source directory, **warn him to restart
   with `npx expo start -c`** — Metro on Windows misses them while the dev server runs.
5. **Session-end ritual** (when he says he's leaving): rewrite `handoff.md`, then
   `git add -A`, commit (imperative summary + `Co-Authored-By: Claude <model> <noreply@anthropic.com>`),
   `git push` to `https://github.com/yassinemaazaoui114-git/Spark.git` (origin/main, auth works).
6. Report every Metro WARN/ERROR he pastes honestly: fix ours; for upstream dev noise,
   explain root cause and suppress via LogBox with a documented trade-off
   (current suppressions live in `src/app/_layout.tsx`).

## About Yassine (how to collaborate)

Builder-type developer, ships personal tools end-to-end, iterates fast. Design quality
matters as much as features — he notices missing transitions and rough edges immediately,
and he actively tunes constants (his current picks: **FadeView 600ms, long-press 200ms,
avatar flip 250ms**). He proposes features mid-project (Trash, multi-select, content
search, Gmail flip avatars) — add them to ROADMAP.md at the right position (use .5/.7
numbering to avoid renumbering) and implement in order. He overrides PWA behavior when
native UX is better.

## Tech stack (Expo SDK 57 — APIs changed, verify at docs.expo.dev/versions/v57.0.0)

- **expo-audio** (expo-av does NOT exist): `useAudioRecorder` + `RecordingPresets` for
  recording (metering drives the live waveform); imperative `createAudioPlayer()` for
  playback (created lazily on first play, `player.remove()` on unmount, status via the
  `playbackStatusUpdate` event). `setActiveForLockScreen` is **gated off in Expo Go**
  (`LOCK_SCREEN_SUPPORTED` in usePlayer) — works only in dev builds (Step 34+).
- **expo-file-system**: new class API (`File`, `Directory`, `Paths`) — audio lives in
  `documentDirectory/recordings/<id>.m4a`.
- **expo-sqlite** async API: `spark.db`, schema + `ALTER TABLE ... catch` migrations in
  `src/storage/db.ts`.
- Also: expo-router (tabs + pushed routes), reanimated 4, gesture-handler,
  react-native-draggable-flatlist, @react-native-community/{slider,datetimepicker,netinfo},
  expo-{haptics,sharing,clipboard,blur,linear-gradient}, lucide-react-native.

## Architecture map

```
src/app/                    Expo Router routes
  _layout.tsx               providers (Gesture/Theme/Toast), audio mode, trash auto-purge, LogBox
  (tabs)/index.tsx          Record (home): record panel, search, filters, smart views, Recent
  (tabs)/folders.tsx        folder list / detail / reorder mode / scoped search+filters
  (tabs)/settings.tsx       full settings page (sections in src/components/settings/)
  trash.tsx                 Recently Deleted (pushed route, batch restore/delete)
src/components/             one component per file; settings sections under settings/
src/storage/                ALL data access goes through here
  db.ts                     schema + migrations   records.ts / folders.ts / tags.ts
  trash.ts                  soft delete / restore / purge (30-day retention)
  searches.ts (recent+saved) files.ts (audio files) prefs.ts (AsyncStorage) format.ts (uid, formatters)
  ⚠ every read filters deletedAt IS NULL — new queries must too
src/hooks/                  useRecorder, usePlayer (lazy player), useSearch (name/content/date),
                            useRecordFilters (combinable chips)
src/lib/                    module-level stores + helpers: selection.ts (multi-select),
                            smart-folder.ts, active-folder.ts, tab-events.ts (re-tap reset),
                            playback-manager.ts (one player at a time), haptics, share-record,
                            sort-records, stats, audio-mode
src/theme/                  tokens.ts (ALL colors/spacing — never hardcode outside rgba accents),
                            ThemeContext (dark default; light lands in Step 27)
```

## Patterns to follow

- **RecordCard is self-contained**: owns playback, action sheet, dialogs, selection; parents
  just pass `onChanged` to refresh. Every record list = RecordCard + `LazyList` (progressive
  batch mounting — FlatList can't virtualize inside our ScrollViews).
- Screens refresh with `useFocusEffect`; cross-tab state via tiny module stores with
  listeners (see `src/lib/selection.ts` for the pattern).
- Dialogs build on `GlassDialog`; confirmations on `ConfirmDialog`; toasts via `useToast()`;
  haptics on every meaningful interaction (`haptic('light'|'medium'|...)`).
- Multi-select: `FlipAvatar` (Gmail coin-flip) everywhere; in record lists long-press the
  avatar to enter selection (tap = play); in the trash single-tap enters (no play button).
  Tab bar hides while selecting; `SelectionToolbar` replaces it.
- Deleting = **soft delete** into Recently Deleted (30 days); hard delete only from the
  trash screen. Archive is a separate, permanent-keep feature.
