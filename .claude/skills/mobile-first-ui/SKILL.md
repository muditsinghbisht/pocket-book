---
name: mobile-first-ui
description: Use when building or changing any Study Assistant UI (layout, navigation, flashcards, quizzes, hints and solutions, notes, diagrams, tables, print styles). Enforces mobile-first, touch-friendly, responsive behavior.
---

# Mobile-first UI

Touch interaction is a requirement, not an extra. Design for phone first, then scale up to tablet and desktop. Check all three breakpoints.

## Layout and navigation

- Nested topic tree: slide-out drawer or bottom sheet on mobile, persistent sidebar on desktop.
- Bottom navigation for the main sections on mobile.
- Touch-friendly targets (aim for at least 44x44 CSS px) with enough spacing.

## Features

- Flashcards: swipe to move between cards, tap to flip. Keyboard shortcuts on desktop.
- Quizzes: large tap targets for options, one question per screen on mobile.
- Hints and solutions: tap to reveal, hidden by default. Code blocks scroll horizontally instead of overflowing the viewport.
- Diagrams (Mermaid) and tables stay readable on small screens: scroll or zoom, never clipped.
- Notes editor, export and import work on mobile browsers.

## Print

- Print stylesheets for cheat-sheets and flashcards. Hide navigation and controls when printing.

## Checklist before finishing a UI change

- Works at roughly 360px, 768px and 1280px widths with no horizontal page scroll.
- Everything important is reachable by touch alone (no hover-only behavior).
- Keyboard and focus states exist for desktop.
- Print preview still looks right if the change touches cheat-sheets or flashcards.
- Run the project's lint, typecheck and build commands once they exist.
