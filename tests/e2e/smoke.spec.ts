import { test, expect } from '@playwright/test';

test.describe('Demo app smoke', () => {
  test('loads the viewer shell and sidebar', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Modern WebRTI Viewer' })).toBeVisible();
    await expect(page.getByLabel('Dataset URL')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pan & Zoom' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enhancements' })).toBeVisible();

    const viewerState = page.getByText('Loading RTI Data...')
      .or(page.getByText('Failed to load RTI'));
    await expect(viewerState).toBeVisible({ timeout: 15_000 });
  });
});
