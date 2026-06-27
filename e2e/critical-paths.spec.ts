import { test, expect } from '@playwright/test';

test.describe('Critical Paths', () => {
  test('should load the initial app screen', async ({ page }) => {
    // Navigating to the home page
    await page.goto('/');

    // Wait for the initialization veil to disappear
    await expect(page.locator('text=Initializing Celestial Matrices...')).toBeHidden({ timeout: 15000 });

    // Verify main structure exists
    await expect(page.locator('main')).toBeVisible();

    // Verify footer production mark exists
    await expect(page.locator('#footer-production-mark')).toBeVisible();
  });

  test('should load library screen elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Initializing Celestial Matrices...')).toBeHidden({ timeout: 15000 });
    
    // Verify the LibraryScreen structure
    await expect(page.locator('main')).toBeVisible();
  });
});
