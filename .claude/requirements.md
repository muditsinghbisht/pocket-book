# PocketBook: Requirements and Decisions

Reference document for future sessions and agents. Keep in sync with README.md.

## Vision

A client-only, static "book of software engineering" with nested topics. It contains lessons, case studies, practice questions, quizzes, flashcards, cheat-sheets and notes. There is no backend and no login.

## Hard constraints

- No server, no login, no accounts.
- No progress, score or streak tracking.
- The only persistence is the browser's IndexedDB, used for user notes and user-created flashcards. Export and import must always work so data is portable.
  - Allowed exceptions (not user data, nothing to export): the theme preference (`system` | `light` | `dark`) in `localStorage` under the key `theme`, and the PWA's service-worker cache (the offline copy of the built book). The theme must be in `localStorage` because it is read synchronously by an inline script before first paint; IndexedDB is async and would cause a flash of the wrong theme. Every access is wrapped in try/catch, so blocked storage falls back to the system theme.
- All curated content (lessons, questions, flashcards, cheat-sheets, case studies) ships inside the repo and is built into static assets.

## Tech stack

- Vite + React + TypeScript (static build, deployable anywhere, including Hostinger). `npm run build` outputs plain static HTML/CSS/JS in `dist/`, with no server and no rewrite rules needed.
- Runtime: Node 26.10.0 (pinned in `.nvmrc` and `package.json` `engines`).
- Package manager: npm.
- Styling: Tailwind CSS (mobile-first utilities, plus print variants).
- Content authored as Markdown/MDX (lessons) and YAML (questions, flashcards, quizzes, cheat-sheets).
- A build step validates the YAML and compiles it to compact runtime data.
- Mermaid for diagrams.
- Client-side search index.
- IndexedDB (via a small wrapper such as `idb` or Dexie) for notes and custom flashcards.
- Print stylesheets for cheat-sheets and flashcards.

## Routing and shareable URLs

Hybrid, decided by the owner. Every URL must be shareable and work when opened directly on a plain static host.

- Top level (Domain, for example `/caching/`): a real path. The build emits a real `index.html` for each top-level topic, so the URL works with no server rewrite rules.
- Deeper levels (Topic, Subtopic, section and tool views): hash-based IDs, for example `/caching/#eviction/lru`. The hash is the node ID path, so it is stable and shareable. The app reads the hash on load.
- Assets are referenced so the build also works when deployed under a subpath.
- Keep routing in one small module so it can be changed later.

Implemented (navigation milestone) in `src/route.ts`, the only routing module:

- `<base>/` is the home page (list of domains). `<base>/<domain>/` is a domain, with a real `dist/<domain>/index.html` emitted by `build/content-plugin.ts` (a copy of `index.html` with asset URLs moved up one level and `<meta name="domain">` added; the dev server serves the same page).
- The hash is `#<node path below the domain>[/<section>[/<item>]]`, for example `/caching/#eviction/lru`, `/caching/#eviction/lessons/intro`, `/caching/#case-studies/some-outage`. Sections: `lessons`, `case-studies`, `practice`, `quizzes`, `flashcards`, `cheatsheet`, `notes`. Section names are reserved and the build rejects them as node directory names, so the first section-name segment ends the node path. No section means the node overview.
- Every link is relative (`#...` within a domain, `../<domain>/#...` across domains, `./<domain>/` from home) and Vite uses `base: "./"`, so the build works under any subpath.
- `parseHash`, `toHash` and `href` are pure and unit tested; `useRoute` subscribes to `hashchange`.

Shell: persistent sidebar tree at `md` and up; below `md`, a native `<dialog>` drawer (focus trap and Escape for free, closes on backdrop or link tap) and a fixed bottom navigation for the seven sections. The tree expands only the active node's ancestors. Section views are stubs except lessons, case studies and practice (hints, explanation and solutions behind tap-to-reveal `<details>`).

## Responsive and mobile

The app must be fully responsive and work well on phones and tablets, with interactions designed for touch rather than just a shrunken desktop layout.

