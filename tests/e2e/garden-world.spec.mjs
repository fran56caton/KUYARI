import { test, expect } from '@playwright/test';

test('garden camera chooses native portrait media and links to the matching personalization', async ({ page }) => {
  const failures = []; page.on('pageerror', e => failures.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const world = page.locator('#jardin-vivo');
  await world.locator('[data-world-go="2"]').click();
  await expect(world).toHaveAttribute('data-current-scene', 'cartas');
  await expect(world.locator('[data-world-go="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(world.locator('[data-world-go="3"]')).toBeVisible();
  await expect(world.locator('[data-world-link]')).toHaveAttribute('href', '/crear-qr#personalizar');
  await expect.poll(() => page.evaluate(() => [...performance.getEntriesByType('resource')].some(e => e.name.includes('jardin-m.mp4')))).toBe(true);
  await expect(world.locator('video')).toHaveJSProperty('videoWidth', 720);
  await expect.poll(() => world.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(7);
  await expect(world.locator('video')).toHaveJSProperty('muted', true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await world.locator('[data-world-link]').click();
  await page.waitForURL('**/crear-qr#personalizar');
  await expect(page.locator('#personalizar')).toBeVisible();
  expect(failures).toEqual([]);
});

test('reduced motion uses selectable stills without downloading any video', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const world = page.locator('#jardin-vivo');
  await world.locator('[data-world-go="3"]').click();
  await expect(world).toHaveAttribute('data-current-scene', 'sorpresa');
  await expect(world.locator('[data-world-link]')).toHaveAttribute('href', '/studio');
  await expect(world.locator('video')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('.mp4')))).toBe(false);
});
