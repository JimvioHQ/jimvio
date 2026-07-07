# Jimvio Design System

Single source of truth for Jimvio UI. Import from `@/components/design-system` and `@/lib/design-system`.

**Do not migrate existing pages in bulk** — adopt `Ds*` components incrementally alongside `components/ui/*`.

## Architecture alignment

The Design System follows Jimvio's lead-architect rules:

| Rule | How DS complies |
|------|-----------------|
| No broken features | Zero page integrations yet — nothing in production paths changed |
| No duplicate logic | Tokens live once in `lib/design-system/` + CSS vars; no copy-pasted utilities |
| Reuse existing UI | `DsDialog`, `DsDropdownMenu`, `DsMenu`, `DsToaster` wrap existing `components/ui` / Sonner |
| No new visual styles | All `Ds*` components use `--color-*`, `--radius-*`, `--ds-*` tokens only |
| Strongly typed | Full TypeScript; `tsc --noEmit` clean |
| Accessible | `ds-focus-ring`, labels, `aria-*`, reduced-motion on all motion utilities |
| Performance | GPU-only animations (150–300ms); composable, tree-shakeable exports |

**Adoption rule for new features:** import from `@/components/design-system` first. If an equivalent exists in `components/ui/*` and is already wired on the page, keep it until a focused refactor — never bulk-replace.

**Anti-duplication rule:** do not add a third button/card/input. New surfaces use `Ds*`; legacy surfaces keep `components/ui/*` until migrated one screen at a time.

## Foundation

### Tokens (`lib/design-system`)

| Category | CSS variables | TS export |
|----------|---------------|-----------|
| Colors | `--color-*` (globals) | `dsColors` |
| Spacing | `--space-1` … `--space-10` | `dsSpacing` |
| Radius | `--radius-sm` … `--radius-full` | `dsRadius` |
| Shadows | `--shadow-sm` … `--shadow-glow` | `dsShadow` |
| Elevation | `--ds-elevation-0` … `4` | `dsElevation` |
| Typography | `--ds-text-xs` … `3xl` | `dsFontSize` |
| Duration | `--ds-duration-fast/normal/slow` | `dsDuration` |
| Blur | `--ds-blur-sm/md/lg` | `dsBlur` |
| Z-index | `--ds-z-*` | `dsZIndex` |
| Breakpoints | 640–1920px | `dsBreakpoints` |

Extended tokens live in `styles/jimvio-design-system.css`.

### Utilities

- `ds-focus-ring` — consistent focus states
- `ds-motion-fade-in`, `ds-motion-scale-in`, `ds-motion-slide-up` — GPU animations
- `ds-gpu` — `will-change` + translateZ
- Respects `prefers-reduced-motion`

---

## Components

### DsButton

**Variants:** `primary` | `secondary` | `ghost` | `outline` | `danger` | `success`  
**Sizes:** `xs` | `sm` | `md` | `lg` | `xl` | `icon` | `icon-sm`  
**Props:** `loading`, `disabled`, `asChild`

```tsx
import { DsButton } from "@/components/design-system";

<DsButton variant="primary" size="md" loading>Save</DsButton>
<DsFab aria-label="Create"><Plus /></DsFab>
```

### DsInput / DsTextarea / DsSelect

**Form states:** default, error, success, disabled, loading  
**Props:** `label`, `helperText`, `error`, `success`, `required`, `optional`

```tsx
<DsInput label="Email" error="Invalid email" required />
<DsTextarea label="Description" helperText="Max 500 characters" />
<DsSelect label="Country"><option>RW</option></DsSelect>
```

### DsCheckbox / DsRadio / DsSwitch

Accessible toggles with consistent accent color.

### DsCard

**Padding:** `none` | `sm` | `md` | `lg`  
**Elevation:** `none` | `sm` | `md` | `lg`  
**Props:** `interactive` for hover scale

Subcomponents: `DsCardHeader`, `DsCardTitle`, `DsCardDescription`, `DsCardContent`, `DsCardFooter`

### Card variants

- `DsProductCard` — marketplace product tile
- `DsDashboardCard` — metric + delta
- `DsAnalyticsCard` — chart shell
- `DsCommunityCard` — hub preview
- `DsCreatorCard` — creator preview
- `DsCampaignCard` — UGC/affiliate campaign

### DsBadge / DsChip / DsAvatar

Display primitives for labels, filters, and identity.

### DsAlert / DsSkeleton / DsLoader / DsProgress

Feedback and loading states.

### DsEmptyState / DsErrorState

Standard empty and error layouts with optional actions.

### DsTabs / DsBreadcrumb / DsPagination / DsAccordion

Navigation patterns.

### DsTable

`DsTable` + `DsTableRow` + `DsTableCell` for data grids.

### DsDialog / DsDropdownMenu

Re-exports from `components/ui` with DS naming — same behavior, documented entry point.

### DsDrawer / DsTooltip

Overlay primitives for side panels and hover hints.

### DsToaster / dsToast

Toast notifications via Sonner with DS styling. Mount `DsToaster` once at app root (existing `Toaster` in `app/layout.tsx` already matches — migrate to `DsToaster` when convenient).

```tsx
import { dsToast } from "@/components/design-system";

dsToast.success("Saved");
dsToast.error("Something went wrong", { description: "Try again." });
```

### DsMenu

Full menu primitive set (`DsMenu`, `DsMenuItem`, `DsMenuSub`, etc.) — same as dropdown menu, DS entry point.

### DsIcon

Wraps Lucide icons with consistent `strokeWidth: 2` and size scale (`xs`–`xl`).

---

## Best practices

1. **Use design tokens** — prefer `var(--color-accent)` over hardcoded hex in new code.
2. **Use DsButton variants** — don't invent one-off button styles.
3. **Lazy load heavy cards** — pair with `IntersectionObserver` on listing pages.
4. **Accessibility** — always use `ds-focus-ring`, `aria-*`, and labels on form fields.
5. **Motion** — use `ds-motion-*` classes; avoid layout-thrashing animations.
6. **Incremental adoption** — new features use DS; existing pages unchanged until refactored.

---

## File structure

```
lib/design-system/          # Tokens, motion, breakpoints, forms
styles/jimvio-design-system.css
components/design-system/   # Ds* components
docs/design-system/README.md
```
