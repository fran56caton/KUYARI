import { test, expect } from '@playwright/test';
// Trace snapshots also evaluate page code and grant activation in Chromium.
test.use({ trace: 'off' });

// Playwright evaluations can grant user activation. Observe autoplay through CDP
// with userGesture:false so the regression really covers an untouched page.
async function passiveMedia(page) {
  const session = await page.context().newCDPSession(page);
  return {
    read: async () => (await session.send('Runtime.evaluate', {
      expression: `(() => { const v = document.querySelector('#jardin-vivo video'); return { activated: navigator.userActivation.hasBeenActive, time: v?.currentTime ?? 0, paused: v?.paused ?? true, width: v?.videoWidth ?? 0, autoplay: v?.autoplay ?? false, loop: v?.loop ?? false }; })()`,
      returnByValue: true, userGesture: false,
    })).result.value,
    seekEnd: () => session.send('Runtime.evaluate', {
      expression: `(() => { const v = document.querySelector('#jardin-vivo video'); v.currentTime = v.duration - .3; })()`, userGesture: false,
    }),
  };
}

for (const viewport of [{ width: 1440, height: 900, nativeWidth: 1280 }, { width: 390, height: 844, nativeWidth: 720 }]) {
  test(`garden autoplays without any click at ${viewport.width}px and respects pause`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const passive = await passiveMedia(page);
    await page.goto('/#jardin-vivo');
    await expect.poll(async () => (await passive.read()).time).toBeGreaterThan(.5);
    const untouched = await passive.read();
    expect(untouched).toMatchObject({ activated: false, paused: false, width: viewport.nativeWidth, autoplay: true, loop: true });
    const world = page.locator('#jardin-vivo'), video = world.locator('video');
    await expect(video).toHaveJSProperty('videoWidth', viewport.nativeWidth);
    await expect(video).toHaveClass(/is-ready/);
    await expect(video).toHaveCSS('opacity', '1');
    await expect(video).toHaveJSProperty('paused', false);
    await expect(video).toHaveJSProperty('autoplay', true);
    await expect(video).toHaveJSProperty('loop', true);
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
  await expect(world.locator('video')).toHaveJSProperty('paused', false);
  const chapterTime = await world.locator('video').evaluate(v => v.currentTime);
  await expect.poll(() => world.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(chapterTime + .5);
  await expect(world.locator('[data-world-link]')).toHaveAttribute('href', '/crear-qr#personalizar');
  await world.locator('[data-world-link]').click();
  await page.waitForURL('**/crear-qr#personalizar');
  await expect(page.locator('#personalizar')).toBeVisible();
  await expect(page.locator('.world-video')).toHaveCount(0);
  expect(failures).toEqual([]);
});

test('owner-requested autoplay works with reduced motion and loops without intervention', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const passive = await passiveMedia(page);
  await page.goto('/#jardin-vivo');
  await expect.poll(async () => (await passive.read()).time).toBeGreaterThan(.5);
  expect(await passive.read()).toMatchObject({ activated: false, paused: false });
  await passive.seekEnd();
  await expect.poll(async () => (await passive.read()).time).toBeLessThan(3);
  expect(await passive.read()).toMatchObject({ activated: false, paused: false });
  const world = page.locator('#jardin-vivo');
  await expect(world.locator('video')).toHaveJSProperty('paused', false);
  await expect(world.locator('video')).toHaveCSS('opacity', '1');
  await expect.poll(() => world.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(.5);
  await expect(world.locator('video')).toHaveJSProperty('paused', false);
  const loopTime = await world.locator('video').evaluate(v => v.currentTime);
  await expect.poll(() => world.locator('video').evaluate(v => v.currentTime)).toBeGreaterThan(loopTime + .5);
});

test('an interrupted initial play retries automatically instead of requiring the play button', async ({ page }) => {
  const passive = await passiveMedia(page);
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    let interrupted = false;
    HTMLMediaElement.prototype.play = function () {
      if (!interrupted) {
        interrupted = true;
        return Promise.reject(new DOMException('Initial play interrupted', 'AbortError'));
      }
      return originalPlay.call(this);
    };
  });
  await page.goto('/#jardin-vivo');
  await expect.poll(async () => (await passive.read()).time).toBeGreaterThan(.5);
  expect(await passive.read()).toMatchObject({ activated: false, paused: false });
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
