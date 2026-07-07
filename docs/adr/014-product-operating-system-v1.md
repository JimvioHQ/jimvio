# ADR-014: Product Operating System (JPOS) v1.0

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio accumulated product governance across the Product Bible (strategic truth), Operating Model (tactical lifecycle), PRD Standard, Platform Standards, BCM, and Domain Architecture. Leadership lacked a single **Product Operating System** document that unifies philosophy, lifecycle, governance, quality, prioritization, portfolio strategy, KPIs, and continuous improvement — suitable for founders, executives, and investors.

## Problem Statement

Without JPOS:

- Product decisions lack a unified decision framework beyond ad hoc prioritization
- Philosophy, lifecycle, and governance are scattered across documents
- Portfolio investment is implicit, not strategic
- KPI hierarchy is not connected to North Star in one operating view
- Executives cannot onboard from one product governance document

## Decision

Create `docs/product-operating-system/JIMVIO-PRODUCT-OPERATING-SYSTEM-v1.0.md` as the **official Product Operating System** with eight parts:

1. Product Philosophy (mission, vision, North Star, principles, values, decision framework, success definition)
2. Product Lifecycle (Idea → Research → Validation → RFC → PRD → Specification → UX → Architecture → Engineering → QA → Release → Monitoring → Iteration)
3. Product Governance (approval authorities for features, architecture, security, accessibility, performance, release)
4. Product Quality (eight dimensions: user value, business value, accessibility, performance, security, scalability, maintainability, DX)
5. Product Decision Matrix (eight scoring dimensions with thresholds)
6. Product Portfolio (Commerce, Creator Economy, AI, Growth, Platform, Operations, Enterprise)
7. Product KPIs (growth, revenue, retention, activation, creator/seller/buyer success, stability)
8. Continuous Improvement (feedback, analytics, A/B testing, experimentation, tech debt, quarterly/annual planning)

**Relationship to existing docs:**

| Document | Role |
|----------|------|
| **JPOS** | Strategic product OS — how decisions are made |
| [Operating Model](../operating-model/) | Tactical companion — tiers, RACI, release mechanics |
| [Product Bible](../product-bible/) | Permanent executive truth — not duplicated |

JPOS references Product Bible for full strategic narrative rather than duplicating it.

## Consequences

### Positive impacts

- Single executive document for product governance
- Decision Matrix enables consistent prioritization
- Portfolio model guides quarterly capacity allocation
- KPI hierarchy connects to North Star
- Clear lifecycle with Validation stage before PRD

### Trade-offs

- Overlap with Operating Model Parts 1, 4, 6, 7 — mitigated by JPOS = strategic, Operating Model = tactical detail
- Two documents to maintain — cross-linked; quarterly review syncs both

### Future improvements

- Decision Matrix scoring tool in backlog
- Portfolio dashboard tied to KPIs
- JPOS onboarding checklist for new PMs

## Related ADRs

- [ADR-006](./006-product-operating-model-v1.md) — Operating Model
- [ADR-008](./008-product-bible-v1.md) — Product Bible
- [ADR-012](./012-prd-standard-v1.md) — PRD Standard
- [ADR-013](./013-business-capability-model-v1.md) — BCM
