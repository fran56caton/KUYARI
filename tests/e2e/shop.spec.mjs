import { test, expect } from '@playwright/test';
test('compra móvil: producto, Studio, recuerdo, recarga, pedido y seguimiento sin cobros ficticios', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.locator('#home-products .product-card').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator('#home-products .product-card a').first().click();
  await page.getByRole('link', { name: 'Personalizar mi regalo' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Dedicatoria de la tarjeta').fill('Una historia que sigue floreciendo. '.repeat(12).trim());
  await page.getByLabel('Tu nombre para el recuerdo').fill('Ana'); await page.getByLabel('Nombre de la persona especial').fill('María');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel(/Añadir Recuerdo Digital/).check(); await page.getByLabel('La historia detrás de este regalo').fill('Gracias por cada capítulo compartido.');
  await page.getByLabel('¿Quién podrá abrirlo?').selectOption('pin'); await page.getByLabel('PIN de 6 a 12 dígitos').fill('234567');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('button', { name: 'Añadir a mi caja' }).click();
  await expect(page).toHaveURL(/checkout/); await page.reload();
  await expect(page.locator('.checkout-summary .dedication')).toContainText('Una historia que sigue floreciendo.');
  await page.getByLabel('Nombres', { exact: true }).fill('Ana'); await page.getByLabel('Apellidos').fill('Pérez'); await page.getByLabel('Correo electrónico').fill('ana@example.test'); await page.getByLabel('Tu teléfono').fill('987654321');
  await page.getByLabel('Nombre del destinatario').fill('María'); await page.getByLabel('Teléfono del destinatario').fill('987654322'); await page.getByLabel('Dirección de entrega').fill('Calle Las Flores 123');
  await page.getByRole('checkbox', { name: /He leído y acepto/ }).check();
  await page.getByRole('button', { name: 'Revisar total y entrega' }).click(); await expect(page.locator('.grand-total')).toContainText('110.00');
  await page.getByRole('button', { name: 'Guardar pedido y elegir WhatsApp', exact: true }).click(); await expect(page).toHaveURL(/pedido\/KU-/);
  await expect(page.locator('.status-pill')).toHaveText('Por confirmar en WhatsApp'); await expect(page.locator('#payment-action')).toContainText('No se ha realizado ningún cobro');
  const contacts = page.locator('#payment-action a[href^="https://wa.me/"]');
  await expect(contacts).toHaveCount(2);
  for (const [i, phone] of ['51930951679', '51900080962'].entries()) {
    const link = new URL(await contacts.nth(i).getAttribute('href'));
    expect(link.pathname).toBe(`/${phone}`); expect(link.searchParams.get('text')).toContain('Pedido: KU-');
    expect(link.searchParams.get('text')).not.toContain('234567');
  }
  await page.reload(); await expect(page.locator('.order-detail-item .dedication')).toContainText('Una historia que sigue floreciendo.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/mobile-order.png', fullPage: true });
  await page.getByRole('link', { name: /Recuerdo 1/ }).click(); await expect(page.getByRole('heading', { name: 'Para María.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('subir varias fotos, elegir portada y publicar un producto con persistencia', async ({ page }) => {
  await page.goto('/cuenta'); const login = page.locator('#login-form');
  await login.getByLabel('Correo electrónico').fill('admin@example.test'); await login.getByLabel('Contraseña', { exact: true }).fill('AdministradorPrueba123!'); await login.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('link', { name: 'Administrar KUYARI' }).click(); await page.getByRole('button', { name: 'Productos', exact: true }).click();
  await page.getByRole('button', { name: '+ Subir nuevo producto', exact: true }).click();
  await page.getByLabel('Nombre del producto').fill('Mi ramo disponible');
  await expect(page.getByLabel('Nombre para la URL')).toHaveValue('mi-ramo-disponible');
  await page.getByLabel('Precio en soles', { exact: true }).fill('145'); await page.getByLabel(/Stock disponible \(no/).fill('7');
  await page.getByLabel('Descripción corta').fill('Ramo disponible con dedicatoria'); await page.getByLabel('Descripción completa').fill('Preparado a mano para una ocasión especial.');
  await page.locator('#product-upload').setInputFiles(['assets/web/ramo-kuyari.webp', 'assets/web/caja-floral.webp']);
  await expect(page.locator('#photo-status')).toContainText('2 fotos listas');
  await page.getByRole('button', { name: 'Usar como portada' }).click();
  const cover = await page.locator('#product-images img').first().getAttribute('src');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('.admin-product-card').filter({ hasText: 'Mi ramo disponible' })).toContainText('7 disponibles');
  await page.goto('/regalos/mi-ramo-disponible'); await page.reload();
  await expect(page.getByRole('heading', { name: 'Mi ramo disponible', exact: true })).toBeVisible();
  await expect(page.locator('#main-photo')).toHaveAttribute('src', cover); await expect(page.locator('.thumbnails button')).toHaveCount(2);
  expect((await page.request.get(cover)).headers()['content-type']).toContain('image/webp');
  await expect(page.locator('.large-price')).toContainText('145.00');
});
test('registro, sesión, restricciones y panel administrativo con datos reales de prueba', async ({ page }) => {
  await page.goto('/cuenta'); const form = page.locator('#register-form');
  await form.getByLabel('Nombre', { exact: true }).fill('Cliente E2E'); await form.getByLabel('Correo electrónico').fill(`cliente-${Date.now()}@example.test`); await form.getByLabel(/Contraseña/).fill('ClienteSeguro123!'); await form.getByRole('checkbox').check(); await form.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Mis pedidos' })).toBeVisible(); await page.goto('/admin'); await expect(page.getByRole('heading', { name: 'Acceso reservado.' })).toBeVisible();
  await page.goto('/cuenta'); await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  const login = page.locator('#login-form'); await login.getByLabel('Correo electrónico').fill('admin@example.test'); await login.getByLabel('Contraseña', { exact: true }).fill('AdministradorPrueba123!'); await login.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('link', { name: 'Administrar KUYARI' }).click(); await expect(page.locator('.metrics')).toContainText('Pedidos');
  await page.getByRole('button', { name: 'Pedidos', exact: true }).click(); await page.locator('[data-order]').first().click(); await expect(page.getByRole('heading', { name: 'Pagos verificados' })).toBeVisible();
  await page.getByRole('button', { name: 'Productos', exact: true }).click(); await page.locator('.admin-product-card').filter({ has: page.getByRole('heading', { name: 'Rosas', exact: true }) }).getByRole('button', { name: 'Editar producto' }).click(); await page.getByLabel('Precio en soles', { exact: true }).fill('95'); await page.getByRole('button', { name: 'Guardar', exact: true }).click(); await expect(page.locator('#admin-content')).toContainText('95.00');
  await page.setViewportSize({ width: 320, height: 800 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
test('inicio de escritorio, filtros, carrito con teclado y asistente de catálogo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/'); await expect(page.locator('#home-products .product-card').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Ver mi carrito' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/regalos'); await page.getByLabel('Buscar un regalo').fill('inexistente'); await page.getByRole('button', { name: 'Buscar', exact: true }).click(); await expect(page.locator('#catalog-grid')).toContainText('No encontramos');
  await page.goto('/asistente'); for (let n = 0; n < 5; n++) await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByRole('button', { name: 'Encontrar mi sorpresa' }).click(); await expect(page.locator('#recommendations .product-card')).toHaveCount(1);
});
