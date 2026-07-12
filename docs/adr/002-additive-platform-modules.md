# ADR-002: Additive Platform Modules

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio is evolving from a marketplace into a **Creator Commerce Operating System** — commerce graph, business graph, AI copilot, command center, workspace, Jimvio OS, and Super App dock. Each capability must feel like one product (North Star) without rewriting stable subsystems.

## Problem Statement

How do we ship major new platform capabilities (AI, graphs, OS shell, personalization) without breaking payments, checkout, routing, APIs, or existing dashboard/marketplace flows?

## Constraints

- Never modify auth, payments, orders, checkout, routing, database, or APIs unless explicitly requested
- Features must be reusable across marketplace, communities, creator profile, and dashboard
- Performance: no blocking global mounts; lazy load heavy UI
- State: avoid duplicated global state; prefer existing Zustand patterns
- Mobile-first, accessible, production-ready

## Options Considered

### Option A — Monolithic dashboard/marketplace rewrite

**Pros:**
- Single integrated codebase per surface
- No loader indirection

**Cons:**
- Massive regression surface
- Blocks parallel product work
- Violates minimal-change and platform protection rules
- Months of risk for marginal immediate user value

### Option B — Additive modules with lazy global loaders

**Pros:**
- `lib/<feature>/` + `components/<feature>/` pattern — clear boundaries
- Integrate at known anchor points (`app/layout.tsx`, `app/dashboard/layout.tsx`, product/creator/community pages)
- `requestIdleCallback` + dynamic `import()` — no main-thread block
- Existing features preserved alongside new rails (e.g. Commerce Graph beside existing product detail)
- Each module independently testable and removable

**Cons:**
- More files and integration points to document
- Multiple global loaders (Copilot, Command Center, Super App, OS) require coordination
- Risk of UX overlap if not governed by product principles (AI must assist, not interrupt)

### Option C — Micro-frontends

**Pros:**
- Hard isolation between teams

**Cons:**
- Operational complexity disproportionate to team size
- Bundle duplication; slower shared navigation feel
- Conflicts with "one platform" product principle

## Decision

**Option B — Additive platform modules** is accepted.

**Module pattern:**

```
lib/<module>/           # types, config, builders, adapters
components/<module>/    # UI, rails, panels, cards
lib/store/use-*-store.ts  # UI state + localStorage where needed
*Loader.tsx             # dynamic import + idle callback mount
```

**Integration pattern:**

- Global shells: `app/layout.tsx` (Copilot, Command Center, Super App)
- Dashboard shell: `app/dashboard/layout.tsx` (Jimvio OS overlay)
- Contextual rails: product detail, creator profile, community detail (Commerce Graph, Business Graph)
- Dashboard widgets: Workspace, Creator Command Center, Opportunity Engine on `app/dashboard/page.tsx`

**State pattern:** Zustand stores for UI layout/preferences only; no duplication of server/business state.

**Loader pattern:** defer non-critical UI until browser idle; preserve SSR/hydration safety.

## Consequences

### Positive impacts

- Platform capabilities ship incrementally with isolated blast radius
- Existing marketplace, checkout, and orders untouched
- Reusable graphs and AI surfaces across entity types
- Aligns with JPES, Execution Protocol, and Platform Laws

### Trade-offs

- Integration map must be maintained (see Implementation Notes)
- Engineers must search for existing modules before creating new ones
- Global loaders need keyboard shortcut governance (⌘K vs ⌘.)

### Future improvements

- Unified platform shell registry to coordinate OS, Super App, and Command Center z-index/focus
- Shared `build*Graph()` adapter conventions documented per entity type
- Feature flags for gradual rollout of graph rails and AI panels

## Implementation Notes

| Module | Lib | Components | Mount point |
|--------|-----|------------|-------------|
| AI Copilot | `lib/ai/copilot/` | `components/copilot/` | `app/layout.tsx` |
| Command Center | `lib/command-center/` | `components/command-center/` | `app/layout.tsx` |
| Super App | `lib/jimvio-super-app/` | `components/jimvio-super-app/` | `app/layout.tsx` |
| Jimvio OS | `lib/jimvio-os/` | `components/jimvio-os/` | `app/dashboard/layout.tsx` |
| Workspace | `lib/jimvio-workspace/` | `components/jimvio-workspace/` | `app/dashboard/page.tsx` |
| Creator Command Center | `lib/creator-command-center/` | `components/creator-command-center/` | `app/dashboard/page.tsx` |
| Opportunity Engine | `lib/opportunity-engine/` | `components/opportunity-engine/` | `app/dashboard/page.tsx` |
| Commerce Graph | `lib/commerce-graph/` | `components/commerce-graph/` | Product, creator, community pages |
| Business Graph | `lib/business-graph/` | `components/business-graph/` | Product, creator, community pages |
| Design System | `lib/design-system/` | `components/design-system/` | New features (incremental) |

## Related Modules

- All modules above; `app/layout.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`
- [ADR-001: Design System foundation](./001-design-system-foundation.md)

## Related ADRs

- [ADR-001: Design System foundation](./001-design-system-foundation.md)
