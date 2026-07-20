# Jimvio Product Growth Roadmap
**90-day plan · CPO + CGO · Post-launch mode**

> Status: Platform is **feature-complete for public launch**.  
> Mode: **Growth, reliability, user success** — not new platform modules.  
> Rule: Every change must move **one named KPI**. No redesign of Community, Marketplace, Live Studio, or Creator Economy.

---

## North-star outcomes (90 days)

| KPI | Baseline (Day 0) | Day 30 | Day 60 | Day 90 |
|-----|------------------|--------|--------|--------|
| Activation rate (signup → key action in 24h) | Measure | +25% vs baseline | +40% | +60% |
| D1 / D7 / D30 retention | Measure | D1 ≥25% | D7 ≥18% | D30 ≥12% |
| WAU / MAU engagement ratio | Measure | ≥0.30 | ≥0.35 | ≥0.40 |
| Creator revenue (platform) | Measure | +15% | +30% | +50% |
| Marketplace GMV | Measure | +10% | +25% | +40% |
| Communities created / week | Measure | +20% | +35% | +50% |
| NPS | Soft launch survey | ≥20 | ≥30 | ≥40 |
| Support tickets / 1k MAU | Measure | −10% | −20% | −25% |

**Key activation action (v1 definition):**  
User completes ≥1 of: join community · create post · send chat message · publish/join live · list/buy product · complete creator/vendor checklist step 1.

---

## Principles

1. **Extend, don’t redesign** — wrap existing surfaces with onboarding, nudges, ranking, and measurement.
2. **One KPI per change** — name the KPI in the PR/commit message.
3. **Instrument before optimizing** — if we can’t measure it, we don’t ship “improvements.”
4. **Ship weekly** — small milestones, commit per milestone, verify, then continue.
5. **Creators first** — monetization and retention prioritize creator success; marketplace GMV follows.

---

## Sprint map (Days 0–90)

```
Days 0–14   Sprint 1  ACTIVATION
Days 15–28  Sprint 2  RETENTION
Days 29–42  Sprint 3  ENGAGEMENT
Days 43–56  Sprint 4  MONETIZATION
Days 57–70  Sprint 5  OBSERVABILITY
Days 71–84  Sprint 6  EXPERIMENTATION
Days 85–90  Hardening, NPS baseline, growth review
```

---

## Sprint 1 — Activation (Days 0–14)
**KPI:** Activation rate · Time-to-value &lt; 5 minutes

### Weekly milestones

| Week | Milestone | Deliverable | KPI |
|------|-----------|-------------|-----|
| W1 | M1.1 Welcome flow | Post-login welcome that routes by intent (browse / create / sell / join) | Activation rate |
| W1 | M1.2 Progress tracker | Persistent checklist widget + `user_onboarding` state | Checklist completion % |
| W2 | M1.3 Role checklists | Creator / Vendor / Community checklists (extend activate flows) | Role activation rate |
| W2 | M1.4 Empty states + samples | Actionable empty states + sample content CTAs on feed/chat/live/library | Empty → action CTR |
| W2 | M1.5 Interactive tips | Lightweight coach marks / first-run tips (dismissible, flagged) | Tip → action rate |

### Success criteria
- ≥70% of new users see welcome within first session
- ≥40% complete ≥3 checklist items in 24h
- Median time to first key action ≤ 5 minutes

---

## Sprint 2 — Retention (Days 15–28)
**KPI:** D1 / D7 / D30

| Week | Milestone | Deliverable | KPI |
|------|-----------|-------------|-----|
| W3 | M2.1 Notification prefs | Email/push preference center (extend existing notifications) | Pref opt-in rate |
| W3 | M2.2 Daily / weekly digests | Community digest + weekly creator report (Resend) | Open rate · return visits |
| W4 | M2.3 Re-engagement | Inactive 3/7/14-day campaigns via flags + email | D7 reactivation |
| W4 | M2.4 Achievements | Lightweight achievement emails (first sale, first live, 10 members) | Return within 48h |

### Success criteria
- Digests send reliably to opted-in users
- D1 and D7 measured and dashboarded
- Re-engagement cohort shows lift vs holdout (even if small)

---

## Sprint 3 — Engagement (Days 29–42)
**KPI:** Posts/day · Messages/day · Session depth · Follow/join rates

| Week | Milestone | Deliverable | KPI |
|------|-----------|-------------|-----|
| W5 | M3.1 Discovery shelf | Suggested creators / communities / products / lives module | Click-through |
| W5 | M3.2 Feed ranking v1 | Extend feed with engagement signals (extend-only) | Feed dwell · like rate |
| W6 | M3.3 Trending + recommendations | Trending rails + “because you joined X” suggestions | Join/follow conversion |
| W6 | M3.4 Live discovery | Suggested lives on hub/home (no Live Studio redesign) | Live join rate |

### Success criteria
- Discovery shelf on home/dashboard for returning users
- Measurable uplift in joins/follows from suggestions

---

## Sprint 4 — Monetization (Days 43–56)
**KPI:** Creator revenue · GMV · Membership conversion

