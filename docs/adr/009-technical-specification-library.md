# ADR-009: Technical Specification Library (TSL)

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has Feature Specs (FS-NNN, 30 sections, product-facing) for intake. Engineering lacked a focused **implementation contract** with API types, events, caching, and test-to-AC mapping that ensures different engineers build the same solution.

## Decision

Create `docs/technical-spec-library/` with:

1. **TSL-TEMPLATE.md** — 11-section engineering contract template
2. **TSL-NNN** specs paired with **FS-NNN** for Tier 1–3 features
3. **TSL-001** exemplar — Jimvio AI Production Integration (pairs with FS-001)

**Workflow:** FS approved → TSL approved → implementation.

## Consequences

### Positive impacts
- Unambiguous API contracts and acceptance criteria
- QA can trace tests to AC-IDs
- Security review has dedicated section

### Trade-offs
- Two documents per feature (FS + TSL) — intentional separation of product vs engineering concerns

## Related Documents

- `docs/feature-specs/` (FS-NNN)
- `docs/technical-spec-library/` (TSL-NNN)
- Operating Model tier gates
