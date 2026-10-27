<div align="center">

# ⚡ Spark

### Capture every thought.

A voice-first, local-first notes app for Android.<br/>
Tap the mic, speak in any language, and your idea is saved — organized, searchable, and ready to replay.

<br/>

![Version](https://img.shields.io/badge/version-1.0.0-8B5CF6?style=for-the-badge)
![Expo](https://img.shields.io/badge/Expo-SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)

[Features](#-features) · [Getting started](#-getting-started) · [Building](#-building-with-eas) · [Tech stack](#-tech-stack) · [Roadmap](#-roadmap)

</div>

---

## 💡 Why Spark?

Spark is built for people who think faster than they type. Speak naturally — Tunisian Arabic, French, English, anything — and the recording is saved with a name, into a folder, with tags. Text notes work too.

> [!NOTE]
> **Local-first and AI-free by design.** No server, no account, no tracking, no transcription. Everything lives in SQLite and files on your device, and the app works fully in airplane mode.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🎙️ Capture
- Voice recording with **pause / resume**
- **Live waveform** driven by mic metering
- **Preview** before saving, or re-record instantly
- **Text notes** with auto-naming from the first line
- Too-short recordings (< 1s) discarded automatically

</td>
<td width="50%" valign="top">

### 🗂️ Organization
- **Folders** with 26 icons and 10 colors
- **Sub-folders** with breadcrumb navigation
- **Drag-to-reorder** folders
- **Tags** with autocomplete
- **Pin**, **archive**, **move**, **rename**
- **Multi-select** with batch actions

</td>
</tr>
<tr>
<td width="50%" valign="top">

### ▶️ Playback
- Scrub bar, **±5s skip**, speed `0.75×` → `2×`
- One recording plays at a time
- **Background playback** with **lock-screen controls**
- **Share** audio to other apps, copy text notes

</td>
<td width="50%" valign="top">

### ✂️ Trimming
- Inline waveform with draggable handles
- **Keep selection** or **remove the middle**
- **Non-destructive** — save as copy or trim in place, always restorable

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🔍 Search & filters
- Search by **name**, **content**, or **date / date range**
- **Recent** and **saved** searches
- Combinable chips: Pinned, Long, Short, per-tag
- 6 sort orders (pinned always first)
- **Smart views**: All, This week, This month, Archive

</td>
<td width="50%" valign="top">

### 🔔 Reminders
- Set a date/time on any note
- A **local notification** fires on time
- Tapping it opens Spark and **plays the recording**
- View and cancel pending reminders in Settings

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🔒 Privacy & data
- **Biometric unlock** (fingerprint / face)
- **Recently Deleted** — 30-day trash with restore
- **Backup export / import** as `.zip`
- Stats: totals, streaks, voice/text split, top tags

</td>
<td width="50%" valign="top">

### 🎨 Design
- Glassmorphic **butterfly** aesthetic
- **Dark** (default) and **light** themes
- **5 real app icons**: Violet, Ocean, Forest, Rose, Amber
- Onboarding, skeletons, empty states, haptics everywhere

</td>
</tr>
</table>

---

## 🚀 Getting started

### Prerequisites

- **Node.js 18+**
- An Android phone with **[Expo Go](https://expo.dev/go)**, or an Android emulator

### Run in development

```bash
git clone https://github.com/yassinemaazaoui114-git/Spark.git
cd Spark
npm install
npx expo start
```

Scan the QR code with Expo Go.

> [!TIP]
> After adding a new package or source folder, restart with `npx expo start -c` to clear the Metro cache.

> [!IMPORTANT]
> **Reminders** and **app icon switching** need native modules that Expo Go doesn't include, so they're turned off there. Use a development build (below) to test them.

---

## 📦 Building with EAS

Spark ships as a sideloaded APK built with [EAS Build](https://docs.expo.dev/build/introduction/).

| Profile | Purpose | Installs as |
|---|---|---|
| `development` | Dev client for testing native features, connects to Metro | **Spark (Dev)** · `com.yassinemaazaoui.spark.dev` |
| `preview` | Internal test APK | **Spark (Dev)** · `com.yassinemaazaoui.spark.dev` |
| `production` | The real app | **Spark** · `com.yassinemaazaoui.spark` |

```bash
# Development client
npx eas-cli build --profile development --platform android

# Production APK
npx eas-cli build --profile production --platform android
```

The two app IDs mean the production app and the dev client live side by side on the same phone, each with its own data — development never overwrites your daily notes.

---

## 🛠 Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Expo SDK 57 + React Native 0.86 + React 19 |
| **Language** | TypeScript |
| **Navigation** | Expo Router (tabs + pushed routes) |
| **Database** | `expo-sqlite` |
| **Audio files** | `expo-file-system` (`recordings/<id>.m4a`) |
| **Preferences** | AsyncStorage |
| **Recording & playback** | `expo-audio` |
| **Reminders** | `expo-notifications` (local, scheduled) |
| **Biometrics** | `expo-local-authentication` |
| **App icons** | `expo-alternate-app-icons` |
| **Backup** | `jszip` + `expo-sharing` + `expo-document-picker` |
| **Animation & gestures** | Reanimated 4, Gesture Handler, `react-native-draggable-flatlist` |
| **UI** | `expo-blur`, `expo-linear-gradient`, `react-native-svg`, Lucide icons |

---

## 📂 Project structure

<details>
<summary><b>Click to expand</b></summary>

```text
src/
├── app/                    # Expo Router routes
│   ├── _layout.tsx         # Providers, audio mode, trash auto-purge
│   ├── (tabs)/
│   │   ├── index.tsx       # Record (home): record panel, search, filters, recent
│   │   ├── folders.tsx     # Folder list, detail, reorder mode
│   │   └── settings.tsx    # Settings page
│   └── trash.tsx           # Recently Deleted
├── components/             # One component per file
│   └── settings/           # Settings sections
├── storage/                # All data access (SQLite, files, prefs)
├── hooks/                  # useRecorder, usePlayer, useSearch, useRecordFilters
├── lib/                    # Reminders, backup, trim, biometrics, app icons, haptics…
├── theme/                  # Design tokens + theme context
└── context/                # Toast provider

app.config.js               # Production vs dev app variants
eas.json                    # Build profiles
```

</details>

---

## 🔒 Privacy

- ✅ All recordings and notes stay on your device
- ✅ No account, no server, no cloud
- ✅ No analytics, no tracking, no telemetry
- ✅ No AI — nothing is transcribed or sent anywhere
- ✅ Biometric checks are handled by Android and never leave the device

> **Your thoughts are yours. Period.**

---

## 📋 Known limitations

| Limitation | Details |
|---|---|
| ✂️ Sharing ignores trims | Trims are non-destructive, so sharing sends the full original audio |
| 🤖 Android only | Built and tested on Android; iOS hasn't been tested |
| 📲 Sideload only | Distributed as an APK, not on the Play Store |
| 🔕 Default notification icon | Reminder notifications use Android's default status-bar icon |

---

## 🗺 Roadmap

- [x] **v1.0.0** — full native app, production APK
- [ ] Over-the-air updates with EAS Update
- [ ] Destructive trim so shared audio matches the trim
- [ ] Custom notification icon and color
- [ ] Play Store release (maybe)

---

## 🦋 Origin

Spark started as a **Next.js PWA** ([Notes-App](https://github.com/yassinemaazaoui114-git/Notes-App)) and was rebuilt as a native app to unlock what browsers can't do: reliable background audio, lock-screen controls, real app icon switching, and scheduled reminders.

---

<div align="center">

**Built with care for people who think faster than they type.** 🦋

</div>
