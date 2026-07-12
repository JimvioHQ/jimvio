# ADR-013: Business Capability Model v1.0

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has Domain Architecture (who owns implementation), Product Blueprint (module specs), and System Architecture (technical modules). Leadership, product portfolio planning, and enterprise architecture lacked a **technology-independent view** of what the platform must always be able to do — stable across stack changes and organizational evolution.

## Problem Statement

Without a Business Capability Model:

- Features cannot be mapped to stable business abilities
- Roadmap planning is tied to implementation modules, not business value
- Ownership disputes arise between product-facing capabilities (Affiliate, UGC, Communities) and domain boundaries
- AI investment cannot be planned per capability without coupling risk
- Executive leadership lacks a portfolio-level view

## Decision

Create `docs/business-capability-model/JIMVIO-BUSINESS-CAPABILITY-MODEL-v1.0.md` with:

1. **14 Level 1 capabilities** — Identity, Commerce, Payments, Creator Economy, Communities, Affiliate, UGC, AI, Messaging, Search, Analytics, Workspace, Administration, Platform Services
2. **87 Level 2 sub-capabilities** — detailed business functions per L1
3. **Level 3 specifications** — purpose, business value, primary users, dependencies, future expansion for every L2
4. **Ownership matrix** — each L2 maps to one primary owner domain from Domain Architecture
5. **AI opportunities** — per L1 capability with coupling rules

**Relationship to Domain Architecture:**

| Document | Question |
|----------|----------|
| **Business Capability Model** | What must the business always do? |
| **Domain Architecture** | Who owns the code, data, and APIs? |

BCM L1 capabilities may span multiple domains at L2 (e.g., Search split across Commerce, AI, Creator Economy). Domain Architecture remains the implementation authority.

## Consequences

### Positive impacts

- Executive portfolio view independent of technology
- Every PRD can declare capability IDs (e.g., `COM.4 Checkout`)
- Roadmap maturity tracking by capability
- AI investment mapped without transaction coupling
- Clear handoff from business planning to domain implementation

### Trade-offs

- 14 L1 vs 8 domains requires mapping discipline
- Communities, Affiliate, UGC are L1 capabilities but Creator Economy domain owns implementation
- Platform Services is cross-cutting — governed by Administration, not a DDD domain
- BCM must be updated when new business abilities emerge (not every feature)

### Future improvements

- Capability maturity dashboard (Emerging → Leading)
- PRD template field for capability IDs
- BCM → domain automated lint in CI

## Related Documents

- `docs/business-capability-model/README.md`
- `docs/business-capability-model/JIMVIO-BUSINESS-CAPABILITY-MODEL-v1.0.md`
- [ADR-010](./010-domain-architecture-v1.md) — Domain Architecture
- [ADR-012](./012-prd-standard-v1.md) — PRD Standard

## Related ADRs

- [ADR-007](./007-system-architecture-blueprint-v1.md)
- [ADR-010](./010-domain-architecture-v1.md)
- [ADR-012](./012-prd-standard-v1.md)
