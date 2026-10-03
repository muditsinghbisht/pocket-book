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

|                             | Hit       | Miss                                   |
| --------------------------- | --------- | -------------------------------------- |
| Where the answer comes from | The cache | The database, then the cache is filled |
| Relative cost               | Cheap     | Lookup plus the full database cost     |
| Effect on the cache         | None      | A new entry is stored                  |

```mermaid
sequenceDiagram
  participant App
  participant Cache
  participant DB
  App->>Cache: get key
  alt hit
    Cache-->>App: value
  else miss
    Cache-->>App: nothing
    App->>DB: read key
    DB-->>App: value
    App->>Cache: set key
  end
```

```mermaid
stateDiagram-v2
  [*] --> Absent
  Absent --> Fresh: filled after a miss
  Fresh --> Fresh: hit
  Fresh --> Expired: TTL elapses
  Expired --> Fresh: refilled after a miss
  Fresh --> Absent: evicted or invalidated
```

> **Key idea:** A cache is a copy, not the truth. It trades some freshness for speed, so every entry needs a way to expire or be replaced.

This placeholder lesson only exists to exercise the build pipeline.
