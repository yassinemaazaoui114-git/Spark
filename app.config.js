// Dynamic config wrapper around app.json (Step 37).
//
// Two app variants so the daily-driver production app and the development
// client can live on the phone side by side (the Step 38 workflow):
//   - APP_VARIANT=production (set by eas.json's production profile):
//     "Spark" / com.yassinemaazaoui.spark — the real app.
//   - everything else (local `npx expo start`, development/preview builds):
//     "Spark (Dev)" / com.yassinemaazaoui.spark.dev.
//
// The very first dev build (Step 34) predates this split and used the
// production id — installing the production APK replaces it and inherits its
// data (same id + same EAS keystore). Dev builds made after this file exist
// as a separate "Spark (Dev)" app with their own storage.
const IS_PROD = process.env.APP_VARIANT === 'production'

module.exports = ({ config }) => ({
  ...config,
  name: IS_PROD ? 'Spark' : 'Spark (Dev)',
  android: {
    ...config.android,
    package: IS_PROD ? 'com.yassinemaazaoui.spark' : 'com.yassinemaazaoui.spark.dev',
  },
})
