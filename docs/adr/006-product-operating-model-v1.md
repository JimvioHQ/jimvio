# ADR-006: Product Operating Model v1.0

**Status:** Accepted

**Date:** 2026-07-07

## Context

Jimvio accumulated governance documents (North Star, Platform Laws, Quality Gate, JPES, Blueprints, Feature Specs) but lacked a single **operating manual** defining how ideas become production features and how teams collaborate.

## Problem Statement

How do we scale product development across engineering, design, product, and AI contributors without losing stability, review rigor, or speed?

## Decision

Create `docs/operating-model/JIMVIO-PRODUCT-OPERATING-MODEL-v1.0.md` with seven parts:

1. Product Lifecycle (idea → iteration)
2. Team Responsibilities (RACI)
3. Feature Tiers (T1–T5 with approval requirements)
4. Review Gates (8 blocking gates)
5. Release Strategy (alpha → global + rollback)
6. Success Metrics (quality + business)
7. Continuous Improvement (feedback loops)

The operating model **references** existing docs rather than duplicating Platform Laws, Quality Gate, etc.

## Consequences

### Positive impacts
- Onboarding for all contributors including AI assistants
- Tier-based rigor — critical paths get full lifecycle
- Clear release and rollback discipline

### Trade-offs
- Process overhead for small changes — mitigated by Tier 4–5 shortcuts
- Requires discipline to maintain cadence meetings

## Related Documents

- `docs/operating-model/README.md`
- Product Blueprint, Technical Architecture, Feature Specs, ADRs
