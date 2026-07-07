# ADR-016: Ten Commandments v1.0 — Immutable Implementation Laws

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio has Platform Laws in the Product Bible, Platform Standards (10 principles with checklists), and JPOS (product process). Engineers, designers, and AI agents needed a single **memorable, non-negotiable** set of implementation laws — short enough to internalize, authoritative enough to block violations in review.

## Problem Statement

Without codified immutable laws:

- Platform Standards are comprehensive but long for daily reference
- "Platform Laws" in Product Bible lack operational detail and verification steps
- AI agents and new contributors lack a hard-constraint document
- Review debates recur on settled principles (regressions, reuse, minimal change)

## Decision

Establish `docs/ten-commandments/JIMVIO-TEN-COMMANDMENTS-v1.0.md` as the **immutable implementation laws** for Jimvio:

1. Protect the Platform
2. One Ecosystem
3. Reuse Everything
4. Minimal Change
5. Performance Is a Feature
6. Accessibility Is Required
7. AI Should Feel Native
8. Every Screen Must Create Value
9. Every Feature Must Scale
10. Leave the Platform Better

Plus **Final Rule** — decision priority when multiple solutions exist.

**Relationship:**

| Document | Role |
|----------|------|
| **Ten Commandments** | Immutable laws — non-negotiable |
| [Platform Standards](../platform-standards/) | Detailed how-to, change review, completion checklist |
| Product Bible Platform Laws | Strategic summary — maps 1:1 to Commandments |

Ten Commandments do not replace Platform Standards — they are the **hard floor** Platform Standards elaborate.

## Consequences

### Positive impacts

- Single reference for code review blocking criteria
- AI agents treat as hard constraints
- Maps cleanly to existing Platform Laws (no semantic drift)
- Memorable "10 laws" culture artifact

### Trade-offs

- Overlap with Platform Standards principles — mitigated by hierarchy (laws vs detail)
- Another governance doc — kept concise; links to Platform Standards for depth

### Future improvements

- Cursor rule referencing Ten Commandments
- PR template checkbox for applicable commandments
- Pre-commit hook messaging

## Related ADRs

- [ADR-011](./011-platform-standards-v1.md) — Platform Standards
- [ADR-001](./001-design-system-foundation.md) — Design System
- [ADR-002](./002-additive-platform-modules.md) — Additive modules
