# ADR-001: Design System Foundation

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has grown across marketplace, communities, affiliate, UGC, courses, dashboard, and AI surfaces. `components/ui/*` evolved organically with variant sprawl (e.g. multiple button styles). New features risk inconsistent spacing, typography, motion, and accessibility.

The North Star requires **one connected product** with **one design language**. Platform Laws require **one source of truth** and **no breaking changes**.

## Problem Statement

How do we standardize UI for all current and future Jimvio features without rewriting working pages, duplicating logic, or introducing regressions?

## Constraints

- Do not modify existing pages in bulk
- Do not change routing, APIs, auth, payments, checkout, or business logic
- Do not break `components/ui/*` consumers
- Must be strongly typed, accessible, responsive, and performance-conscious
- Must support incremental adoption over years

## Options Considered

### Option A — Migrate all pages to refactored `components/ui/*`

**Pros:**
- Single component folder
- No parallel naming (`Button` vs `DsButton`)

**Cons:**
- High regression risk across hundreds of files
- Forces visual changes on stable production pages
- Violates minimal-change and do-not-break principles
- Long freeze window; blocks product velocity

### Option B — Additive Design System layer (`lib/design-system` + `components/design-system`)

**Pros:**
- Zero impact on existing pages until intentionally migrated
- Tokens defined once (TS + CSS vars)
- New features import from one canonical entry point
- Can wrap proven primitives (Dialog, DropdownMenu, Sonner) where they exist
- Tree-shakeable; lazy adoption per screen

**Cons:**
- Temporary coexistence of `ui/*` and `Ds*` during transition
- Some parallel implementations (e.g. `DsButton` vs `Button`) until migration completes
- Requires discipline: new work uses DS; no third button variant

### Option C — External design system package (Storybook-only)

**Pros:**
- Clean separation from app code

**Cons:**
- Extra publish/sync overhead for a single product
- Slower iteration; poor fit for monorepo velocity
- Still requires in-app migration eventually

## Decision

**Option B — Additive Design System layer** is accepted.

Structure:

- `lib/design-system/` — tokens, breakpoints, motion, z-index, forms, icons
- `styles/jimvio-design-system.css` — extended CSS variables and GPU motion utilities
- `components/design-system/` — `Ds*` components (separate from `components/ui/*`)
- `docs/design-system/README.md` — usage documentation

**Reuse strategy:** wrap existing battle-tested implementations where possible (`DsDialog`, `DsMenu`, `DsToaster` re-export/wrap `components/ui` and Sonner). Implement new standardized variants only where the DS spec adds value (`DsButton` variant map, form field states, card elevations).

**Adoption rule:** new features import `@/components/design-system`. Legacy screens migrate one at a time; never bulk-replace.

## Consequences

### Positive impacts

- Single token source for colors, spacing, radius, elevation, motion, z-index
- Production-ready reusable primitives with loading, empty, and error states
- Platform Laws satisfied: isolated change, no production regressions
- Foundation for 10+ year consistency as Jimvio scales

### Trade-offs

- Two UI entry points exist during transition (`ui/*` and `Ds*`)
- Engineers must follow anti-duplication rule: no third implementations
- Full visual unification deferred until per-screen migration

### Future improvements

- Migrate high-traffic surfaces (dashboard, marketplace browse) to `Ds*` incrementally
- Replace root `Toaster` with `DsToaster` when convenient (styling already aligned)
- Add Storybook or visual regression tests for `Ds*` components
- Consolidate `DsButton` with `Button` once variant maps are unified (separate ADR if attempted)

## Implementation Notes

- Import: `import { DsButton } from "@/components/design-system"`
- Tokens: `import { dsSpacing, dsBreakpoints } from "@/lib/design-system"`
- Globals: `@import "./jimvio-design-system.css"` in `styles/globals.css` (additive)
- Verification: `tsc --noEmit` clean; no page integrations required at launch

## Related Modules

- `components/ui/*` — legacy primitives (preserved)
- `styles/globals.css` — base `--color-*` tokens
- Jimvio OS, Super App, Copilot — consumers of shared visual language (future)

## Related ADRs

- [ADR-002: Additive platform modules](./002-additive-platform-modules.md)
