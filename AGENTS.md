<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Library-First Policy

1. Before building a non-trivial feature (image crop, QR, date picker,
   drag & drop, carousel, etc.), look for a well-maintained library first.
   Do not hand-roll it unless necessary.
2. Hand-rolling is allowed only when no suitable library exists, the library
   conflicts with the Tech Stack (e.g. animation libraries other than GSAP,
   UI kits other than shadcn/ui), or the code is only a few lines.
3. When proposing a library, state: name, exact version (released at least
   2 weeks ago), license, last release / maintenance, React 19 compatibility,
   and why it beats hand-rolling. Wait for approval before installing.
4. Pin exact versions in package.json.
