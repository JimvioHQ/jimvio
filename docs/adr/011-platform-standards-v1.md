# ADR-011: Platform Standards v1.0 — Implementation Governance

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has executive governance (Product Bible), process governance (Operating Model), and architectural governance (Domain Architecture, System Architecture). Engineering lacked a single **implementation-time reference** consolidating the ten platform principles, change review protocol, and completion checklist that every engineer, designer, and AI agent must follow before and after shipping work.

## Problem Statement

Without explicit implementation standards:

- Features ship as isolated experiences disconnected from platform services
- Duplication grows when reuse is not enforced at implementation time
- Stability is traded for speed, especially in protected domains
- Completion criteria vary by implementer — inconsistent quality gates

## Decision

Create `docs/platform-standards/JIMVIO-PLATFORM-STANDARDS-v1.0.md` as the **official implementation governance document** with:

1. Ten platform principles (One Platform, Reuse Before Create, Stable Before Fast, Incremental Evolution, Performance, Accessibility, Security, AI Ready, Observability, Maintainability)
2. Change Review protocol (understand → reuse → risk → scope → compatibility)
3. Completion Checklist (9 verification gates before work is done)

**Relationship to existing docs:**

| Document | Role |
|----------|------|
| Product Bible | Executive truth — *why* and *what* |
| **Platform Standards** | Implementation governance — *how to build safely* |
| Operating Model | Lifecycle and release process |
| Domain Architecture | Business boundaries |

Platform Standards **references** Product Bible Platform Laws and Engineering Constitution rather than duplicating them.

## Consequences

### Positive impacts

- Single checklist for every implementation task
- AI agents and engineers share identical completion criteria
- Explicit anti-patterns for protected domains
- Bridges product vision and code-level discipline

### Trade-offs

- Another governance doc to maintain — mitigated by referencing, not duplicating, Product Bible content
- Checklist overhead for small changes — Tier 4 work uses lightweight review per Operating Model

### Future improvements

- CI enforcement of checklist items (tsc, lint, a11y audit)
- Automated bundle size regression checks
- Platform Standards linter rules in Cursor rules

## Related ADRs

- [ADR-008](./008-product-bible-v1.md) — Product Bible
- [ADR-006](./006-product-operating-model-v1.md) — Operating Model
- [ADR-010](./010-domain-architecture-v1.md) — Domain Architecture
- [ADR-001](./001-design-system-foundation.md) — Design System
