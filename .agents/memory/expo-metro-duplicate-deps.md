---
name: Expo/Metro duplicate-dependency crashes
description: Why the udecide Expo app intermittently crashed with "Unable to resolve module expo-router/expo" and the durable fix
---

# Expo app intermittent "Unable to resolve module" crashes

## Symptom
Expo (udecide) app intermittently fails at load with `UnableToResolveError Unable to resolve module expo-router`/`expo`/`react`, and Metro logs show TWO different versions of the same package being bundled in one session (e.g. `expo-router@6.0.23` AND `6.0.24`).

## Root cause
Running `expo install --fix` (or any in-place version bump) updates a package's direct deps but pnpm can leave the OLD version directories orphaned in `node_modules/.pnpm`. These orphans form a self-referential cluster (e.g. old `expo` bundles old `@expo/cli` which pins old `expo-router` as a peer). `pnpm install` will NOT garbage-collect them when it reports "Lockfile is up to date, resolution step is skipped." Metro crawls the whole virtual store and bundles both copies → ambiguous resolution → intermittent crash.

## Variant: a SECOND major Expo SDK pulled in by a stray root dep
A stray `"expo": "^56.0.11"` added to the **root** `package.json` `dependencies` (root is tooling-only; udecide pins `expo@~54`) made pnpm install a whole second SDK tree — `expo@56` + `react-dom@19.2`/`@types/react@19.2` alongside udecide's `expo@54`/`react@19.1`. Metro then failed hard (not intermittently): `Cannot find module './utils/env'` from `@expo/cli`, `Unable to resolve module scheduler`/`react`/`expo-router/entry-classic`, and `ENOENT scandir .../@expo/metro-runtime/assets`. **Fix:** remove the stray dep from root `package.json`, then do the clean rebuild below. Never put `expo` (or any app runtime dep) in the root `package.json` — the SDK version lives only in the artifact.

## Durable fix
Rebuild node_modules from the (already-correct) lockfile so orphans are dropped:
`rm -rf node_modules artifacts/*/node_modules lib/*/node_modules scripts/node_modules && pnpm install`
Then verify only ONE version remains: `ls -d node_modules/.pnpm/expo-router@* node_modules/.pnpm/expo@*`.
Restart the expo workflow afterward (clean cache rebuild).

**Why:** the lockfile was already clean (no refs to old versions); the problem was purely orphaned physical dirs that a normal `pnpm install` won't prune.

## Diagnosis tips
- Check Metro `Bundled ...` log lines for two different version hashes of the same package — that's the tell.
- Confirm duplicates on disk: `ls -d node_modules/.pnpm/<pkg>@*`.
- Transient `Unable to resolve` + `Failed to get SHA-1` errors during the `--clear` empty-cache rebuild window are EXPECTED and clear once bundling finishes; only a real problem if persistent after `Running application "main"`.

## Stale Metro error overlay after a transient bad edit
A syntax/JSX error saved mid-edit (even if fixed seconds later) makes Metro cache a `TransformError` and the Expo **web preview keeps showing that error overlay** until the bundle is reset. Symptom: repeated "artifact crashed with a runtime error" reports while screenshots/typecheck/the source are all clean, and the only error in browser console logs is an OLD timestamp.

**Diagnosis:** compare the error's timestamp to the current source — if the source no longer has the error and typecheck passes, it's a stale overlay, not a live crash.
**Fix:** restart the expo workflow (forces a fresh bundle + preview reconnect). A hard-refresh of the preview pane on the user's side also clears it.
