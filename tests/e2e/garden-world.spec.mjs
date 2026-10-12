import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900, nativeWidth: 1280 }, { width: 390, height: 844, nativeWidth: 720 }]) {
  test(`garden visibly plays without scrolling at ${viewport.width}px and respects pause`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('.hero-video-link').click();
    const world = page.locator('#jardin-vivo'), video = world.locator('video');
    await expect(video).toHaveJSProperty('videoWidth', viewport.nativeWidth);
    await expect(video).toHaveClass(/is-ready/);
    await expect(video).toHaveCSS('opacity', '1');
    await expect(video).toHaveJSProperty('paused', false);
    const start = await video.evaluate(v => v.currentTime), scroll = await page.evaluate(() => scrollY);
    await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(start + .5);
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await world.locator('[data-world-play]').click();
    await expect(video).toHaveJSProperty('paused', true);
    await expect(world.locator('[data-world-play]')).toHaveText('Reproducir vídeo');
    const paused = await video.evaluate(v => v.currentTime);
    await page.waitForTimeout(600);
    expect(await video.evaluate(v => v.currentTime)).toBe(paused);
    // Leaving and returning must not override an intentional pause.
    await page.locator('.hero-video-link').scrollIntoViewIfNeeded();
    await page.locator('.hero-video-link').click();
    await expect(video).toHaveJSProperty('paused', true);
    await world.locator('[data-world-play]').click();
    await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(paused + .5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('native portrait chapters hold the matching personalization link and clean up on navigation', async ({ page }) => {
  const failures = []; page.on('pageerror', e => failures.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const world = page.locator('#jardin-vivo');
  await world.locator('[data-world-go="2"]').click();
  await expect(world).toHaveAttribute('data-current-scene', 'cartas');
  await expect(world.locator('[data-world-go="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(world.locator('[data-world-go="3"]')).toBeVisible();
  await expect(world.locator('[data-world-link]')).toHaveAttribute('href', '/crear-qr#personalizar');
  await expect(world.locator('video')).toHaveJSProperty('videoWidth', 720);
  await expect.poll(() => world.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(7);
  await expect(world.locator('video')).toHaveJSProperty('muted', true);
  await expect(world.locator('video')).toHaveJSProperty('paused', true);
  await world.locator('[data-world-link]').click();
  await page.waitForURL('**/crear-qr#personalizar');
  await expect(page.locator('#personalizar')).toBeVisible();
  await expect(page.locator('.world-video')).toHaveCount(0);
  expect(failures).toEqual([]);
});

test('reduced motion keeps stills until the customer explicitly plays the video', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const world = page.locator('#jardin-vivo');
  await world.locator('[data-world-go="3"]').click();
  await expect(world).toHaveAttribute('data-current-scene', 'sorpresa');
  await expect(world.locator('[data-world-link]')).toHaveAttribute('href', '/studio');
  await expect(world.locator('video')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some(e => e.name.includes('.mp4')))).toBe(false);
  await world.locator('[data-world-play]').click();
  await expect(world.locator('video')).toHaveJSProperty('paused', false);
  await expect(world.locator('video')).toHaveCSS('opacity', '1');
  await expect.poll(() => world.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(14);
});

test('optional scroll exploration seeks the film and can return to playback', async ({ page }) => {
  await page.goto('/');
  const world = page.locator('#jardin-vivo');
  await world.locator('[data-world-scroll]').click();
  await expect(world).toHaveClass(/world-scroll/);
  await world.locator('[data-world-go="2"]').click();
  await expect(world).toHaveAttribute('data-current-scene', 'cartas');
  await expect.poll(() => world.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(9);
  await expect(world.locator('video')).toHaveJSProperty('paused', true);
  await world.locator('[data-world-play]').click();
  await expect(world).not.toHaveClass(/world-scroll/);
  await expect(world.locator('video')).toHaveJSProperty('paused', false);
  expect(await world.evaluate(el => el.offsetHeight < innerHeight + 1)).toBe(true);
});

test('a failed video offers a working retry without blocking the gift links', async ({ page }) => {
  await page.route('**/assets/world/*.mp4', route => route.abort());
  await page.goto('/');
  const world = page.locator('#jardin-vivo');
  await world.locator('[data-world-play]').scrollIntoViewIfNeeded();
  await expect(world.locator('[data-world-error]')).toBeVisible();
  await expect(world.locator('[data-world-link]')).toHaveAttribute('href', '/jardin-flores');
  await page.unroute('**/assets/world/*.mp4');
  await world.locator('[data-world-play]').click();
  await expect(world.locator('video')).toHaveJSProperty('paused', false);
  await expect(world.locator('video')).toHaveCSS('opacity', '1');
  await expect(world.locator('[data-world-error]')).toBeHidden();
});
