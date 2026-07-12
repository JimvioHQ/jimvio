# Jimvio Platform Standards v1.0

**Official implementation governance · July 2026**

> Every feature, component, API, service, workflow, and UI element must follow these standards.  
> **Immutable laws:** [Ten Commandments](../ten-commandments/) — non-negotiable floor for every implementation.  
> Every completed task should leave Jimvio **cleaner, safer, more maintainable, and more scalable** than before.

**Companion:** [Product Bible Part 5](../product-bible/JIMVIO-PRODUCT-BIBLE-v1.0.md) · [Operating Model](../operating-model/) · [Domain Architecture](../domain-architecture/)

---

## Table of contents

1. [Mission](#mission)
2. [Platform Principles](#platform-principles)
3. [Change Review](#change-review)
4. [Completion Checklist](#completion-checklist)
5. [Relationship to Other Governance](#relationship-to-other-governance)

---

## Mission

Protect the long-term integrity of the Jimvio platform.

Jimvio evolves as a **world-class Creator Commerce Operating System**. Every implementation must improve platform quality without introducing regressions or technical debt.

---

## Platform Principles

### 1. One Platform

Jimvio must feel like **one connected ecosystem**.

| Rule | Detail |
|------|--------|
| No isolated experiences | Features connect to navigation, notifications, analytics, and AI context |
| Shared surfaces | Reuse Super App dock, Command Center, Copilot, Workspace patterns |
| Consistent language | Design System tokens and `Ds*` components everywhere |
| Cross-domain awareness | Respect [Domain Architecture](../domain-architecture/) boundaries |

**Anti-pattern:** A feature that works only on one page with no hooks into platform services.

---

### 2. Reuse Before Create

Always search for existing assets before building new ones.

| Search first | Locations |
|--------------|-----------|
| Components | `@/components/design-system`, `@/components/ui`, domain components |
| Hooks | `@/hooks`, feature-specific hook folders |
| Services | `@/services`, `@/lib/actions`, `@/lib/*` domain modules |
| Utilities | `@/lib/utils`, `@/lib/*` helpers |
| Types | `@/types`, domain `types.ts` files |
| Patterns | Similar pages, existing API routes, server actions |

**Rule:** Never duplicate functionality. Extend or compose existing primitives.

**Before creating:** Grep the codebase. Check [Product Blueprint modules](../product-blueprint/) for existing capability.

---

### 3. Stable Before Fast

Never trade stability for speed of development.

| Requirement | Detail |
|-------------|--------|
| Production quality | Every change must preserve working features |
| Protected domains | Auth, payments, checkout, orders — Tier 1 lifecycle required |
| Minimum scope | Smallest correct diff; no drive-by refactors |
| Reversible changes | Prefer incremental evolution over large rewrites |
| Verification | `tsc`, lint, manual regression on affected flows |

**Anti-pattern:** Shipping fast by skipping error states, bypassing auth checks, or weakening payment finalization.

---

### 4. Incremental Evolution

Prefer small, reversible improvements. Avoid large rewrites.

| Approach | When |
|----------|------|
| Additive modules | New capability as new `lib/` or `components/` module (ADR-002) |
| Wrap, don't replace | Design System wraps existing primitives |
| Feature flags | `platform_settings` for gradual rollout |
| Strangler pattern | Migrate legacy UI page-by-page, not all-at-once |

**Rule:** If a rewrite is necessary, document in an ADR with rollback plan.

---

### 5. Performance by Default

Every new feature should **maintain or improve** platform performance.

| Metric | Target |
|--------|--------|
| Core Web Vitals | LCP < 2.5s · INP < 200ms · CLS < 0.1 |
| Bundle size | No unnecessary client imports; dynamic import heavy modules |
| Rendering | Server Components default; client only when needed |
| Interaction | Optimistic UI where safe; skeleton loading states |
| Images | Next.js `Image`, Cloudinary transforms, lazy load below fold |
| Motion | GPU-only transforms; `prefers-reduced-motion` respected |

*Reference: [Technical Architecture](../technical-architecture/) · Vercel Analytics / Speed Insights*

---

### 6. Accessibility by Default

Every feature must be usable by everyone.

| Requirement | Detail |
|-------------|--------|
| Keyboard support | All interactive elements reachable and operable via keyboard |
| Screen readers | Semantic HTML, `aria-*` where needed, meaningful labels |
| Focus visibility | Visible focus rings; logical tab order |
| Reduced motion | Honor `prefers-reduced-motion`; no essential info in motion only |
| Color contrast | WCAG AA minimum (4.5:1 text, 3:1 large text/UI) |
| States | Loading, error, empty announced or visible — not silent failures |

*Reference: [Design System](../design-system/README.md) · [Product Bible Part 6](../product-bible/JIMVIO-PRODUCT-BIBLE-v1.0.md)*

---

### 7. Security by Design

Protect platform trust. Never weaken security.

| Surface | Rules |
|---------|-------|
| **Authentication** | Session via Supabase; middleware refresh; no credential storage in app tables |
| **Authorization** | Server-side role checks; `requireAdmin`, `requireVendorOwnerOrAdmin`; RLS |
| **Sensitive data** | No PII to LLM; no secrets in client; env vars server-only |
| **Payments** | Single finalization path; webhook signature verification; idempotency |
| **Uploads** | Validated types/sizes; Cloudinary signed uploads; no arbitrary file execution |
| **Admin** | `admin` role required; elevated ops audited; 2FA recommended |

*Reference: [Domain Architecture — Security Rules](../domain-architecture/) · [System Architecture Part 6](../system-architecture/)*

---

### 8. AI Ready

Every major feature should expose **extension points** for future AI without coupling business logic to AI implementations.

| Pattern | Detail |
|---------|--------|
| Context injection | Pages expose route/entity context for Copilot |
| Read-only tools | AI reads via documented APIs — never direct DB |
| No AI in critical path | Checkout, payments, auth never depend on LLM availability |
| Provider abstraction | `lib/ai/` adapters; business logic unaware of Gemini vs OpenAI |
| Graceful degradation | AI unavailable → friendly message; core feature still works |

*Reference: [FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md) · [Domain Architecture — AI Domain](../domain-architecture/)*

---

### 9. Observability

Every critical workflow should be **monitorable**.

| Layer | Practice |
|-------|----------|
| **Logs** | Structured server logs for payment, webhook, auth failures |
| **Metrics** | Vercel Analytics, Speed Insights; domain KPIs via Analytics |
| **Alerts** | Payment webhook failures, cron job failures, error rate spikes |
| **Audit** | `webhook_events`, `order_status_history`, admin actions (expanding) |
| **Debuggability** | Correlation via order ID, transaction ID, user ID in logs |

*Reference: [System Architecture Part 8](../system-architecture/) · `ai_usage_logs` (planned)*

**Rule:** If a workflow cannot be diagnosed in production, it is not production-ready.

---

### 10. Maintainability

Every change should **reduce complexity** whenever possible.

| Practice | Detail |
|----------|--------|
| Clear ownership | One domain per feature ([Domain Architecture](../domain-architecture/)) |
| Type safety | Strict TypeScript; no `any`; shared types in `@/types` |
| Self-documenting code | Names over comments; comments only for non-obvious logic |
| No dead code | Remove unused imports, files, and feature flags after migration |
| Consistent patterns | Match surrounding code style, imports, and abstractions |
| Documentation | Update FS/TSL, module docs, ADRs when architecture changes |

**Rule:** Leave the codebase easier to understand than you found it.

---

## Change Review

Before implementing any change, complete this review:

```
┌─────────────────────────────────────────────────────────┐
│                    CHANGE REVIEW                        │
├─────────────────────────────────────────────────────────┤
│ 1. Understand the problem                               │
│    What user/business need? What is broken or missing?  │
│                                                         │
│ 2. Identify reusable assets                             │
│    Components, hooks, services, patterns already exist? │
│                                                         │
│ 3. Evaluate risks                                       │
│    Protected domain? Payment/auth impact? Regression?   │
│                                                         │
│ 4. Minimize scope                                       │
│    Smallest change that solves the problem completely   │
│                                                         │
│ 5. Preserve compatibility                               │
│    Existing APIs, URLs, data, and UX still work         │
└─────────────────────────────────────────────────────────┘
```

### Tier awareness

| Tier | Examples | Required before ship |
|------|----------|---------------------|
| **T1** | Auth, payments, checkout, orders | FS + TSL + Founder sign-off |
| **T2** | Products, wallet, admin ops | FS + TSL |
| **T3** | Copilot, UGC, communities, AI | FS recommended |
| **T4** | Analytics, UI polish, docs | Lightweight review |

*Full process: [Operating Model](../operating-model/JIMVIO-PRODUCT-OPERATING-MODEL-v1.0.md)*

---

## Completion Checklist

Before considering work **complete**, verify every item:

| # | Gate | Verification |
|---|------|--------------|
| ✓ | **No regressions** | Affected existing flows still work |
| ✓ | **Existing functionality preserved** | No breaking changes to protected domains |
| ✓ | **Type-safe** | `tsc` passes; no new `any` |
| ✓ | **Responsive** | Works 320px → desktop; mobile-first |
| ✓ | **Accessible** | Keyboard, SR, focus, contrast, reduced motion |
| ✓ | **Secure** | Auth enforced; input validated; no secret exposure |
| ✓ | **Performant** | No bundle bloat; CWV not degraded |
| ✓ | **Reusable** | Uses/extends existing primitives; no duplication |
| ✓ | **Production-ready** | Loading, success, error, empty, retry states |

### Automated checks (minimum)

```bash
npx tsc --noEmit
# lint (when configured)
# manual test of affected user flows
```

### Documentation updates (when applicable)

- [ ] Module doc in `docs/product-blueprint/modules/`
- [ ] FS/TSL for Tier 1–2 features
- [ ] ADR for architectural decisions
- [ ] Domain Architecture if ownership changes

---

## Relationship to Other Governance

| Document | Scope | This document |
|----------|-------|---------------|
| [Product Bible](../product-bible/) | *Why* and *what* — executive truth | References; does not duplicate |
| [Product Blueprint](../product-blueprint/) | Product specification per module | Module context before building |
| [Domain Architecture](../domain-architecture/) | Business boundaries (DDD) | Assign feature to domain |
| [System Architecture](../system-architecture/) | Technical modules, events, scale | Communication patterns |
| [Technical Architecture](../technical-architecture/) | Stack, APIs, patterns | Implementation how-to |
| [Operating Model](../operating-model/) | Lifecycle, tiers, release | Process gates |
| [Design System](../design-system/) | UI tokens and components | Visual standards |
| [PRDs / Feature Specs / TSL](../prd/) | Per-feature contracts | PRD → FS → TSL before implementation |
| [ADRs](../adr/) | Decision records | Why choices were made |

### Governance hierarchy

```
Product Bible (permanent truth)
    ↓
Platform Standards (this) — HOW to implement safely
    ↓
Domain Architecture — WHERE features belong
    ↓
FS / TSL — WHAT to build for each feature
    ↓
Code
```

---

## Enforcement

| Role | Responsibility |
|------|----------------|
| **Implementer** | Follow Change Review + Completion Checklist |
| **Reviewer** | Verify checklist before merge |
| **Architect** | Resolve domain ownership disputes |
| **QA** | Regression and AC validation |

**Non-negotiable:** Principles 3 (Stable), 7 (Security), and Completion Checklist items for Tier 1 domains.

---

**Jimvio Platform Standards v1.0** — *Cleaner. Safer. More maintainable. More scalable.*

*End of document*
