# Jimvio Ten Commandments v1.0

**Immutable implementation laws · July 2026**

> Jimvio is a global **Creator Commerce Operating System**.  
> Every implementation **MUST** obey these laws.  
> No exception. No shortcut. No "just this once."

**Detailed guidance:** [Platform Standards](../platform-standards/) · **Process:** [JPOS](../product-operating-system/) · **Completion checklist:** [Platform Standards § Completion](../platform-standards/JIMVIO-PLATFORM-STANDARDS-v1.0.md#completion-checklist)

---

## How to use this document

| When | Action |
|------|--------|
| **Before coding** | Read applicable commandments for your task |
| **During review** | Verify each commandment; block merge on violation |
| **AI agents** | Treat as hard constraints — never override without explicit human approval |
| **Tier 1 work** | All ten commandments mandatory with documented verification |

---

# COMMANDMENT 1 — PROTECT THE PLATFORM

**Never break working functionality. Never introduce regressions. Never rewrite stable systems without explicit approval.**

## Rules

| Rule | Detail |
|------|--------|
| **No regressions** | Existing user flows must work after your change |
| **Protected domains** | Auth, payments, checkout, orders — Tier 1 lifecycle; Founder approval for structural changes |
| **No silent rewrites** | Stable subsystems are modified only with ADR + explicit approval |
| **Verify before ship** | `tsc`, affected flow smoke test, adjacent feature check |
| **Rollback ready** | Tier 1–3 changes ship with documented rollback |

## Anti-patterns (forbidden)

- Refactoring checkout "while you're in there"
- Changing payment finalization without TSL approval
- Removing error handling to "simplify"
- Force-pushing fixes that skip review on Tier 1 paths

## Verification

- [ ] Affected existing flows manually verified
- [ ] No changes to protected domains without approval
- [ ] Type-check passes

*Maps to: Platform Standards §3 Stable Before Fast · Product Bible Platform Law: "Do not break what works"*

---

# COMMANDMENT 2 — ONE ECOSYSTEM

**Jimvio is ONE platform. Marketplace, Creator, Affiliate, UGC, Communities, Courses, Wallet, AI, Messaging, and Orders must always feel connected.**

## Rules

| Surface | Must connect to |
|---------|-----------------|
| Any new page | Navigation (Super App, Command Center, or contextual rail) |
| Any transaction | Wallet, notifications, order history |
| Any creator action | Creator Hub, profile, or earnings context |
| Any AI surface | Route/entity context for Copilot |
| Any community action | Hub workspace, membership tier |

## Platform shells (reuse always)

| Shell | Purpose |
|-------|---------|
| **Super App Dock** | Global module navigation |
| **Command Center (⌘K)** | Universal search and navigation |
| **AI Copilot** | Contextual assistance |
| **Jimvio OS / Workspace** | Dashboard experience |
| **Design System (`Ds*`)** | One visual language |

## Anti-patterns (forbidden)

- Standalone page with no link to wallet, orders, or next action
- Feature that ignores role context (seller tool on buyer-only surface)
- Third button/card/input implementation outside Design System
- Module that does not emit analytics events or notifications where expected

## Verification

- [ ] Feature accessible from established navigation path
- [ ] Cross-module links documented (Commerce Graph, notifications, wallet where relevant)
- [ ] Uses Design System — no one-off visual language

*Maps to: Platform Standards §1 One Platform · JPOS Principle 1 · Product Bible: "Connection"*

---

# COMMANDMENT 3 — REUSE EVERYTHING

**Search before creating. Reuse components, hooks, services, utilities, types, patterns, animations, and icons.**

## Search first

| Asset type | Where to look |
|------------|---------------|
| Components | `@/components/design-system`, `@/components/ui`, domain folders |
| Hooks | `@/hooks`, feature hook directories |
| Services | `@/services`, `@/lib/actions`, `@/lib/*` |
| Utilities | `@/lib/utils`, domain helpers |
| Types | `@/types`, domain `types.ts` |
| Patterns | Similar pages, existing API routes, server actions |
| Animations | Design System motion tokens (150–220ms, GPU-only) |
| Icons | Lucide — consistent sizing |

## Rules

| Rule | Detail |
|------|--------|
| **Extend, don't duplicate** | Wrap or compose existing primitives |
| **One source of truth** | No duplicate hooks, services, or components for the same capability |
| **Facade patterns** | `notify-user.ts`, `finalize-order-payment.ts`, wallet RPC — use single entry points |
| **Document new abstractions** | Only create shared utilities when used or clearly reusable |

## Anti-patterns (forbidden)

- New `Button.tsx` when `DsButton` exists
- Copy-paste of `lib/actions/*` logic into a new file
- Direct `notifications` table insert instead of `notify-user.ts`
- New payment finalization path

## Verification

- [ ] Codebase searched before new files created
- [ ] Existing primitives used or extended with justification in PR
- [ ] No duplicate functionality introduced

*Maps to: Platform Standards §2 Reuse Before Create · Product Bible Platform Law: "Everything reusable"*

---

# COMMANDMENT 4 — MINIMAL CHANGE

**Solve problems with the smallest safe implementation. Never touch unrelated code.**

## Rules

| Rule | Detail |
|------|--------|
| **Minimum diff** | Change only files required for the task |
| **No drive-by refactors** | Refactoring is a separate task with its own PR |
| **Reversible** | Prefer additive changes over destructive rewrites |
| **Scope boundary** | PRD/FS scope is the scope — no "while I'm here" |
| **Incremental evolution** | Strangler pattern over big-bang migration |

## Anti-patterns (forbidden)

- Formatting entire files unrelated to the fix
- Renaming variables across modules in a feature PR
- Deleting "unused" code without verification
- Combining feature + refactor + dependency upgrade in one PR

## Verification

- [ ] PR diff is focused on stated problem
- [ ] No unrelated file changes (or explicitly separated commits/PRs)
- [ ] Additive architecture pattern followed ([ADR-002](../adr/002-additive-platform-modules.md))

*Maps to: Platform Standards §4 Incremental Evolution · Engineering Constitution: "Small safe changes"*

---

# COMMANDMENT 5 — PERFORMANCE IS A FEATURE

**Every implementation should improve — or at minimum preserve — Core Web Vitals, bundle size, rendering, scrolling, and interaction speed.**

## Targets

| Metric | Target |
|--------|--------|
| **LCP** | < 2.5s p75; no regression > 100ms |
| **INP** | < 200ms |
| **CLS** | < 0.1 |
| **Bundle** | Lazy load modules > 20KB client; dynamic `import()` for heavy deps |
| **Rendering** | Server Components default; client only when needed |
| **Scrolling** | Virtualize long lists; no layout thrashing |
| **Interaction** | Optimistic UI where safe; skeleton loading — never blank screens |

## Rules

| Rule | Detail |
|------|--------|
| **Images** | Next.js `Image`, Cloudinary transforms, lazy below fold |
| **Motion** | GPU transforms only; `prefers-reduced-motion` respected |
| **Data fetching** | No N+1; paginate lists; server-side aggregation |
| **Client state** | Zustand for UI only; business data in Postgres |

## Anti-patterns (forbidden)

- Importing heavy libraries at page root without dynamic import
- Client component for static content
- Unbounded queries (`SELECT *` without limit)
- Blocking render on client-side data waterfall

## Verification

- [ ] No unnecessary client bundle additions
- [ ] Loading states prevent layout shift
- [ ] Speed Insights checked on affected pages (when available)

*Maps to: Platform Standards §5 Performance by Default · Product Bible Platform Law: "Performance required"*

---

# COMMANDMENT 6 — ACCESSIBILITY IS REQUIRED

**Every feature supports keyboard navigation, screen readers, focus states, reduced motion, and color contrast.**

## Requirements

| Requirement | Standard |
|-------------|----------|
| **Keyboard** | All interactive elements reachable and operable |
| **Screen readers** | Semantic HTML; `aria-*` where needed; labels on all inputs |
| **Focus** | Visible focus ring (`ds-focus-ring`); logical tab order |
| **Reduced motion** | Honor `prefers-reduced-motion`; no essential info in motion only |
| **Color contrast** | WCAG 2.2 AA — 4.5:1 text, 3:1 UI components |
| **Touch targets** | Minimum 44×44px on mobile |
| **States** | Errors associated with fields; loading announced or visible |

## Anti-patterns (forbidden)

- `div` with `onClick` instead of `button`
- Color as sole state indicator
- Removing focus outlines without replacement
- Auto-playing motion without reduced-motion fallback

## Verification

- [ ] Keyboard-only navigation tested
- [ ] Focus visible on all interactive elements
- [ ] PRD §13 / QA checklist §32 accessibility items pass

*Maps to: Platform Standards §6 Accessibility by Default · JPOS Quality §3*

---

# COMMANDMENT 7 — AI SHOULD FEEL NATIVE

**AI should assist. Never interrupt. Never replace user decisions. Always explain recommendations.**

## Rules

| Rule | Detail |
|------|--------|
| **Assist only** | AI recommends; user approves all actions |
| **Never interrupt** | Copilot available; never blocks core flows |
| **No financial autonomy** | AI never initiates payment, refund, payout, or wallet mutation |
| **Explain recommendations** | Opportunity Engine and Copilot cite *why* |
| **Graceful degradation** | Feature works fully when AI unavailable |
| **No PII to LLM** | Email, phone, payment details never sent to external models |
| **Bounded tools** | Allowlist only — no arbitrary database access |
| **Context, not coupling** | Business logic independent of LLM provider |

## Anti-patterns (forbidden)

- Auto-checkout via AI
- AI-generated prices applied without user confirmation
- Blocking page load until AI responds
- Generic chatbot with no platform context

## Verification

- [ ] Core flow works with AI disabled
- [ ] No AI call in Tier 1 critical path
- [ ] Recommendations include human-readable rationale

*Maps to: Platform Standards §8 AI Ready · [Domain Architecture — AI](../domain-architecture/) · [FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md)*

---

# COMMANDMENT 8 — EVERY SCREEN MUST CREATE VALUE

**No dead ends. Every page should naturally guide users toward another valuable action.**

## Rules

| Rule | Detail |
|------|--------|
| **Primary CTA** | One clear primary action per screen |
| **Secondary paths** | Related modules linked (product → creator → community) |
| **Empty states** | `DsEmptyState` with actionable CTA — never blank |
| **Error states** | Recovery path — retry, support, or navigation |
| **Success states** | Confirm + surface next step (view order, share link, continue shopping) |
| **Progressive disclosure** | Advanced options hidden until needed |

## Value chain examples

| Screen | Natural next actions |
|--------|---------------------|
| Product detail | Add to cart · View creator · Related products (Commerce Graph) |
| Order confirmation | Track order · Continue shopping · Join community |
| Creator profile | Follow · Shop products · Join UGC campaign |
| Empty cart | Browse marketplace · View deals |
| Wallet | Request payout · View earnings breakdown · Explore opportunities |

## Anti-patterns (forbidden)

- "Success" toast with no next step on high-stakes action
- Terminal page with no navigation back to platform
- Empty list with no explanation or CTA
- Modal that traps user without dismiss or action

## Verification

- [ ] All four states defined: loading, empty, error, success
- [ ] At least one meaningful next action on every screen
- [ ] PRD §11, §22–25 complete

*Maps to: Product Bible Platform Law: "No dead ends" · JPOS Quality §1 User Value*

---

# COMMANDMENT 9 — EVERY FEATURE MUST SCALE

**Design for 1K → 10K → 100K → 1M → 10M → 100M users.**

## Scale checkpoints

| Users | Architectural expectations |
|-------|---------------------------|
| **1K** | Correct logic; basic indexes |
| **10K** | Pagination; no unbounded queries |
| **100K** | Caching hot paths; connection pooling awareness |
| **1M** | Read replicas; event bus consideration; CDN for media |
| **10M** | Service extraction candidates; warehouse for analytics |
| **100M** | Domain microservices; multi-region; OLAP |

## Rules (apply now)

| Rule | Detail |
|------|--------|
| **Paginate** | All lists — cursor or offset with limit |
| **Index** | Query patterns have database indexes |
| **Stateless server** | No in-memory session state for business logic |
| **Idempotency** | Payments, webhooks, wallet mutations — idempotent |
| **Rate limit** | Public APIs and AI endpoints rate-limited |
| **Domain boundaries** | [Domain Architecture](../domain-architecture/) — no hidden coupling |
| **Media** | Cloudinary transforms; never serve raw uploads |

## Anti-patterns (forbidden)

- Loading entire table into memory
- Client-side filter of thousands of records
- Synchronous fan-out to N users in request path
- Storing large blobs in Postgres

## Verification

- [ ] List endpoints paginated
- [ ] No N+1 queries in new code paths
- [ ] FS/TSL notes scale assumptions for Tier 1–2

*Maps to: Platform Standards § scalability · [System Architecture Part 7](../system-architecture/) · Product Bible: "Scale for millions"*

---

# COMMANDMENT 10 — LEAVE THE PLATFORM BETTER

**Every implementation should leave Jimvio cleaner, safer, faster, more maintainable, more reusable, and more scalable.**

## The improvement test

Before marking work complete, ask:

| Question | Must be true |
|----------|--------------|
| Is the codebase **cleaner** than before? | No dead code, no new duplication |
| Is it **safer**? | Auth enforced, inputs validated, no secret exposure |
| Is it **faster**? | No performance regression |
| Is it **more maintainable**? | Clear types, domain ownership, minimal complexity |
| Is it **more reusable**? | New code is composable, not one-off |
| Is it **more scalable**? | Pagination, indexes, bounded queries |

## Rules

| Rule | Detail |
|------|--------|
| **No new debt without ticket** | Tech debt introduced → `tech-debt` issue filed |
| **Update docs** | PRD/FS/module docs when behavior changes |
| **Type safety** | Strict TypeScript; no new `any` |
| **Remove don't accumulate** | Delete unused imports, flags, and files after migration |

## Anti-patterns (forbidden)

- "We'll clean it up later" without a tracked issue
- Copy-paste leaving two diverging implementations
- Commented-out code committed
- `console.log` left in production paths

## Verification

- [ ] [Platform Standards Completion Checklist](../platform-standards/JIMVIO-PLATFORM-STANDARDS-v1.0.md#completion-checklist) passed
- [ ] Reviewer confirms net improvement, not net complexity

*Maps to: Product Bible Platform Law: "Every commit improves platform" · Platform Standards §10 Maintainability*

---

# THE FINAL RULE

**If there are multiple solutions, choose the one that:**

| Priority | Criterion |
|:--------:|-----------|
| 1 | **Improves user experience** |
| 2 | **Protects the platform** |
| 3 | **Minimizes complexity** |
| 4 | **Preserves existing functionality** |
| 5 | **Supports long-term evolution** |

> **Never sacrifice long-term quality for short-term convenience.**

When two options tie, prefer the **more reversible** option.

When still uncertain, **classify tier up** and follow [JPOS](../product-operating-system/) lifecycle.

---

## Commandment quick reference

| # | Commandment | One line |
|---|-------------|----------|
| 1 | Protect the Platform | No regressions; no unapproved rewrites |
| 2 | One Ecosystem | Everything connected — one product feel |
| 3 | Reuse Everything | Search first; never duplicate |
| 4 | Minimal Change | Smallest safe diff only |
| 5 | Performance Is a Feature | CWV, bundle, speed preserved or improved |
| 6 | Accessibility Is Required | Keyboard, SR, focus, motion, contrast |
| 7 | AI Should Feel Native | Assist; explain; never auto-act on money |
| 8 | Every Screen Must Create Value | No dead ends; always a next action |
| 9 | Every Feature Must Scale | Design for millions from day one |
| 10 | Leave the Platform Better | Cleaner, safer, faster, more maintainable |

---

## Mapping to Platform Laws (Product Bible)

| Platform Law | Commandment |
|--------------|-------------|
| Do not break what works | 1 — Protect the Platform |
| Everything reusable | 3 — Reuse Everything |
| One source of truth | 3 — Reuse Everything |
| One system language | 2 — One Ecosystem |
| Full async UX | 8 — Every Screen Must Create Value |
| Scale for millions | 9 — Every Feature Must Scale |
| Performance required | 5 — Performance Is a Feature |
| AI feels native | 7 — AI Should Feel Native |
| No dead ends | 8 — Every Screen Must Create Value |
| Every commit improves platform | 10 — Leave the Platform Better |

---

## Governance hierarchy

```
Product Strategy v10 → Product Bible
        ↓
Ten Commandments (immutable laws) ← YOU ARE HERE
        ↓
Platform Standards (detailed how + checklist)
        ↓
JPOS → PRD → FS → TSL → Code
```

---

**Jimvio Ten Commandments v1.0** — *Immutable. Non-negotiable. Every implementation.*

*End of document*
