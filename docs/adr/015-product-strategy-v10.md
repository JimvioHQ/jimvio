# ADR-015: Product Strategy v10

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has strategic truth in the Product Bible (v1.0), operational governance in JPOS, and capability mapping in BCM. Founders, investors, and executive leadership lacked a single **decade-horizon product strategy** document answering why Jimvio exists, who it serves, where it is going, and how it will win — with market analysis, competitive positioning, growth strategy, AI strategy, evolution roadmap, metrics, and risks.

## Problem Statement

Without Product Strategy v10:

- Long-term direction is implicit across multiple documents
- Investors and board lack one strategic narrative
- Portfolio investment lacks strategic framing beyond JPOS tactical allocation
- Competitive positioning and defensibility are not documented in one place
- Decade roadmap (Y1, Y2, Y3, Y5, Y10) is scattered

## Decision

Create `docs/product-strategy/JIMVIO-PRODUCT-STRATEGY-v10.md` with ten parts:

1. Company Purpose (vision, mission, purpose, beliefs, 10-year ambition)
2. Market Analysis (segments, competitors, trends)
3. Strategic Positioning (uniqueness, advantages, differentiators, defensibility)
4. Product Portfolio (Commerce, Creator Economy, AI, Communities, Enterprise, Developer Platform)
5. Growth Strategy (acquisition, retention, monetization, international)
6. AI Strategy (commerce, creators, communities, search, analytics, automation, support)
7. Platform Evolution (Year 1, 2, 3, 5, 10)
8. Success Metrics (North Star, platform, creator, seller, engineering KPIs)
9. Risks (business, technical, regulatory, competitive, AI, operational)
10. Executive Summary

**Version numbering:** v10 signals maturity of strategic thinking — distinct from Product Bible v1.0 (permanent truth) and JPOS v1.0 (operating system).

**Relationship:**

| Document | Horizon | Focus |
|----------|---------|-------|
| **Product Strategy v10** | 10 years | Why, who, where, how we win |
| Product Bible v1.0 | Permanent | Values, modules, governance truth |
| JPOS v1.0 | Ongoing | How decisions are made |

Strategy references Bible rather than duplicating values and module detail.

## Consequences

### Positive impacts

- Single investor and board-ready strategic document
- Decade roadmap with clear Y1/Y2/Y3/Y5/Y10 milestones
- Competitive white space articulated
- AI strategy aligned with Domain Architecture constraints
- Risk register for executive planning

### Trade-offs

- Overlap with Product Bible Parts 1, 10 and JPOS Parts 6–7 — mitigated by distinct horizons and audiences
- Strategy requires annual review to stay current
- v10 vs v1.0 versioning may confuse — README clarifies roles

### Future improvements

- Annual strategy refresh (v11, v12…)
- Market sizing with primary research
- Competitive intelligence dashboard

## Related ADRs

- [ADR-008](./008-product-bible-v1.md)
- [ADR-014](./014-product-operating-system-v1.md)
- [ADR-013](./013-business-capability-model-v1.md)