- Mobile-first layout. Check at phone, tablet and desktop breakpoints.
- The nested topic tree becomes a slide-out drawer or bottom sheet on mobile, and a persistent sidebar on desktop.
- Touch-friendly targets, with bottom navigation for the main sections on mobile.
- Flashcards: swipe to move between cards and tap to flip, with keyboard shortcuts on desktop.
- Quizzes: large tap targets for options, one question per screen on mobile.
- Hints and solutions: tap to reveal, with code blocks scrollable horizontally instead of overflowing.
- Diagrams (Mermaid) and tables stay readable on small screens (scroll or zoom).
- Notes editor, export and import work on mobile browsers.
- Print stylesheets stay available for cheat-sheets and flashcards.

## Content model

Nested topics: Domain -> Topic -> Subtopic, with unlimited depth. Every node can have:

1. Lessons (deep, book-style, with diagrams)
2. Case studies and outages
3. Practice questions (hints and solutions hidden by default)
4. Quizzes
5. Flashcards
6. Cheat-sheet
7. Notes (user-owned)

### Case study template

Context -> What happened -> Root cause -> Fix -> Lessons -> Sources (link + gist).
Sources include papers, blogs, talks and YouTube. Only include links confirmed to exist, and mark any gist that could not be verified.

### Practice questions

- Each question has 2-3 hints, hidden until revealed.
- Each question has alternate solutions in **Java and C++**, hidden until revealed.
- Coding questions link to an external practice site (for example LeetCode or NeetCode). There is no in-app editor or code runner.

### Quizzes

- Scope: per section, per topic, or the entire book.
- Questions are shuffled each run.
- The user selects the difficulty level: beginner, intermediate, advanced, staff. A chosen level means that level only, not that level and below.
- Quizzes are derived from the question YAML by scope and level. Hand-curated quiz YAML files are also allowed (a title plus a list of question IDs and/or inline questions) and are validated at build time.
- No score history is stored.

### Flashcards

- Ready-made decks per topic.
- Users can add their own (stored in IndexedDB).
- Export and import (JSON, Markdown) and print.

### Notes

- Per topic or section, stored in IndexedDB.
- Export as JSON or Markdown. Import restores the same view.

### Cheat-sheets

One per topic. Printable.

## YAML authoring format (sketch)

```yaml
questions:
  - id: cache-stampede-01
    level: intermediate # beginner | intermediate | advanced | staff
    type: mcq # quiz: mcq | numeric | free; practice: open | coding
    q: What is a cache stampede?
    options: [..., ..., ..., ...]
    answer: 1 # index, for mcq
    explain: ...
    hints: [hint 1, hint 2, hint 3]
    solutions:
      - title: Approach name
        java: |
          ...
        cpp: |
          ...
    link: https://... # external practice site, for coding questions
```

### Content format (final, Phase 1)

Source of truth: `src/content/schema.ts` (Zod). Compiler: `src/content/compile.ts`. Vite plugin: `build/content-plugin.ts`, which serves the compiled tree as the `virtual:content` module in dev and build. Any validation error fails the build with `content/<file>: <field.path>: <message>`.

Layout: every directory under `content/` is a topic node (Domain -> Topic -> Subtopic, unlimited depth). The directory name is the node ID (lowercase slug) and the node path is the ID path, for example `caching/eviction`. Allowed files in a node directory:

