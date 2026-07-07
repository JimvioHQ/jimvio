# ADR-003: Product Blueprint v1.0

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has grown across 20+ product modules with extensive governance documents (North Star, Platform Laws, Quality Gate, JPES) but no single **product reference** for engineering, design, product, and leadership.

## Problem Statement

How do we align all teams on what Jimvio is, who it serves, and how modules connect — without rewriting code or breaking production?

## Constraints

- Document only; no implementation changes
- Must reflect actual codebase (routes, roles, services)
- Must cover all 20 platform modules with consistent structure
- Must document 11 user roles with permissions
- Must align with Design System and additive architecture ADRs

## Options Considered

### Option A — Wiki / Notion external doc

**Pros:** Easy editing for non-engineers
**Cons:** Drifts from codebase; not version-controlled with code

### Option B — In-repo `docs/product-blueprint/` with per-module files

**Pros:** Version-controlled; reviewable in PRs; lives beside ADRs and DS docs
**Cons:** Requires discipline to keep updated

### Option C — Auto-generated from code

**Pros:** Always in sync
**Cons:** Loses product intent, journeys, KPIs, roadmap; high build cost

## Decision

**Option B** — `docs/product-blueprint/` with README index, platform overview, user roles, and 20 module blueprints. Each module follows the 13-section template.

## Consequences

### Positive impacts

- Single source of truth for product development
- Onboarding accelerator for new team members
- Feature requests can be validated against blueprint + Product Decision Framework
- Implementation status (✅/🟡/🔜) sets honest expectations

### Trade-offs

- Manual updates required when modules ship
- Must be updated alongside ADRs for major changes

### Future improvements

- Quarterly blueprint review cadence
- Link module blueprints to ADRs and DS components
- v1.1 additions: Support role, Stripe live, messaging completion
- Master doc: `docs/product-blueprint/JIMVIO-PRODUCT-BLUEPRINT-v1.0.md`

## Implementation Notes

- Entry: `docs/product-blueprint/README.md`
- 13 sections per module: Purpose, Target Users, Core Features, User Journeys, Permissions, AI Opportunities, Notifications, Analytics, KPIs, Future Roadmap, Dependencies, Security, Accessibility

## Related Modules

All 20 platform modules documented in `docs/product-blueprint/modules/`

## Related ADRs

- [ADR-001: Design System foundation](./001-design-system-foundation.md)
- [ADR-002: Additive platform modules](./002-additive-platform-modules.md)
