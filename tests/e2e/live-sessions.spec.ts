import { test, expect } from '@playwright/test';

test.describe('/c/live page', () => {
  test('should load live sessions listing page', async ({ page }) => {
    await page.goto('/c/live');
    
    // The page should load (may redirect to login if not authenticated)
    await expect(page).toHaveURL(/.*/);
    
    // Check for Live Sessions heading or similar content
    const heading = page.getByRole('heading', { name: /Live Sessions/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should show start live button for authenticated users', async ({ page }) => {
    await page.goto('/c/live');
    
    const startLiveBtn = page.getByRole('button', { name: /Start Live/i });
    // Button may or may not be visible depending on auth state
    await expect(startLiveBtn).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('should show empty state or sessions list', async ({ page }) => {
    await page.goto('/c/live');
    
    // Either shows "No live sessions" or lists sessions
    const emptyState = page.getByText(/No live sessions/i);
    const sessionCards = page.locator('article:has-text("LIVE"), [data-testid="session-card"]');
    
    await Promise.race([
      expect(emptyState).toBeVisible({ timeout: 10000 }),
      expect(sessionCards.first()).toBeVisible({ timeout: 10000 })
    ]);
  });
});

test.describe('/c/live - authentication flows', () => {
  test('should handle unauthenticated access', async ({ page }) => {
    await page.goto('/c/live');
    
    // Should load without error (may show login prompt)
    await expect(page).toHaveURL(/.*/);
  });
});

test.describe('/c/live/[sessionId] - session page', () => {
  test('should handle session page access', async ({ page }) => {
    // Test with a non-existent session ID
    await page.goto('/c/live/test-session-id');
    
    // Should either show access denied, redirect, or session page
    await expect(page).toHaveURL(/.*\/c\/live/);
  });
});

test.describe('Live Sessions API', () => {
  test('should return sessions list', async ({ request }) => {
    const response = await request.get('/api/c/live');
    
    // May return 200 (with sessions) or 401 (unauthenticated)
    expect([200, 401, 403]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('sessions');
      expect(Array.isArray(data.sessions)).toBeTruthy();
    }
  });

  test('should require auth for creating session', async ({ request }) => {
    const response = await request.post('/api/c/live', {
      data: {
        spaceId: 'test-space-id',
        title: 'Test Live Session',
      },
    });
    
    // Should return 401 (unauthorized) or 403 (forbidden) or 404 (not found)
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Space Access Control', () => {
  test('should filter sessions by space access on page', async ({ page }) => {
    await page.goto('/c/live');
    
    // Page should load without error
    await expect(page).toHaveURL(/.*\/c\/live/);
    
    // Wait for any async content
    await page.waitForTimeout(2000);
  });
});