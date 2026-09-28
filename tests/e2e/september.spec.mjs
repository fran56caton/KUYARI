import { test, expect } from '@playwright/test';

test('edición azul: filtros, opciones y consulta completa para ambos WhatsApp', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/30-de-septiembre');
  await expect(page.locator('#season-products .product-card')).toHaveCount(6);
  await expect(page.locator('#season-products')).not.toContainText('S/');
  await page.getByRole('button', { name: 'Carritos', exact: true }).click();
  await expect(page.locator('#season-products .product-card')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Carritos', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.locator('#season-products .product-card')).toHaveCount(2);
  await page.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Tu carrito favorito', exact: true }) }).click();
  await expect(page.locator('#inquiry-form')).toBeVisible();
  await page.getByRole('combobox', { name: 'Presentación', exact: true }).selectOption('En cajita');
  await page.getByLabel('Tonos del detalle').selectOption('Celeste');
  await page.getByLabel('Cantidad de regalos').fill('2');
  await page.getByLabel('¿Para quién es?').fill('Diego');
  await page.getByLabel('Modelo de carrito').fill('Deportivo azul');
  await page.getByLabel('Tu dedicatoria').fill('Contigo, todos los caminos son bonitos.');
  await page.getByLabel('Tu presupuesto').fill('120');
  await page.getByRole('button', { name: 'Preparar mi consulta' }).click();
  const links = page.locator('#inquiry-result a'); await expect(links).toHaveCount(2);
  for (const [n, phone] of ['51930951679', '51900080962'].entries()) {
    const url = new URL(await links.nth(n).getAttribute('href'));
    expect(url.pathname).toBe('/' + phone);
    for (const text of ['Tu carrito favorito', 'En cajita', 'Celeste', 'Cantidad: 2', 'Diego', 'Deportivo azul', 'todos los caminos', 'S/ 120']) expect(url.searchParams.get('text')).toContain(text);
  }
  await page.getByLabel('Cantidad de regalos').fill('3'); await expect(page.locator('#inquiry-result a')).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy(); }
  expect(errors).toEqual([]);
});

test('la marca y portada originales se conservan, con la campaña como apartado a 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/');
  await expect(page.locator('.hero h1')).toHaveText('Tu historia,hecha sorpresa.');
  await expect(page.locator('.hero-visual > img')).toHaveAttribute('src', '/assets/web/ramo-kuyari.webp');
  await expect(page.locator('.moment-card')).toHaveCount(3);
  await expect(page.locator('.promise-strip')).toBeVisible();
  await expect(page.locator('#edicion-azul')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--wine').trim())).toBe('#5a183d');
  const classic = await (await page.request.get('/api/products?excludeOccasion=30%20de%20septiembre')).json();
  expect(classic.products.every(p => !p.options.occasions.includes('30 de septiembre'))).toBeTruthy();
  await expect(page.locator('#home-products .product-card')).toHaveCount(classic.total);
  for (const name of ['ramo', 'mini', 'carritos', 'carrito', 'box', 'duo']) expect((await page.request.get(`/assets/web/septiembre-${name}.webp`)).ok()).toBeTruthy();
  expect((await page.request.get('/assets/september.css')).ok()).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('link', { name: 'Ver regalos del 30 de septiembre' }).click(); await expect(page).toHaveURL(/30-de-septiembre/);
  await expect(page.locator('#season-products .product-card')).toHaveCount(6);
  expect(await page.locator('.site-header').evaluate(el => getComputedStyle(el).getPropertyValue('--wine').trim())).toBe('#5a183d');
});
