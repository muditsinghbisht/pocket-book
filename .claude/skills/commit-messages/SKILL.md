---
name: commit-messages
description: Use whenever writing, suggesting or reviewing a git commit message for PocketBook. Enforces the project format - a one-line typed title, a blank line, then short high-level bullet points.
---

# Commit messages

## Format

```
<type>: <one-line summary of the change>

- <high-level change>
- <high-level change>
- <high-level change>
```

## Rules

- **Title**: one line, starts with a type and a colon, imperative mood, lowercase after the colon, no trailing period, about 72 characters or fewer. It states the single main change.
- **Blank line**: exactly one empty line between the title and the bullets.
- **Bullets**: a short list (usually 2-6) of high-level changes. Each is one line and starts with `- `. They name what was added, changed or removed, not how or why. No paragraphs, no file-by-file lists, no code.
- **One commit, one purpose**: if the staged changes mix unrelated concerns, suggest splitting them into separate commits, each with its own message.
- **Scope is optional**: `feat(quiz): ...` is allowed when it helps, but keep the type first.
- **Trailer**: when Claude creates the commit, the attribution trailer required by the session (`Co-Authored-By: ...`) goes after one more blank line at the very end. Do not add any other prose after the bullets.
- Describe the staged diff only. Run `git diff --cached` first and never claim changes that are not in it.
- Never commit or push unless the user asks. Suggesting a message is not permission to commit.

## Types

| Type       | Use for                                                       |
| ---------- | ------------------------------------------------------------- |
| `feat`     | A new user-visible feature or new curated content             |
| `fix`      | A bug fix                                                     |
| `content`  | Lessons, questions, flashcards, quizzes, cheat-sheets, cases  |
| `docs`     | README, requirements and other documentation only             |
| `style`    | Formatting or visual styling with no behavior change          |
| `refactor` | Code restructuring with no behavior change                    |
| `perf`     | Performance improvements                                      |
| `test`     | Adding or fixing tests only                                   |
| `build`    | Build pipeline, bundler, dependencies, package.json           |
| `ci`       | GitHub workflows and deployment pipeline                      |
| `chore`    | Housekeeping: renames, ignore files, licenses, tooling config |
| `revert`   | Reverting an earlier commit                                   |

When a commit fits two types, pick the one that describes the main intent.

## Examples

```
ci: add GitHub workflow to deploy to S3 and CloudFront

- Run lint, typecheck, tests and build on pull requests and pushes
- Deploy dist/ to S3 on pushes to main using GitHub OIDC
- Set long-lived cache headers on assets and no-cache on pages and sw.js
- Invalidate the CloudFront cache after upload
- Add deployment guide with S3, CloudFront, IAM and DNS steps
```

```
content: add distributed caches chapter

- Add five lessons on sharding, replication, Redis and Memcached, and operations
- Add questions, flashcards and a cheat-sheet for the chapter
```

```
fix: stop theme flash on first paint

- Apply the saved theme from an inline script before React loads
- Fall back to the system theme when storage is blocked
```
