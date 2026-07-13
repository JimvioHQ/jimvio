# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-sessions.spec.ts >> Live Sessions API >> should require auth for creating session
- Location: tests\e2e\live-sessions.spec.ts:70:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 500
Received array: [401, 403, 404]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('/c/live page', () => {
  4  |   test('should load live sessions listing page', async ({ page }) => {
  5  |     await page.goto('/c/live');
  6  |     
  7  |     // The page should load (may redirect to login if not authenticated)
  8  |     await expect(page).toHaveURL(/.*/);
  9  |     
  10 |     // Check for Live Sessions heading or similar content
  11 |     const heading = page.getByRole('heading', { name: /Live Sessions/i });
  12 |     await expect(heading).toBeVisible({ timeout: 10000 });
  13 |   });
  14 | 
  15 |   test('should show start live button for authenticated users', async ({ page }) => {
  16 |     await page.goto('/c/live');
  17 |     
  18 |     const startLiveBtn = page.getByRole('button', { name: /Start Live/i });
  19 |     // Button may or may not be visible depending on auth state
  20 |     await expect(startLiveBtn).toBeVisible({ timeout: 10000 }).catch(() => {});
  21 |   });
  22 | 
  23 |   test('should show empty state or sessions list', async ({ page }) => {
  24 |     await page.goto('/c/live');
  25 |     
  26 |     // Either shows "No live sessions" or lists sessions
  27 |     const emptyState = page.getByText(/No live sessions/i);
  28 |     const sessionCards = page.locator('article:has-text("LIVE"), [data-testid="session-card"]');
  29 |     
  30 |     await Promise.race([
  31 |       expect(emptyState).toBeVisible({ timeout: 10000 }),
  32 |       expect(sessionCards.first()).toBeVisible({ timeout: 10000 })
  33 |     ]);
  34 |   });
  35 | });
  36 | 
  37 | test.describe('/c/live - authentication flows', () => {
  38 |   test('should handle unauthenticated access', async ({ page }) => {
  39 |     await page.goto('/c/live');
  40 |     
  41 |     // Should load without error (may show login prompt)
  42 |     await expect(page).toHaveURL(/.*/);
  43 |   });
  44 | });
  45 | 
  46 | test.describe('/c/live/[sessionId] - session page', () => {
  47 |   test('should handle session page access', async ({ page }) => {
  48 |     // Test with a non-existent session ID
  49 |     await page.goto('/c/live/test-session-id');
  50 |     
  51 |     // Should either show access denied, redirect, or session page
  52 |     await expect(page).toHaveURL(/.*\/c\/live/);
  53 |   });
  54 | });
  55 | 
  56 | test.describe('Live Sessions API', () => {
  57 |   test('should return sessions list', async ({ request }) => {
  58 |     const response = await request.get('/api/c/live');
  59 |     
  60 |     // May return 200 (with sessions) or 401 (unauthenticated)
  61 |     expect([200, 401, 403]).toContain(response.status());
  62 |     
  63 |     if (response.status() === 200) {
  64 |       const data = await response.json();
  65 |       expect(data).toHaveProperty('sessions');
  66 |       expect(Array.isArray(data.sessions)).toBeTruthy();
  67 |     }
  68 |   });
  69 | 
  70 |   test('should require auth for creating session', async ({ request }) => {
  71 |     const response = await request.post('/api/c/live', {
  72 |       data: {
  73 |         spaceId: 'test-space-id',
  74 |         title: 'Test Live Session',
  75 |       },
  76 |     });
  77 |     
  78 |     // Should return 401 (unauthorized) or 403 (forbidden) or 404 (not found)
> 79 |     expect([401, 403, 404]).toContain(response.status());
     |                             ^ Error: expect(received).toContain(expected) // indexOf
  80 |   });
  81 | });
  82 | 
  83 | test.describe('Space Access Control', () => {
  84 |   test('should filter sessions by space access on page', async ({ page }) => {
  85 |     await page.goto('/c/live');
  86 |     
  87 |     // Page should load without error
  88 |     await expect(page).toHaveURL(/.*\/c\/live/);
  89 |     
  90 |     // Wait for any async content
  91 |     await page.waitForTimeout(2000);
  92 |   });
  93 | });
```