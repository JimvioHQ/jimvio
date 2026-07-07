# ADR-004: Technical Architecture Blueprint v1.0

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has a Product Blueprint (ADR-003) describing *what* the platform does. Engineering lacked a single document describing *how* the system is built — stack, boundaries, API standards, database, security, deployment, and scale path.

## Problem Statement

How do we onboard engineers, guide architectural decisions, and plan scale without a canonical technical reference?

## Decision

Create `docs/technical-architecture/JIMVIO-TECHNICAL-ARCHITECTURE-BLUEPRINT-v1.0.md` with 11 parts covering principles through scalability roadmap. Ground in actual codebase (Next.js 16, Supabase, Vercel, additive modules).

**Key architectural truths documented:**
- Monolith-first Next.js App Router (not premature microservices)
- Supabase as sole database access (Prisma inactive)
- Server Actions + REST API boundary
- Additive module pattern with lazy loaders
- Protected domains (payments, auth, checkout)

## Consequences

### Positive impacts
- Engineering onboarding without tribal knowledge
- Scale decisions evidence-based (Part 11 tiers)
- Gaps explicitly documented (no CI, no tests, in-memory rate limits)

### Trade-offs
- Manual sync with codebase required
- Does not replace ADRs for individual decisions

## Related Documents

- `docs/technical-architecture/README.md`
- `docs/product-blueprint/JIMVIO-PRODUCT-BLUEPRINT-v1.0.md`
- ADR-001, ADR-002, ADR-003
