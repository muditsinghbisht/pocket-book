# Study Assistant

A client-only, book-style web app for learning software engineering. Topics are nested, and every topic can have lessons, case studies, practice questions, quizzes, flashcards, a cheat-sheet and your own notes.

No backend. No login. No progress tracking.

## Features

- **Lessons**: deep, book-style chapters with diagrams.
- **Case studies**: real industry outages and learnings, each with sources (papers, blogs, talks, YouTube) and a short gist.
- **Practice questions**: 2-3 hints and alternate solutions (Java and C++), all hidden until revealed. Coding questions link to external practice sites; there is no in-app editor.
- **Quizzes**: per section, per topic, or the entire book. Shuffled, with selectable difficulty (beginner, intermediate, advanced, staff).
- **Flashcards**: ready-made decks plus your own. Export, import and print.
- **Cheat-sheets**: one per topic, printable.
- **Notes**: export and import as JSON or Markdown.
- **Responsive**: works on phones, tablets and desktop, with touch-specific interactions on mobile (drawer navigation, swipeable flashcards, tap-to-reveal hints).
- **Light and dark theme**: follows the system by default; the toggle in the top bar cycles System, Light and Dark. Diagrams and code blocks follow the theme, and printing always uses the light theme.
- **Offline and installable**: the production build is a PWA. After the first visit the whole book (every domain page, lesson and diagram) works without a connection, and a small "New content available" prompt offers a reload when a new version is deployed.

## Data and persistence

Notes and custom flashcards are stored in the browser's IndexedDB. Nothing leaves your machine. Use export and import to move or back up your data.

The only other things kept in the browser are the theme choice (System, Light or Dark), a UI preference in `localStorage`, and the offline copy of the book in the service worker cache, which is replaced by each new version.

## Tech stack

Node 26.10.0 (pinned in `.nvmrc` and `package.json` `engines`; run `nvm use`). Vite, React and TypeScript. Content is written in Markdown/MDX (lessons) and YAML (questions, flashcards, quizzes, cheat-sheets), validated and compiled at build time. Diagrams use Mermaid.

## Roadmap

| Phase | Scope                                                                                                                                                        | Status      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1     | App shell, all features (lessons, notes, quizzes, flashcards, cheat-sheets, responsive/mobile UI) and Caching in depth                                       | In progress |
| 2     | LLMs, RAG, Graph RAG, vector search, skills, loops, hooks, MCP (protocol detail), harnesses and agents. App: installable PWA with offline support for phones | In progress |
| 3     | The rest of software engineering                                                                                                                             | Not started |

Status values: Not started, In progress, Done.

## Status

Phase 1 in progress: scaffold done (Vite, React, TypeScript, Tailwind, Vitest). Content build pipeline done: YAML and Markdown/MDX in `content/` is validated with Zod at build time; lessons and case studies compile to lazily loaded MDX chunks with lazy Mermaid diagrams (format in `.claude/requirements.md`, schema in `src/content/schema.ts`). Navigation done: hybrid routing (a real `/<domain>/` page per domain, hash paths below it) and a responsive shell with a desktop sidebar, a mobile drawer and bottom section navigation. UI done: a sticky top bar (logo, domain links, theme toggle, drawer button on mobile), a semantic color system with per-section accents and level badges, and a light/dark theme (WCAG AA in both). Next: the interactive quiz player, notes and custom flashcards (IndexedDB, export/import) and swipeable flashcards.

Phase 2 in progress: the app item is done (installable PWA, offline via a build-generated service worker, update prompt). The LLM and agentic-systems content has not started.

See `.claude/requirements.md` for full requirements and decisions.
