# Jimvio Documentation

**Official documentation index · July 2026**

## Start here

| You are… | Read this first |
|----------|-----------------|
| **Anyone new to Jimvio** | [**Product Bible**](./product-bible/JIMVIO-PRODUCT-BIBLE-v1.0.md) |
| **Investors / executives** | [**Product Strategy v10**](./product-strategy/JIMVIO-PRODUCT-STRATEGY-v10.md) |
| **Product planning** | [Product Strategy v10](./product-strategy/) → [JPOS](./product-operating-system/) → [Product Blueprint](./product-blueprint/) |
| **UI work** | [Design System](./design-system/) |
| **Building a feature** | [**Ten Commandments**](./ten-commandments/) → [JPOS](./product-operating-system/) → [PRD](./prd/) → [Platform Standards](./platform-standards/) → [Feature Spec](./feature-specs/FEATURE-SPECIFICATION-TEMPLATE.md) |
| **Engineering implementation** | [Domain Architecture](./domain-architecture/) + [Technical Architecture](./technical-architecture/) + [System Architecture](./system-architecture/) |
| **On-call and launch operations** | [Launch Operations](./LAUNCH_OPERATIONS.md) + [Incident Response](./INCIDENT_RESPONSE.md) + [Disaster Recovery](./DISASTER_RECOVERY.md) |

---

## Documentation pyramid

```
                    ┌─────────────────────┐
                    │  PRODUCT STRATEGY   │  ← Decade direction (v10)
                    └──────────┬──────────┘
                    ┌──────────▼──────────┐
                    │    PRODUCT BIBLE    │  ← Permanent source of truth
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
   Product Blueprint   Domain Architecture   JPOS
           │            System Architecture   Operating Model
           │                   │                   │
           ▼                   ▼                   ▼
   PRDs (PRD-NNN)       Technical Architecture   ADRs
   Feature Specs (FS)         │
   Technical Specs (TSL)      │
           │                   │
           └─────────┬─────────┘
                     ▼
              Design System
```

---

## All documents

| Document | Path | Purpose |
|----------|------|---------|
| **Product Bible** | [product-bible/](./product-bible/) | Executive handbook — permanent truth |
| **Product Strategy v10** | [product-strategy/](./product-strategy/) | Decade strategy — market, growth, AI, roadmap |
| **Ten Commandments** | [ten-commandments/](./ten-commandments/) | Immutable implementation laws — non-negotiable |
| **Platform Standards** | [platform-standards/](./platform-standards/) | Implementation governance — principles, checklist |
| Product Blueprint | [product-blueprint/](./product-blueprint/) | Detailed product specification |
| **Domain Architecture** | [domain-architecture/](./domain-architecture/) | DDD business boundaries, entity ownership |
| **Business Capability Model** | [business-capability-model/](./business-capability-model/) | Technology-independent capabilities (L1–L3) |
| System Architecture | [system-architecture/](./system-architecture/) | Technical modules, events, scale, DR |
| Technical Architecture | [technical-architecture/](./technical-architecture/) | Stack, APIs, implementation |
| **Product Operating System (JPOS)** | [product-operating-system/](./product-operating-system/) | Product decision governance — philosophy, portfolio, KPIs |
| Operating Model | [operating-model/](./operating-model/) | Tactical lifecycle — tiers, RACI, release |
| **PRDs** | [prd/](./prd/) | Product requirements (`PRD-NNN`, 33 sections) |
| Feature Specs | [feature-specs/](./feature-specs/) | Engineering intake (`FS-NNN`, 30 sections) |
| Technical Spec Library | [technical-spec-library/](./technical-spec-library/) | Engineering contracts (`TSL-NNN`, 11 sections) |
| Design System | [design-system/](./design-system/) | UI tokens and `Ds*` components |
| ADRs | [adr/](./adr/) | Architectural decision records |

---

## Alignment

Every feature, engineering decision, design decision, AI integration, business decision, and roadmap item **must align with the [Product Bible](./product-bible/JIMVIO-PRODUCT-BIBLE-v1.0.md)**.
