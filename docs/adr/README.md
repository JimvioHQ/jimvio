# Jimvio Architecture Decision Records (ADR)

Document **why** major platform decisions exist — not only what was built.

## When to create an ADR

Create or update an ADR when a change affects:

- Architecture, navigation, authentication, payments, database
- API boundaries, state management, Design System
- AI integration, performance strategy, security, deployment, scalability

## Status values

| Status | Meaning |
|--------|---------|
| **Proposed** | Under review; not yet implemented |
| **Accepted** | Implemented and active |
| **Deprecated** | No longer recommended; still may exist in code |
| **Superseded** | Replaced by a newer ADR |

## Template

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded

## Context

## Problem Statement

## Constraints

## Options Considered

### Option A
**Pros:** …
**Cons:** …

### Option B
**Pros:** …
**Cons:** …

## Decision

Why this option was selected.

## Consequences

### Positive impacts
- …

### Trade-offs
- …

### Future improvements
- …

## Implementation Notes

## Related Modules

## Related ADRs
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](./001-design-system-foundation.md) | Design System foundation (`lib/design-system` + `Ds*`) | Accepted |
| [002](./002-additive-platform-modules.md) | Additive platform modules (OS, graphs, copilot) | Accepted |
| [003](./003-product-blueprint-v1.md) | Product Blueprint v1.0 as official product reference | Accepted |
| [004](./004-technical-architecture-blueprint-v1.md) | Technical Architecture Blueprint v1.0 as engineering reference | Accepted |
| [005](./005-feature-specification-framework.md) | Feature Specification Framework (30-section template) | Accepted |
| [006](./006-product-operating-model-v1.md) | Product Operating Model v1.0 — how we build and ship | Accepted |
| [007](./007-system-architecture-blueprint-v1.md) | System Architecture Blueprint v1.0 — domains, events, scale | Accepted |
| [008](./008-product-bible-v1.md) | Product Bible v1.0 — permanent executive source of truth | Accepted |
| [009](./009-technical-specification-library.md) | Technical Specification Library (TSL) — engineering contracts | Accepted |
| [010](./010-domain-architecture-v1.md) | Domain Architecture v1.0 — DDD business boundaries | Accepted |
| [011](./011-platform-standards-v1.md) | Platform Standards v1.0 — implementation governance | Accepted |
| [012](./012-prd-standard-v1.md) | PRD Standard v1.0 — product requirements (33 sections) | Accepted |
| [013](./013-business-capability-model-v1.md) | Business Capability Model v1.0 — technology-independent capabilities | Accepted |
| [014](./014-product-operating-system-v1.md) | Product Operating System (JPOS) v1.0 — product decision governance | Accepted |
| [015](./015-product-strategy-v10.md) | Product Strategy v10 — decade horizon, market, growth, AI | Accepted |
| [016](./016-ten-commandments-v1.md) | Ten Commandments v1.0 — immutable implementation laws | Accepted |

## Decision rules

Prefer solutions that are **simple**, **maintainable**, **scalable**, **reusable**, **observable**, and **secure**. Document every trade-off.
