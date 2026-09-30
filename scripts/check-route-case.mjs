#!/usr/bin/env node
/**
 * Fails if any file or folder under src/app contains an uppercase letter.
 * macOS is case-insensitive but Next.js routes are not, so mixed-case
 * folders (e.g. HBD vs hbd) leave stale route manifests and break pages.
 */
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src", "app");
const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (/[A-Z]/.test(entry.name)) offenders.push(relative(process.cwd(), full));
    if (entry.isDirectory()) walk(full);
  }
}

walk(ROOT);

if (offenders.length > 0) {
  console.error("✖ Route files/folders must be lowercase:");
  for (const path of offenders) console.error(`  - ${path}`);
  console.error(
    "\nRename in two steps on macOS, e.g. git mv src/app/Foo src/app/foo-tmp && git mv src/app/foo-tmp src/app/foo"
  );
  process.exit(1);
}

console.log("✓ src/app route names are lowercase");
