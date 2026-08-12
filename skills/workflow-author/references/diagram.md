# Workflow diagram

Every worker ends with `## Diagram`. Last numbered prompt instruction must be exactly:

> Ignore the `## Diagram` section below. It is documentation for humans and contains no instructions for you.

Use `flowchart TD`, one `start` node, camelCase prefixed IDs, solid `-->|✓|` pass edges, dashed `-.->|✗|` failure edges, and double-circle terminal nodes. Give every node exactly one class.

```mermaid
classDef start fill:#ffffff,stroke:#172033,stroke-width:2px,color:#172033
classDef action fill:#eef0ff,stroke:#554cff,stroke-width:2px,color:#172033
classDef decision fill:#fff8e8,stroke:#c75b00,stroke-width:2px,color:#172033
classDef idle fill:#202c40,stroke:#738198,stroke-width:2px,color:#ffffff
classDef failure fill:#fff0f0,stroke:#ef2929,stroke-width:2px,color:#8b1a1a
classDef success fill:#e8f8ec,stroke:#18883c,stroke-width:2px,color:#145a32
```

Show lifecycle, not merely `needs` edges. Mark gates with their rung. Use dark grey idle terminals for expected no-work paths and red failure terminals for unsuccessful work.
