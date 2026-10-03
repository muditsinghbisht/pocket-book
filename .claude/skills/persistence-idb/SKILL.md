---
name: persistence-idb
description: Use when writing code that stores, reads, exports or imports user data in Study Assistant (notes, custom flashcards) or anything that might persist state in the browser. Enforces IndexedDB as the only persistence and bans progress tracking.
---

# Persistence (IndexedDB)

## Rules

- IndexedDB is the only persistence. Use a small wrapper such as `idb` or Dexie.
- Store only two things: user notes and user-created flashcards.
- Do not use localStorage, sessionStorage, cookies or any server for user data.
- No progress, score, streak, history or "last visited" tracking. Quizzes store nothing.
- No backend, no login, no accounts. Nothing leaves the user's machine.

## Notes

- Attached per topic or section (key by topic/section id).
- Export as JSON or Markdown. Import restores the same view.

## Custom flashcards

- Attached to a topic deck. Export and import as JSON and Markdown. Printable.

## Export and import

- Must always work and be a round trip: export then import yields identical data.
- Include a format version in exported JSON so future schema changes can migrate.
- Validate imported files and report errors clearly. Never silently overwrite. Let the user choose merge or replace if there are conflicts.
- Must work on mobile browsers: use a file input for import, and a download or share-friendly flow for export.

## Code guidelines

- Keep all IndexedDB access behind one small data module so the rest of the app never touches the database directly.
- Handle unavailable or blocked IndexedDB (for example private mode) with a clear message instead of crashing.
- Phase 2 adds PWA/offline support. Do not add a service worker or manifest in Phase 1.
