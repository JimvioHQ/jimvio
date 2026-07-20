# Performance Budgets

## What we measure

After every production build (`ci:prepush` / CI):

- **Build duration** (ms) via `.next/build-timing.json`
- **Static asset size** (KB under `.next/static`)
- **JS chunks size** (KB under `.next/static/chunks`)

Budgets live in `performance-budget.json` and are enforced by:

```bash
npm run release:perf
```

## Defaults

| Metric | Budget |
|--------|--------|
| Build time | ≤ 900_000 ms (15m) |
| Static total | ≤ 20_000 KB |
| Chunks total | ≤ 45_000 KB |

Tighten after a green CI baseline is recorded in `.next/performance-report.json` (uploaded as CI artifact when present).

## Regression policy

Fail closed if any hard budget is exceeded. Investigate Next bundle / dependency growth before raising the ceiling.
