# Spark — Session Handoff

> Rewritten at the end of every session. Answers: "what just happened and what do I do next?"
> Working rules + architecture map live in `AGENTS.md`; the plan lives in `ROADMAP.md`.

**Last session date:** 2026-07-12

## What we did this session

**Steps 32 → 37, all built and phone-tested in one marathon session.
🚀 Spark v1.0.0 shipped — the production APK is installed on Yassine's phone and fully
tested, including in airplane mode.** Commits: 87bb5dd (32–33), efac36f (34–35),
71616e3 (36), 0ac7ba9 (37).

- **32 — Onboarding + trim:** 3-slide onboarding (`onboarded` pref gate in `_layout`);
  non-destructive TrimSheet/WaveformTrimmer (pseudo-waveform seeded from record id;
  save-as-copy shares the audio file, trim-in-place restorable). **usePlayer gained the
  trim window** (previous handoff had wrongly claimed playback already respected it).
  `durationSec` = effective length on save. Backup error toasts softened.
- **32.5 — Remove-middle trim** (Yassine's idea): `cutStart`/`cutEnd`, red selection mode
  in the trimmer, playback seeks over the gap.
- **33 — Reminders:** full stack (storage/lib/dialog/settings list/bell indicators/
  notification tap → home shows highlighted card that auto-plays). Verified end-to-end
  in the dev build: fires on time, cold + warm start, cancel prevents firing.
- **34 — EAS dev build:** expo-dev-client + expo-asset (expo-doctor caught it as a
  missing expo-audio peer that crashes outside Expo Go), `android.package` set,
  EAS project created (projectId `70464c82-2106-4e3a-b93e-2fcf2fbf1229`, EAS-managed
  keystore). All of 1–33 re-verified on the dev build.
- **35 — Lock-screen controls: ZERO code.** `LOCK_SCREEN_SUPPORTED` keys off
  executionEnvironment so it self-enabled; expo-audio's controls are sufficient —
  **react-native-track-player permanently not needed.**
- **36 — Real icon switching:** expo-alternate-app-icons ^8.0.0; 4 alias icons
  (Blue/Emerald/Rose/Amber, PascalCase, from `assets/icons/` maskables), violet =
  default → `resetAppIcon()`. `src/lib/app-icon.ts`. Required a rebuild (first real
  "native change = new build").
- **37 — Production release:** `app.config.js` **variant split** — production =
  "Spark"/`com.yassinemaazaoui.spark` (APP_VARIANT=production via eas.json; **inherited
  the Step 34 dev build's identity, keystore, and data**); everything else =
  "Spark (Dev)"/`com.yassinemaazaoui.spark.dev`. Production builds an APK (sideload).

## ⚠ Patterns learned the hard way (three crash/noise rounds)

**Native modules absent from the running binary must never be require()d.** Metro
reports module-eval failures to LogBox **even when the require is wrapped in
try/catch**. Two gates now exist and future native modules must copy them:
- `src/lib/reminders.ts` → `getNotifications()`: `executionEnvironment !== StoreClient`
  check before a lazy require (expo-notifications throws at import in Expo Go, SDK 53+).
- `src/lib/app-icon.ts` → `getIconsModule()`: additionally checks
  **`global.expo.modules.ExpoAlternateAppIcons != null`** (expo-modules-core's registry)
  so binaries that PREDATE the module (older dev builds) also skip the require.
  This is the more general check — prefer it.

## Where we are on the roadmap

**Steps 1–37 complete. Spark v1.0.0 is the production app on the phone.**
Only Step 38 (EAS Update — ongoing/OTA) remains, then the roadmap enters its
"living project" phase: new features append as new steps and ship over the air.

## Single next action

**Step 38 — EAS Update (OTA).** Install `expo-updates`; configure `runtimeVersion`
(policy: probably `appVersion`) + `updates.url` in app config and channels per profile
in eas.json (production profile → channel "production"). Note the variant split when
wiring: updates must target the **production** app; the dev client loads from Metro and
is unaffected. ⚠ expo-updates is a **native module** → production needs ONE more
`eas build --profile production` (bump version to 1.0.1?) + reinstall; after that, JS
changes ship with `eas update --branch production` and reach the installed app on next
launch — no reinstall ever again for JS work. Test: change a visible label → publish →
reopen installed app twice → change appears.

## Dev workflow from now on (important)

- Daily app = production Spark; **never overwritten by development** (different id).
- When development resumes: `eas build --profile development` → installs as separate
  "Spark (Dev)" app (EAS will prompt once to create a keystore for the `.dev` id —
  yes). Connect with plain `npx expo start`.
- Expo Go still works for pure-JS/UI work, but reminders + icon switching are gated
  off there by design.
- eas-cli runs via `npx eas-cli` (not globally installed); Yassine is logged in.

## Open questions

- Share audio still shares the FULL file — trim/cut are metadata-only. Fix = ffmpeg-kit
  destructive re-encode (native → new step + rebuild). Yassine knows; not urgent.
- expo-notifications plugin (custom notification icon/color) not configured — Android
  shows the default icon in the status bar. Cosmetic; decide whenever.
- Play Store vs sideload: sideload chosen for now (APK); AAB switch only if Store.
- One reminder per record by design (new one replaces). Revisit only on request.

## Notes for future Claude

See `AGENTS.md` for rules + Yassine profile. One step per request, `npx tsc --noEmit`
(+ `npx expo-doctor` before builds — it caught a real crash-in-waiting), stop with a
numbered phone-test checklist, `expo start -c` warning on new packages/dirs,
session-end = rewrite this file + commit + push to
https://github.com/yassinemaazaoui114-git/Spark.git (origin/main). Animation timings
are his picks (FadeView 600, long-press 200, flips 250) — ask before changing. He
proposed 32.5 mid-flight and tests everything thoroughly and fast — expect more .5
steps post-38, shipped via OTA. Model driving this session: Claude Fable 5.
