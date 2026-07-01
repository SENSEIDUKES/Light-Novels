import { test, expect } from '@playwright/test';

test.describe('Critical Paths', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the initialization veil to disappear
    await expect(page.locator('text=Initializing Celestial Matrices...')).toBeHidden({ timeout: 15000 });
  });

  test('should load the initial app screen', async ({ page }) => {
    // Verify main structure exists
    await expect(page.locator('main')).toBeVisible();

    // Verify footer production mark exists
    await expect(page.locator('#footer-production-mark')).toBeVisible();
  });

  test('should load library screen elements and interact with tabs', async ({ page }) => {
    // Verify the LibraryScreen structure
    await expect(page.locator('main')).toBeVisible();
    
    // Should display the "Immortal Hub" tab by default or "My Library" depending on local storage, 
    // but we can click Immortal Hub to be sure
    await page.locator('button', { hasText: 'Immortal Hub' }).click();
    await expect(page.locator('text=Realm Filter (Genre)')).toBeVisible();

    // Switch to Challenges tab
    await page.locator('button', { hasText: '☠️ Fate Survival' }).click();
    await expect(page.locator('text=The Wedding That Never Happens')).toBeVisible();
  });

  test('should navigate to the creation portal', async ({ page }) => {
    // Click on "Carve New Destiny" button
    const createBtn = page.locator('button', { hasText: 'Carve New Destiny' });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify CreationPortal loaded
    await expect(page.locator('text=Story Seed Intake')).toBeVisible();
  });

  test('should open command hub and navigate to pricing', async ({ page }) => {
    // Click Command Hub button (header tool)
    const commandHubBtn = page.locator('button[title="Command Hub"]');
    await expect(commandHubBtn).toBeVisible();
    await commandHubBtn.click();

    // Click on Tiers (Pricing)
    const tiersBtn = page.locator('button', { hasText: 'Tiers' });
    await expect(tiersBtn).toBeVisible();
    await tiersBtn.click();

    // Verify Pricing Screen loaded
    await expect(page.locator('text=Guild Notice Board')).toBeVisible();
  });
});
