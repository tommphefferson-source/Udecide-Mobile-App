---
name: Expo/Metro duplicate-dependency crashes
description: Why the udecide Expo app intermittently crashed with "Unable to resolve module expo-router/expo" and the durable fix
---

# Expo app intermittent "Unable to resolve module" crashes

## Symptom
Expo (udecide) app intermittently fails at load with `UnableToResolveError Unable to resolve module expo-router`/`expo`/`react`, and Metro logs show TWO different versions of the same package being bundled in one session (e.g. `expo-router@6.0.23` AND `6.0.24`).

## Root cause
Running `expo install --fix` (or any in-place version bump) updates a package's direct deps but pnpm can leave the OLD version directories orphaned in `node_modules/.pnpm`. These orphans form a self-referential cluster (e.g. old `expo` bundles old `@expo/cli` which pins old `expo-router` as a peer). `pnpm install` will NOT garbage-collect them when it reports "Lockfile is up to date, resolution step is skipped." Metro crawls the whole virtual store and bundles both copies → ambiguous resolution → intermittent crash.

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
