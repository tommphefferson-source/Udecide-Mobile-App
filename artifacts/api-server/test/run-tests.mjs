#!/usr/bin/env node
/**
 * Compiles the voter-history modules + tests to CommonJS with tsc (esbuild's
 * platform binary is only installed for Linux in this workspace) and runs
 * them with Node's built-in test runner. No test-framework dependency.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, "..");
const outDir = join(serverDir, "dist-test");

const tsc = spawnSync("pnpm", ["exec", "tsc", "-p", join(here, "tsconfig.json")], {
  cwd: serverDir,
  stdio: "inherit",
});
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

// The workspace is "type": "module"; the compiled output is CommonJS.
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));

const testFiles = readdirSync(join(outDir, "test")).filter((f) => f.endsWith(".test.js"));
const result = spawnSync(
  process.execPath,
  ["--enable-source-maps", "--test", ...testFiles.map((f) => join(outDir, "test", f))],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
