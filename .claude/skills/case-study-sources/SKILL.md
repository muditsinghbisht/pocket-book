---
name: case-study-sources
description: Use when writing case studies or outages, or adding any external link, paper, blog, talk or YouTube source to Study Assistant content. Enforces the case study template and the rule that only verified links are included.
---

# Case studies and sources

## Template

Every case study follows this order:

1. Context
2. What happened
3. Root cause
4. Fix
5. Lessons
6. Sources (link + gist for each)

## Source rules

- Only include links confirmed to exist. Confirm by actually fetching or searching for the page, not from memory.
- Never invent a paper, title, author, date, quote or URL. If you cannot confirm it, leave it out.
- Source types: papers, engineering blogs, conference talks, YouTube.
- Each source has a link and a short gist. If the gist could not be verified against the source itself, mark it clearly as unverified (for example `gist: "(unverified) ..."`).
- Prefer primary sources (the company's own postmortem or paper) over secondary summaries.
- For protocol or spec content (for example MCP in Phase 2), base it on the official specification.

## Verification workflow

1. Search the web for the incident or paper.
2. Open the page and confirm the title, author or organization and that the claims match.
3. Record the URL exactly as confirmed.
4. If a claim in the lesson comes from a source, make sure the source is listed.
5. In your final report, list which links were verified and which gists were not.

## Example of a known reference (verify before use)

Facebook's "Scaling Memcache" paper is named in the requirements as a Caching reference. Still confirm the link before adding it.
