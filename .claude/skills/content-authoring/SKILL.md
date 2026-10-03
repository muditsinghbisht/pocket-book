---
name: content-authoring
description: Use when writing or editing curated content for PocketBook (lessons, practice questions, quizzes, flashcards, cheat-sheets) or the YAML/MDX build pipeline that validates it. Enforces local Markdown/MDX and YAML as the only content source.
---

# Content authoring

## Rules

- All curated content lives in the repo as local files: Markdown/MDX for lessons, YAML for questions, flashcards, quizzes and cheat-sheets.
- Never fetch content at runtime. No CMS, no API, no remote JSON, no database for curated content.
- Content is validated at build time and compiled to compact runtime data. A schema violation must fail the build with a clear file and field message.
- Nested topics: Domain -> Topic -> Subtopic, unlimited depth. Every node may have lessons, case studies, questions, quizzes, flashcards, a cheat-sheet and (user-owned, not in the repo) notes.
- Do not add progress, score or streak fields to any schema.
- Read `.claude/requirements.md` before changing a schema or the content model.

## Schema

The format is final. `src/content/schema.ts` is the source of truth, and the layout and rules are summarized under "Content format" in `.claude/requirements.md`. Run `npm run build` (or `npm run dev`) to validate content.

## Practice questions

- Fields: unique `id`, `level` (beginner | intermediate | advanced | staff), `type` (mcq | open | coding), `q`, and `explain`.
- `mcq` has `options` and `answer` (index). `coding` has an external practice `link`.
- 2-3 `hints`, hidden until revealed.
- `solutions`: one or more alternate approaches, each with a `title` and both `java` and `cpp` code. Hidden until revealed.
- No in-app code editor or runner. Coding questions link out (default sites: LeetCode, NeetCode).

## Quizzes

- Scope: per section, per topic, or the entire book.
- Shuffle questions each run. The user selects the difficulty level. No score history is stored.

## Flashcards and cheat-sheets

- Ready-made decks per topic live in YAML. User-created cards live in IndexedDB only (see `persistence-idb`).
- One cheat-sheet per topic, written so it prints cleanly.

## Lessons

- Book-style chapters, deep rather than skimmable, with Mermaid diagrams.
- Cross-link related topics. The Caching section is the reference-quality example for structure and depth.
- Keep diagrams and tables readable on small screens.

## Content that is not verified

Anything factual that cites an external source follows the `case-study-sources` skill. Never invent sources.