| Week | Milestone | Deliverable | KPI |
|------|-----------|-------------|-----|
| W7 | M4.1 Membership upgrade prompts | In-community upgrade nudges for free → paid (extend CE) | Membership conversion |
| W7 | M4.2 Checkout friction cuts | Trust signals, default method memory, error clarity (extend checkout) | Checkout completion |
| W8 | M4.3 Cross-sell / bundles | Post-purchase related products + simple bundle offer flags | AOV |
| W8 | M4.4 Creator earnings nudges | “Complete payout method” / “Publish digital product” in creator hub | Creator revenue |

### Success criteria
- Membership upgrade prompt shown to eligible free members
- Checkout completion rate improves vs baseline week
- AOV or attach rate up for exposed cohort

---

## Sprint 5 — Observability (Days 57–70)
**KPI:** Measurement coverage (instrumentation completeness)

| Week | Milestone | Deliverable | KPI |
|------|-----------|-------------|-----|
| W9 | M5.1 Product events | `growth_events` table + track() helper (activation, retention, commerce) | Event coverage |
| W9 | M5.2 Growth KPI dashboard | Admin: DAU/WAU/MAU, posts/day, messages/day, lives/day, GMV, creator revenue | Decision latency |
| W10 | M5.3 Funnels | Signup → activate → engage → monetize funnel + drop-off | Funnel conversion |
| W10 | M5.4 NPS soft launch | Lightweight NPS capture (in-app, infrequent) | NPS responses |

### Success criteria
- Ops can answer “how did we do yesterday?” in &lt; 2 minutes
- Funnels visible in admin without SQL

---

## Sprint 6 — Experimentation (Days 71–84)
**KPI:** Experiment velocity · % traffic in controlled tests

| Week | Milestone | Deliverable | KPI |
|------|-----------|-------------|-----|
| W11 | M6.1 Experiment assignments | Wire flags to exposures + outcomes in `growth_events` | Experiments live |
| W11 | M6.2 Remote config | Safe remote config keys for copy/CTAs/limits | Config without deploy |
| W12 | M6.3 Gradual rollout + kill switch | Rollout % UI + emergency disable in Command Center | MTTR for bad ships |
| W12 | M6.4 First A/B | Welcome CTA copy or checklist order test | Activation lift |

### Success criteria
- ≥1 growth experiment completed with measured outcome
- Kill switch tested in staging/prod with audit trail

---

## Days 85–90 — Growth review

- Freeze non-critical changes
- Publish internal Growth Review: KPI table, wins, kills, next-90 priorities
- Confirm support ticket / MAU trend and NPS baseline

---

## Priorities (ordered)

1. **Instrument activation + retention** (without metrics, growth is guesswork)
2. **Activation UX** (welcome + checklists) — highest leverage for new users
3. **Lifecycle messaging** — cheap retention
4. **Discovery** — engagement without new modules
5. **Monetization nudges** — creator success
6. **Experimentation maturity** — compound learning

---

## Risk analysis

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Email deliverability / Resend limits | Retention digests fail | Medium | Prefs + batching + suppressions; monitor bounce |
| Over-notifying users | Uninstall / churn | Medium | Pref center + frequency caps + kill switches |
| Ranking changes hurt feed quality | Engagement drop | Medium | Flagged rollout + holdout + quick kill |
| Checkout “optimization” regresses payments | GMV drop | Low–Med | Extend-only, feature-flagged, payment E2E smoke |
| Event volume / PII in analytics | Cost + compliance | Medium | Allowlisted event names; no raw message bodies |
| Scope creep into new modules | Dilutes growth focus | High | CPO gate: reject PRs without KPI tag |
| Admin dashboard noise | Slow decisions | Medium | Max 12 primary metrics; rest in drill-downs |

---

## Operating cadence

- **Mon:** KPI review (15 min) — activation, D1/D7, GMV, creator revenue
- **Wed:** Ship milestone + commit
- **Fri:** Verify (scripts/type-check/smoke) + decide continue/kill
- **Biweekly:** Experiment readout

### Commit / verify / push policy
- Commit **after each milestone**
- Run verify scripts + targeted checks after each sprint
- **Push only after verification passes** for the sprint batch (or full roadmap completion)

---

## Milestone execution log

| ID | Status | Commit | Notes |
|----|--------|--------|-------|
| ROADMAP | ✅ | (this file) | Published |
| M1.1 | ✅ | pending | Welcome flow + intent instrumentation |
| M1.2 | ✅ | pending | Persistent onboarding checklist + progress |
| M1.3 | ✅ | pending | Additive role activation checklist |
| M1.4 | ✅ | pending | Feed/chat/live/library empty-state presets |
| M1.5 | ✅ | pending | Dismissible first-run tips |
| M2.1 | ✅ | pending | Notification preference center |
| M2.2 | ◐ | pending | Dry-run weekly digest queue + in-app delivery |
| M2.x–M6.x | ⏳ | | Per sprint below |

---

## Appendix — Existing leverage (do not rebuild)

- Role activation: `app/dashboard/activate/*`
- Empty states: `components/empty-states/`
- Email: `lib/email/transactional.ts` + Resend
- In-app notify: `lib/notifications/notify-user.ts`
- Marketplace ranking: `lib/marketplace/homepage-ranking.ts`
- Memberships: Creator Economy services
- Feature flags: `lib/ops/feature-flags.ts` + Command Center
- Ops health: `/admin/operations`, `/api/ops/health`

---

*Owner: CPO / CGO · Review cadence: weekly · Next action: execute M1.1 Welcome flow*
