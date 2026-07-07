# Technical Specification Template (TSL)

**Copy to `TSL-NNN-feature-name.md` · Pair with `FS-NNN` for Tier 1–3 features**

---

## Metadata

| Field | Value |
|-------|-------|
| **TSL ID** | TSL-NNN |
| **FS pair** | FS-NNN |
| **Title** | |
| **Status** | Draft \| In Review \| Approved \| Implemented |
| **Owner** | |
| **Priority** | P0 \| P1 \| P2 |
| **Tier** | 1 \| 2 \| 3 \| 4 \| 5 |
| **Target release** | |
| **Reviewers** | Staff Eng · Security · QA · AI (if applicable) |

---

## 1. Feature Summary

### Purpose
*One paragraph — what this feature does technically.*

### Business Value
*Why build it — link to FS-NNN §6.*

### Target Users
| Persona | Role | Technical surface |
|---------|------|-------------------|
| | | |

### Dependencies
| Dependency | Type | Blocking? |
|------------|------|-----------|
| | module / service / ADR | yes/no |

### Owner
*Engineering owner (DRI).*

### Priority
*P0 / P1 / P2 with rationale.*

---

## 2. Functional Requirements

| ID | Requirement | Validation | Permissions | Edge cases |
|----|-------------|------------|-------------|------------|
| FR-1 | System SHALL … | zod schema / rule | role | … |
| FR-2 | | | | |

*Use SHALL/MUST. Every FR maps to AC in §10.*

---

## 3. User Experience

### Desktop
*Layout, interactions, breakpoints ≥ 1280px.*

### Tablet
*768px–1279px behavior.*

### Mobile
*320px–767px — primary target.*

### Responsive behavior
*What changes per breakpoint; no horizontal scroll.*

### Accessibility
| Requirement | Implementation |
|-------------|----------------|
| Keyboard | |
| Screen reader | |
| Focus | `ds-focus-ring` |
| Reduced motion | |

### State matrix

| State | UI component | Trigger |
|-------|--------------|---------|
| **Loading** | `DsSkeleton` / `DsLoader` | |
| **Empty** | `DsEmptyState` + CTA | |
| **Success** | `dsToast` / inline | |
| **Error** | `DsErrorState` + retry | |

---

## 4. Business Rules

| ID | Rule | Constraint | Fallback |
|----|------|------------|----------|
| BR-1 | | | |
| BR-2 | | | |

### Permissions summary
| Action | Guest | Buyer | Seller | Creator | Affiliate | Admin |
|--------|:-----:|:-----:|:------:|:-------:|:---------:|:-----:|

### Validation rules
*Server-side only; zod schemas referenced.*

### Edge cases
| Case | Expected behavior |
|------|-------------------|
| | |

---

## 5. Technical Requirements

### Architecture
*Where this fits — domain, layer, ADR refs. Additive vs modify.*

### Existing components (reuse)
| Component | Path | Usage |
|-----------|------|-------|
| | `components/...` | |

### Reusable hooks
| Hook | Path | Usage |
|------|------|-------|
| | `hooks/...` | |

### Services
| Service | Path | Methods used |
|---------|------|--------------|
| | `services/...` | |

### Types
| Type | Path | New/Existing |
|------|------|--------------|
| | `types/...` | |

### API contracts

#### `METHOD /api/...`
**Auth:** session \| cron \| webhook  
**Request:**
```typescript
// TypeScript interface
```
**Response:**
```typescript
// TypeScript interface
```
**Errors:** 400, 401, 403, 429, 500

### Database dependencies
| Table / RPC | Operation | Migration |
|-------------|-----------|-----------|
| | read/write | yes/no |

### Events
| Event | Producer | Consumers |
|-------|----------|-----------|
| | this feature | |

### Caching
| Key | TTL | Invalidation |
|-----|-----|--------------|
| | | |

### Performance
| Metric | Target |
|--------|--------|
| API p95 | |
| Bundle impact | |
| LCP impact | |

---

## 6. Security

| Area | Requirement |
|------|-------------|
| **Authentication** | |
| **Authorization** | guards / RLS |
| **Rate limits** | per user / IP |
| **Audit logs** | table / fields |
| **Input validation** | zod schema ref |
| **Sensitive data** | PII handling; never log |

---

## 7. AI Integration

| Capability | Phase | User approves? |
|------------|-------|----------------|
| Suggestions | | |
| Explanations | | |
| Automations | | |
| Tool use | | |

*UI placeholders only unless explicitly in scope. AI never writes to payments/orders.*

---

## 8. Analytics

### Events
| Event name | Trigger | Properties |
|------------|---------|------------|
| | | |

### Funnels
| Funnel | Steps |
|--------|-------|
| | |

### KPIs
| KPI | Target | Source |
|-----|--------|--------|
| | | |

---

## 9. Testing

| Layer | Scope | AC coverage |
|-------|-------|-------------|
| **Unit** | | FR-x, BR-x |
| **Integration** | | API contracts |
| **E2E** | | AC-x |
| **Accessibility** | | keyboard, SR |
| **Performance** | | p95 targets |
| **Regression** | | smoke: checkout, auth, payments |

---

## 10. Acceptance Criteria

| AC ID | FR/BR ref | Given / When / Then |
|-------|-----------|---------------------|
| AC-1 | FR-1 | **Given** … **When** … **Then** … |
| AC-2 | | |

*Every FR must map to ≥1 AC. Nothing ambiguous.*

---

## 11. Future Enhancements

| Enhancement | Phase | Technical note |
|-------------|-------|----------------|
| | v1.1 | |

### Scalability notes
*What breaks at 100K / 1M users.*

### Technical debt
*Known shortcuts; paydown plan.*

---

## Approval

| Role | Name | Date | Approved |
|------|------|------|----------|
| Staff Engineer | | | ☐ |
| Security | | | ☐ |
| QA | | | ☐ |
| AI Architect | | | ☐ |
