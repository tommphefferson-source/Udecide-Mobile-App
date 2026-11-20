const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Expo's `orientation: "portrait"` setting injects
 *   <uses-feature android:name="android.hardware.screen.portrait" />
 * into AndroidManifest.xml. A <uses-feature> with no android:required attribute
 * defaults to required="true", so Google Play excludes any device that doesn't
 * report portrait-screen hardware (tablets, ChromeOS/desktop, Android XR) and
 * blocks the release for review ("Required hardware feature declarations are
 * restricting your app's availability").
 *
 * The app is portrait-locked by design (the activity keeps
 * android:screenOrientation="portrait"), but it does NOT actually require
 * portrait hardware — it runs fine on any screen. This plugin marks the
 * screen-orientation features as optional so the app stays installable
 * everywhere while keeping its portrait behavior.
 */
const OPTIONAL_FEATURES = [
  "android.hardware.screen.portrait",
  "android.hardware.screen.landscape",
];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest["uses-feature"] = manifest["uses-feature"] || [];

    for (const name of OPTIONAL_FEATURES) {
      const existing = manifest["uses-feature"].find(
        (f) => f.$ && f.$["android:name"] === name,
      );
      if (existing) {
        existing.$["android:required"] = "false";
      } else {
        manifest["uses-feature"].push({
          $: { "android:name": name, "android:required": "false" },
        });
      }
    }

    return cfg;
  });
};
