# Spark — Session Handoff

> Rewritten at the end of every session. Answers: "what just happened and what do I do next?"
> Working rules + architecture map live in `AGENTS.md`; the plan lives in `ROADMAP.md`.

**Last session date:** 2026-07-12

## What we did this session

**Steps 25, 25.5, 26, 26.5, 26.7 built + phone-tested. Steps 1–26.7 all passing.**

- **Step 25** — Full Settings page in PWA order: PrivacyBanner, StatsCard (real numbers via new `src/lib/stats.ts`, full sheet in Step 28), Archive+SmartViews, AppearanceSection (theme/icon previews, placeholders until 27/29), SecuritySection (placeholder until 30), TagsSection, DataSection (placeholders until 31), AboutSection.
- **Step 25.5 — Recently Deleted (Trash)**: `deletedAt` on records+folders w/ safe migrations, every read filters it, delete = soft delete (new dialog copy), folder delete takes its records along, 30-day auto-purge on app open, `src/storage/trash.ts` API, Settings card + `/trash` route with Restore / Delete Forever / Empty Trash. Restore falls back to Inbox if the folder is still trashed. Also fixed: home tab now refreshes on focus (was stale after cross-screen changes).
- **Step 26** — Butterfly EmptyState everywhere, HomeSkeleton on first load, pull-to-refresh (home+folders, violet spinner, PWA haptic timing), OnlineIndicator (green dot / dismissible amber offline banner).
- **Step 26.5 — Performance pass**: usePlayer rewritten to lazy `createAudioPlayer()` on first play + manual release + `playbackStatusUpdate` event (zero native players at list mount); `LazyList` progressive batch mounting for all long lists. Yassine confirmed the slow-list complaint is gone.
- **Step 26.7 — Multi-select & batch actions**: selection store (`src/lib/selection.ts`), Select action in the sheet, SelectionToolbar (N selected / All / Move / Archive↔Restore / Trash / Cancel — single SQL batch ops), works in every list; trash screen has its own batch Restore/Delete Forever. **Gmail coin-flip avatars** (`FlipAvatar`, 250ms Y-rotation, midpoint crossfade to violet check, reverse on deselect, violet row tint): record lists enter selection via avatar long-press (tap stays play), trash uses true Gmail single-tap. Tab bar hides during selection (also fixed the toolbar-behind-tab-bar bug).
- **AGENTS.md rewritten** into the full project guide (architecture map, working rules, Yassine profile) so any new conversation continues seamlessly.

## Decisions made

- Trash restore falls back to Inbox for orphaned records; folders are restorable/hard-deletable from the trash too.
- LazyList over nested FlatList (can't virtualize inside ScrollViews) — documented in ROADMAP 26.5.
- FlipAvatar entry gesture differs by context: long-press in record lists (protect tap-to-play), single-tap in trash. Yassine may later want literal Gmail single-tap everywhere — it's a two-line change in RecordCard.
- Selection store is module-level (same pattern as smart-folder/active-folder).

## Files produced this session

- `src/lib/` — stats.ts, selection.ts
- `src/storage/trash.ts`; storage updates for deletedAt everywhere; batch ops in records.ts
- `src/components/` — EmptyState, Skeleton (+HomeSkeleton), OnlineIndicator, LazyList, SelectionToolbar, FlipAvatar
- `src/components/settings/` — PrivacyBanner, StatsCard, AppearanceSection, SecuritySection, DataSection, AboutSection, RecentlyDeletedCard
- `src/app/trash.tsx` (new route); settings.tsx assembled; index/folders wired for filters/selection/refresh
- New deps: @react-native-community/netinfo

## Where we are on the roadmap

**Steps 1–26.7 complete and phone-tested.** 40 steps total. Remaining Expo Go phase: **27 (light theme), 28 (stats sheet), 29 (icon variants), 30 (biometrics), 31 (backup), 32 (onboarding + trim), 33 (reminders)**; then dev build 34–37.

## Single next action

**Step 27 — Light theme**: wire the AppearanceSection theme picker to ThemeContext, persist via prefs (`spark:theme`), ensure every component reads tokens (the light palette already exists in `src/theme/tokens.ts`), light ButterflyBackground variant already built. Audit for hardcoded dark-only colors (dialogs' white primary buttons, chips' rgba accents are fine by design — check text colors and sheets).

## Open questions

- None blocking. Watch at Step 34: Android background playback >3 min in dev build; lock-screen controls (gated in Expo Go) also verified there.

## Notes for future Claude

See `AGENTS.md` — it now carries the full profile and working rules. Short version: one phone-tested step at a time, `npx tsc --noEmit`, stop with a test checklist, `expo start -c` warnings for new packages/dirs, session-end = rewrite this file + push to GitHub, and match Yassine's design bar (he tunes animations by hand and loves polish like the flip avatars).
