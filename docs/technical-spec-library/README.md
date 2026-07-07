# Jimvio Technical Specification Library (TSL)

**Implementation contracts for engineering · Version 1.0 · July 2026**

| | |
|---|---|
| **Purpose** | Ensure different engineers implement the same solution consistently |
| **Audience** | Engineering, QA, Security, AI, DevOps |
| **Template** | [TSL-TEMPLATE.md](./TSL-TEMPLATE.md) |

---

## FS vs TSL — when to use which

| Document | ID format | Sections | Owner | Purpose |
|----------|-----------|----------|-------|---------|
| **[Feature Spec](../feature-specs/)** | `FS-NNN` | 30 | Product + Eng | Product intake — personas, business value, rollout, risks |
| **Technical Spec (TSL)** | `TSL-NNN` | 11 | Engineering | **Implementation contract** — APIs, types, events, tests |

**Workflow:** Every Tier 1–3 feature has **both** `FS-NNN` and `TSL-NNN` with matching numbers before code is written.

```
Product request → FS-NNN (approved) → TSL-NNN (approved) → Implementation
```

Tier 4–5 may use TSL-only for engineering-focused changes.

---

## Specification index

| ID | Feature | FS pair | Status | Owner |
|----|---------|---------|--------|-------|
| [TSL-001](./TSL-001-jimvio-ai-production-integration.md) | Jimvio AI Production Integration | [FS-001](../feature-specs/FS-001-jimvio-ai-production-integration.md) | Proposed | Platform / AI |
| — | *Use [template](./TSL-TEMPLATE.md) for new specs* | — | — | — |

---

## Review requirements

| Reviewer | Validates |
|----------|-----------|
| **Staff / Principal Engineer** | Architecture, APIs, types, events, reuse |
| **Security** | Auth, PII, rate limits (mandatory T1–T2) |
| **QA** | Acceptance criteria, test strategy |
| **AI Architect** | AI section (when applicable) |

TSL approval required before implementation starts (per [Operating Model](../operating-model/)).

---

## Quality bar

A TSL is **ready for implementation** when:

- [ ] All 11 sections complete
- [ ] Every functional requirement has acceptance criteria (§10)
- [ ] API contracts are typed (request/response shapes)
- [ ] Existing components/hooks listed — no duplication
- [ ] Security section complete for tier
- [ ] Test strategy covers AC-IDs
- [ ] Paired FS-NNN approved (Tier 1–3)

---

## Related documents

| Document | Relationship |
|----------|--------------|
| [Product Bible](../product-bible/) | Permanent truth |
| [Feature Specs](../feature-specs/) | Product-facing pair (`FS-NNN`) |
| [System Architecture](../system-architecture/) | Domain boundaries, events |
| [Technical Architecture](../technical-architecture/) | Stack, API standards |
| [Operating Model](../operating-model/) | Tier gates, release |

---

## Change log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | July 2026 | Template, TSL-001 exemplar, FS/TSL pairing model |