- `node.yaml` (required): `title`, optional `summary`, optional `order` (number; siblings sort by `order`, then by ID).
- `*.md` / `*.mdx`: lessons. File name is the lesson ID. Frontmatter `title` (required) and `order` (optional). Compiled at build time by `@mdx-js/rollup` (`.md` as plain Markdown, `.mdx` as MDX; GFM tables via `remark-gfm`, frontmatter stripped via `remark-frontmatter`). Each file becomes its own lazily loaded chunk, exposed as `modules[<path under content/>]` from `virtual:content`; the compiled tree only carries `{ id, title, file }`. ` ```mermaid ` code blocks render as diagrams; `mermaid` is imported lazily on the first diagram, so it is not in the main bundle, and diagrams render at natural size inside a horizontally scrollable box.
- `case-studies/<id>.md` (or `.mdx`): case studies, in a `case-studies/` subdirectory of the node they belong to (that directory is not a node). Markdown rather than YAML because case studies are long prose with diagrams, and this reuses the lesson pipeline. Frontmatter: `title`, optional `summary` and `order`, and `sources` (at least one), each `{ type: paper | blog | talk | youtube, title, url (https only), gist, verified: boolean }`. `verified: false` means the gist could not be checked against the source; the UI shows a "Gist unverified" badge. The body's h2 headings must be exactly `Context`, `What happened`, `Root cause`, `Fix`, `Lessons`, in that order (h3 and below are free; fenced code is ignored). The Sources section is rendered from frontmatter, so it is not written in the body.
- `questions.yaml`: `questions: [...]`, any number per node, mixing two families by `type`:
  - Quiz questions, played in quizzes: `mcq` (`options`, 2 or more, and `answer` index within range), `numeric` (`answer` number, optional `tolerance` as absolute difference, optional `unit`), `free` (ungraded; `answer` is the model answer, shown with `explain` on reveal). `hints` are optional (2-3 if present). No `solutions` or `link`.
  - Practice questions, shown under Practice: `open` and `coding`. `hints` required (2-3), hidden until revealed. `solutions` entries need `title`, `java` and `cpp`; optional for `open`, at least one for `coding`. `link` (`https`) is required for `coding`, optional for `open`.
  - Common fields: `id`, `level`, `type`, `q`, `explain`. `id` is a lowercase slug, unique across the whole book (including inline quiz questions).
- `flashcards.yaml`: `cards: [{ front, back }]` (one ready-made deck per node).
- `quizzes.yaml`: `quizzes: [{ id, title, questions: [<question id> | <inline quiz question>] }]`. Quiz IDs are unique book-wide. IDs must resolve to a quiz-type question (`mcq`, `numeric`, `free`) in some `questions.yaml`; dangling IDs and practice questions fail the build. Inline questions must be quiz types too. They are resolved at build time.
- `cheatsheet.yaml`: `sections: [{ heading, items: [markdown string] }]`.

Node directory names must be lowercase slugs and must not be a section name (see Routing). All objects are strict: unknown keys fail the build, so typos are caught. Any other file name in a node directory also fails the build. Dotfiles are ignored.

Runtime constants (`levels`, `sections`, `quizTypes`, `isQuizQuestion`) live in `src/content/model.ts`, which has no zod import, so zod stays out of the app bundle.

Derived quizzes (`src/content/quiz.ts`): `deriveQuiz(scope, level)` collects the quiz-type questions of a node and all its descendants (or the whole book, given the domain list) at exactly the chosen level, shuffled with Fisher-Yates on every call. Hand-curated quizzes are played by shuffling their resolved `questions`.

## Visual design and theme

- Colors are semantic tokens in `src/index.css` (`bg`, `surface`, `subtle`, `fg`, `muted`, `line`, `line-strong`, `primary`, `primary-fg`, `primary-soft`, `success`, `warn`, `warn-soft`, `danger`, `code`, `code-fg`, plus the callout colors), exposed to Tailwind v4 through `@theme inline` as `bg-surface`, `text-muted`, `border-line` and so on. Components use only these tokens, never raw palette colors and never the `dark:` variant, so a theme is just a set of values.
- Accents: one per section tab (`--c-lessons`, `--c-case-studies`, ...) and per level (`--c-beginner` ... `--c-staff`). A component sets `--tone` with `tone(key)` from `src/views.tsx` and uses `text-tone`, `border-tone`, `bg-tone` or the `.badge` class. "Gist unverified" uses `.badge-warn`. Hints are labeled in `warn`, solutions in `success`.
- Contrast: every text/background pair meets WCAG AA (4.5:1) in both themes, including badges on their tinted background. Check again when changing a token.
- Typography: system sans for UI and headings, a serif stack (Charter, Cambria, Georgia) for lesson and case-study prose, system monospace for code. Prose styles live in `.prose` in `src/index.css`; tables are wrapped in `.table-wrap` (scrolls), diagrams in `.diagram` (scrolls), code blocks use the `code-block` utility.
- Theme: `src/theme.ts`. Three states, cycled by the top-bar toggle: System (default, follows `prefers-color-scheme` live), Light, Dark. The `dark` class on `<html>` switches the tokens. An inline script in `index.html` (copied into every domain page by the build) applies the stored choice and the `theme-color` meta before first paint. Mermaid re-renders with its `dark` or `default` theme when the app theme changes. Dark tokens apply under `@media screen` only, so printing always uses the light theme; a diagram rendered dark is inverted for print.
- Top bar: sticky on every view, hidden when printing. Logo and name link home, domain links from 640px, theme toggle, and the drawer button below 768px. It respects the top and side safe-area insets; the bottom section bar respects the bottom inset, and the main content is padded so nothing sits under it. Search is not in the bar because there is no search index yet; add it there when the index exists.

## PWA and offline

Implemented ahead of the Phase 2 content (the app item of Phase 2).

- Manifest: `public/manifest.webmanifest`, relative `start_url` and `scope` (`./`), `display: standalone`. Icons in `public/`: `icon.svg` (also the favicon), `icon-192.png`, `icon-512.png` (full-bleed, `any maskable`). The browser bar color comes from the `theme-color` meta, set per theme.
- Service worker: hand-rolled, generated at build time by `build/pwa-plugin.ts` (vite-plugin-pwa was not used: it would be a new dependency, and the per-domain pages are emitted by our own plugin late in the bundle, so a 30-line generator after `writeBundle` is simpler and certain to see every file). It precaches every file in `dist/` (domain pages by directory URL and by `index.html`, all lesson and Mermaid chunks, icons, manifest), so any lesson works offline after the first visit, not only the ones already opened. Cache first, network fallback. All URLs are relative to `sw.js`, so it works under any subpath.
- Versioning: the cache is named after a hash of every built file and the worker code, scoped by registration scope. A new deploy changes `sw.js`, the browser installs it in the background, and the old cache is deleted on activation.
- Update flow (`src/pwa.ts`): when a new worker has installed while an old one controls the page, a non-intrusive toast says "New content available" with Reload and Dismiss. Reload tells the waiting worker to `skipWaiting` and reloads on `controllerchange`; the hash route is kept. The app also checks for an update when it becomes visible again.
- Registered only in production builds (`import.meta.env.PROD`), never in `npm run dev`.
- `npm run build` always produces a production build: `vite.config.ts` sets `NODE_ENV=production` for the build command, because a `NODE_ENV=development` left in the shell would otherwise make Vite ship React's development build.

## Testing

- Phase 1: Vitest unit tests for pure logic only (schemas, quiz engine, export/import round-trip), plus lint, typecheck and build checks.
- Playwright end-to-end and mobile-viewport tests are deferred to a later phase, by decision of the owner.

## Content roadmap

### Phase 1: app shell plus Caching

App shell and all features, with the Caching section as the reference-quality example.
Caching includes: what and why, cache layers, write policies, eviction, invalidation, TTL, stampede / thundering herd, consistency, hot keys, CDN, distributed caches (Redis, Memcached), and industry outages with lessons and papers (for example Facebook's "Scaling Memcache").

### Phase 2: LLM and agentic systems, plus PWA

Content: LLMs, RAG, Graph RAG, vector databases and embeddings, skills, loops, hooks, MCP (protocol-level detail: JSON-RPC 2.0, lifecycle and capability negotiation, transports, tools, resources, prompts, sampling, roots, elicitation, based on the official spec), LLM harnesses, agents.

App: installable PWA with offline support, so the book can be used on a phone without a connection. This includes a web app manifest, a service worker that precaches the compiled content, and an update flow for new content versions. Deferred from Phase 1 by decision of the owner. Done (see "PWA and offline").

### Phase 3: Rest of software engineering

Remaining system design, data structures and algorithms, databases, networking, languages, DevOps, and so on.

## Working process

- Content is written with web research. Only verified links go in.
- Implementation may be handed to a separate, stronger-model agent.
- Models: the project default in `.claude/settings.json` is `claude-sonnet-5-5` (planning, research, content, docs). Code implementation is delegated to the `coder` subagent (`.claude/agents/coder.md`), which uses `claude-opus-5-5`. Running `claude --model opus` overrides the default for a whole session.
- Before implementation starts, add industry-accepted Claude skills to the project (see "Skills" below).

## Skills

Project skills live in `.claude/skills/` (`content-authoring`, `case-study-sources`, `persistence-idb`, `mobile-first-ui`).

Plugin skills to be installed before implementation starts.

- `ponytail` (DietrichGebert/ponytail): keeps generated code minimal. Install with `/plugin marketplace add DietrichGebert/ponytail` and then `/plugin install ponytail@ponytail`. Note that it may not self-activate, so invoke it explicitly or via its hooks.
- Others: to be decided with the owner.

## Open items

- Choose a final practice-site list (default: LeetCode, NeetCode).
- Confirm the list of additional skills.
- Choose the model/agent for implementation.
- Confirm the hybrid routing design (real path for top-level topics, hash for deeper nodes) before the navigation milestone.
