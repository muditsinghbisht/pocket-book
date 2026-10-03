# PocketBook

Client-only, book-style web app for learning software engineering. Full details are imported below and are the source of truth.

@README.md
@.claude/requirements.md

## Rules

- No backend, no login, no progress tracking. IndexedDB is the only persistence, and only for notes and custom flashcards, with export/import.
- Mobile-first and responsive; touch interactions are a requirement, not an extra.
- Curated content lives in the repo as Markdown/MDX (lessons) and YAML (questions, flashcards, quizzes, cheat-sheets), validated at build time.
- Only include external links that were confirmed to exist. Mark any gist that could not be verified. Never invent sources.
- Practice-question solutions are in Java and C++. Hints and solutions are hidden until revealed. There is no in-app code editor.
- PWA/offline support is Phase 2, not Phase 1.
- Update the phase table in README.md when a phase changes status.

## Models

Default is claude-sonnet-5-5 (planning, research, content, docs). Code implementation goes to the `coder` subagent (claude-opus-5-5). See `.claude/settings.json` and `.claude/agents/coder.md`.

## Commands

Package manager is npm.

- `npm run dev`: start the Vite dev server
- `npm run build`: typecheck, then build static HTML/CSS/JS into `dist/`
- `npm run preview`: serve the built `dist/` locally
- `npm run lint`: ESLint
- `npm run typecheck`: `tsc -b`
- `npm run test`: Vitest (unit tests for pure logic; Playwright is deferred to a later phase)
- `npm run format`: Prettier
