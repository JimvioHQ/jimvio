# ADR-012: Product Requirements Document (PRD) Standard v1.0

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has Feature Specifications (FS-NNN, 30 sections) for engineering intake and Technical Specifications (TSL-NNN) for implementation contracts. Product, Design, Leadership, and QA lacked a dedicated **product requirements standard** that captures executive context, separated NFR sections (UX, UI, accessibility, performance, security, privacy), and production UI states before engineering translation.

## Problem Statement

Without a PRD standard:

- Product intent is buried in engineering specs
- Leadership cannot review features at executive level
- UX, UI, and accessibility requirements are inconsistently separated
- QA lacks a product-authored checklist distinct from engineering test strategy
- Ambiguity persists between Product, Design, Engineering, QA, AI, and Leadership

## Decision

Establish `docs/prd/` with:

1. **README.md** — index, workflow, relationship to FS/TSL
2. **JIMVIO-PRD-STANDARD-v1.0.md** — governance, quality bar, tier requirements
3. **PRD-TEMPLATE.md** — 33 required sections

**Document stack:**

```
Product Decision Framework → PRD-NNN (approved) → FS-NNN → TSL-NNN (Tier 1–2) → Implementation
```

Every **major feature** (Tier 1–3, new capabilities, protected domains, cross-domain work) requires an approved PRD before implementation. FS and TSL remain engineering artifacts derived from or paired with the PRD.

**PRD vs FS:**

| PRD | FS |
|-----|-----|
| Product, Design, Leadership, QA | Engineering, Security, QA |
| 33 sections incl. executive summary, background, separate NFRs | 30 sections incl. API/DB deps, test strategy |
| Product source of truth | Engineering source of truth |

## Consequences

### Positive impacts

- Eliminates ambiguity across six disciplines
- Executive summary enables leadership review without reading engineering specs
- All production states (loading, error, empty, success) required before code
- QA checklist product-authored and testable
- Clear handoff: PRD → FS → TSL → code

### Trade-offs

- Additional documentation upfront for major features
- PRD and FS must be kept in sync when scope changes
- Lightweight features (Tier 4–5, bug fixes) may use FS-only per Operating Model shortcuts

### Future improvements

- PRD-001 exemplar paired with FS-001 (Jimvio AI)
- PRD lint tool / Cursor rule for section completeness
- Automated PRD → FS section mapping guide

## Related Documents

- `docs/prd/README.md`
- `docs/prd/JIMVIO-PRD-STANDARD-v1.0.md`
- `docs/prd/PRD-TEMPLATE.md`
- [ADR-005](./005-feature-specification-framework.md) — Feature Specification Framework
- [ADR-009](./009-technical-specification-library.md) — Technical Specification Library
- [Operating Model](../operating-model/JIMVIO-PRODUCT-OPERATING-MODEL-v1.0.md)

## Related ADRs

- [ADR-005](./005-feature-specification-framework.md)
- [ADR-006](./006-product-operating-model-v1.md)
- [ADR-009](./009-technical-specification-library.md)
- [ADR-011](./011-platform-standards-v1.md)
