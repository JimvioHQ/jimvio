# ADR-010: Domain Architecture v1.0 — DDD Business Boundaries

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has a System Architecture Blueprint (24 technical modules, events, scale) and a Technical Architecture Blueprint (implementation stack). Product and engineering teams needed a **business-domain view** aligned with Domain-Driven Design — defining bounded contexts, entity ownership, and communication contracts independent of folder structure.

## Problem Statement

Without explicit domain boundaries:

- Features drift across modules with duplicate logic
- Payment, notification, and wallet side effects bypass single entry points
- New engineers cannot determine which domain owns a table, API, or event
- Service extraction at scale lacks a migration map

## Constraints

- Must align with existing codebase reality (Supabase, modular monolith)
- Must not duplicate System Architecture event catalog — complement it
- Eight core domains as mandated by platform governance
- Documentation only — no implementation changes in this ADR

## Options Considered

### Option A: Fold domain boundaries into System Architecture only

**Pros:** Single document; less maintenance.

**Cons:** Mixes business DDD view with infrastructure/scale concerns; harder for product and security audiences.

### Option B: Separate Domain Architecture document (DDD)

**Pros:** Clear business boundaries; entity ownership table; audience-specific; complements System Architecture.

**Cons:** Two architecture docs require cross-linking discipline.

## Decision

Create `docs/domain-architecture/JIMVIO-DOMAIN-ARCHITECTURE-v1.0.md` as the **official DDD business boundary reference** with eight core domains:

1. Identity
2. Commerce
3. Payments
4. Creator Economy
5. AI
6. Social
7. Analytics
8. Administration

Each domain documents: purpose, business responsibility, owned data, public APIs, events produced/consumed, dependencies, security rules, permissions, and future expansion.

**Relationship to System Architecture:**

| Document | View |
|----------|------|
| **Domain Architecture** | Business boundaries, DDD, entity ownership |
| **System Architecture** | Technical modules, infrastructure, scale, DR |

## Consequences

### Positive impacts

- Single source for "who owns what" disputes
- Enforces single-entry patterns (`notify-user`, `finalize-order-payment`, wallet RPC)
- Provides bounded-context map for future service extraction
- Onboarding clarity for product, security, and engineering

### Trade-offs

- `community_messages` has split ownership (Creator Economy content / Social delivery) — documented with v2 migration path
- Behavioral event tables have write/read split (source domain writes, Analytics reports) until warehouse ETL

### Future improvements

- Event bus + outbox at 1M+ users (referenced in System Architecture)
- Resolve `community_messages` under Social with Creator Economy content API
- Subdomain extraction (Tax, Discounts, Activity Feed) as bounded contexts mature

## Implementation Notes

- No code changes required for ADR acceptance
- New features must assign domain ownership before FS/TSL authoring
- Quarterly architecture review should reconcile Domain Architecture with System Architecture event catalog

## Related Modules

- `lib/payments/` — Payments domain
- `lib/actions/checkout.ts`, `lib/actions/marketplace.ts` — Commerce domain
- `lib/notifications/notify-user.ts` — Social facade
- `lib/ugc/`, `lib/community/`, `lib/commerce-graph/` — Creator Economy domain
- `lib/ai/` — AI domain

## Related ADRs

- [ADR-007](./007-system-architecture-blueprint-v1.md) — System Architecture Blueprint
- [ADR-004](./004-technical-architecture-blueprint-v1.md) — Technical Architecture Blueprint
- [ADR-008](./008-product-bible-v1.md) — Product Bible
