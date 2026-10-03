---
title: What a cache is and why it exists
order: 1
---

# What a cache is and why it exists

A cache keeps a copy of data closer to where it is needed, so repeated reads
are faster and cheaper than going back to the source of truth.

```mermaid
flowchart LR
  App -->|1. get| Cache
  Cache -->|2. miss| DB[(Database)]
  DB -->|3. value| App
  App -->|4. set| Cache
```

This placeholder lesson only exists to exercise the build pipeline.
