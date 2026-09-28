import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fixture } from './helpers.mjs';
import { createApp } from '../dist/server/app.js';
import { applyPayment } from '../dist/server/commerce.js';
import { MercadoPagoProvider } from '../dist/server/payments.js';
import { hashPassword } from '../dist/server/security.js';
async function harness(t) {
  const f = fixture(), server = createApp(f.db, f.config).listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`; f.config.APP_URL = origin;
  t.after(() => { server.closeAllConnections(); server.close(); f.db.close(); });
  async function browser() {
    let cookie = '', csrf = '';
    async function request(path, method = 'GET', body, headers = {}) {
      const r = await fetch(origin + path, { method, headers: { cookie, origin, 'x-csrf-token': csrf, ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
      const data = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text();
      if (data.csrf) csrf = data.csrf;
      return { status: r.status, data, headers: r.headers };
    }
    await request('/api/session'); return request;
  }
  return { ...f, browser, origin };
}

test('API: activación de administrador requiere enlace privado y solo funciona una vez', async t => {
  const f = await harness(t); f.config.SETUP_TOKEN = 'activation-test-token-32-characters-long';
  const a = await f.browser(), b = await f.browser();
  const input = { name: 'Dueña de KUYARI', email: 'owner@example.test', password: 'ClavePrivada123456!', consent: true, setupToken: 'incorrect-token-with-more-than-32-characters' };
  assert.equal((await a('/api/setup', 'POST', input)).status, 403);
  const result = await a('/api/setup', 'POST', { ...input, setupToken: f.config.SETUP_TOKEN });
  assert.equal(result.data.user.role, 'admin');
  assert.equal((await a('/api/admin/products')).status, 200);
  assert.equal((await b('/api/setup', 'POST', { ...input, email: 'other@example.test', setupToken: f.config.SETUP_TOKEN })).status, 403);
  assert.equal(f.db.get("SELECT COUNT(*) n FROM users WHERE role='admin'").n, 1);
});
test('API: CSRF, sesiones, registro, RBAC, pedidos privados y archivos internos bloqueados', async t => {
  const f = await harness(t), a = await f.browser(), b = await f.browser();
  assert.equal((await a('/api/quote', 'POST', f.input, { origin: 'https://evil.invalid' })).status, 403);
  assert.equal((await a('/api/admin/orders')).status, 403);
  const email = `u-${randomUUID()}@example.test`;
  assert.equal((await a('/api/auth/register', 'POST', { name: 'Cliente', email, password: 'UnaClaveLarga123!', consent: true, role: 'admin' })).data.user.role, 'customer');
  assert.equal((await a('/api/admin/orders')).status, 403);
  const created = await a('/api/orders', 'POST', f.input); assert.equal(created.status, 201);
  assert.equal((await a(`/api/orders/${created.data.order.code}`)).status, 200);
  assert.equal((await b(`/api/orders/${created.data.order.code}`)).status, 404);
  assert.equal((await b('/api/orders/access', 'POST', { code: created.data.order.code, key: created.data.trackingKey })).status, 200);
  assert.equal((await b(`/api/orders/${created.data.order.code}`)).status, 200);
  assert.equal((await a(`/api/orders/${created.data.order.code}/payment`, 'POST', {})).status, 503);
  assert.equal(f.db.get('SELECT status FROM orders').status, 'pending_payment');
  for (const path of ['/.env', '/server/app.ts', '/scripts/dev-server.mjs', '/data/kuyari-development.sqlite', '/package.json', '/node_modules/express/index.js']) assert.equal((await a(path)).status, 404, path);
  assert.match((await a('/')).headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await a('/api/auth/logout', 'POST', {})).status, 200);
  assert.equal((await a('/api/account')).status, 401);
  assert.equal((await a('/api/auth/login', 'POST', { email, password: 'UnaClaveLarga123!' })).status, 200);
});
test('API: recuerdo con PIN no filtra datos de compra y el PIN nunca vuelve al comprador', async t => {
  const f = await harness(t), owner = await f.browser(), visitor = await f.browser();
  f.input.items[0].customization = { memory: true, privacy: 'pin', pin: '123456', message: '<script>unsafe</script>', recipient: 'María', sender: 'Ana', dedication: 'Nuestra historia' }; f.input.expectedTotal = 11000; f.input.delivery.anonymous = true;
  const created = await owner('/api/orders', 'POST', f.input); assert.equal(created.status, 201);
  assert.equal(created.data.order.items[0].customization.pin, '');
  const m = f.db.get('SELECT * FROM digital_memories');
  assert.equal((await visitor(`/api/memories/${m.public_token}`)).status, 404);
  applyPayment(f.db, f.config, { id: '42', reference: created.data.order.id, status: 'approved', amount: 11000, currency: 'PEN', collector: '123', live: false, refunded: 0, updated: new Date().toISOString() });
  assert.equal((await visitor(`/api/memories/${m.public_token}`)).data.needsPin, true);
  assert.equal((await visitor(`/api/memories/${m.public_token}/unlock`, 'POST', { pin: '000000' })).status, 403);
  assert.equal((await visitor(`/api/memories/${m.public_token}/unlock`, 'POST', { pin: '123456' })).status, 200);
  const result = await visitor(`/api/memories/${m.public_token}`); assert.equal(result.status, 200); assert.equal(result.data.recipient, 'María'); assert.equal(result.data.sender, '');
  for (const field of ['email', 'buyer', 'delivery', 'order_id', 'pin_hash', 'total']) assert.equal(field in result.data, false);
  assert.equal((await visitor(`/api/memories/${m.public_token}/qr`)).status, 404);
  assert.match((await owner(`/api/memories/${m.public_token}/qr`)).data, /<svg/);
  assert.equal((await owner(`/api/memories/${m.public_token}`, 'PATCH', { active: false })).status, 200);
  assert.equal((await visitor(`/api/memories/${m.public_token}`)).status, 404);
});
test('API: administración guarda productos, zonas y cupones con validación real', async t => {
  const f = await harness(t), admin = await f.browser(), id = randomUUID();
  f.db.run('INSERT INTO users (id,email,password_hash,name,role,created_at) VALUES (?,?,?,?,?,?)', id, 'admin@example.test', await hashPassword('AdministradorPrueba123!'), 'Admin', 'admin', new Date().toISOString());
  assert.equal((await admin('/api/auth/login', 'POST', { email: 'admin@example.test', password: 'AdministradorPrueba123!' })).status, 200);
  assert.equal((await admin('/api/admin/dashboard')).status, 200);
  assert.equal((await admin('/api/admin/categories/flowers', 'PATCH', { name: 'Flores especiales', active: true })).status, 200);
  assert.equal((await admin('/api/admin/coupons', 'POST', { code: 'AMOR', kind: 'percent', value: 10, start: '2026-01-01T00:00:00.000Z', end: '2099-01-01T00:00:00.000Z', minimum: 0, limit: 10, perUser: 1, active: true })).status, 200);
  assert.equal((await admin('/api/admin/coupons')).data.length, 1);
  const product = (await admin('/api/admin/products')).data[0]; const body = { ...product, active: true, featured: false, customizable: true, images: product.images.map(({ url, alt }) => ({ url, alt })) };
  assert.equal((await admin(`/api/admin/products/${product.id}`, 'PUT', body)).status, 200);
});
test('SDK oficial: firma válida aceptada, firma falsa y repetición antigua rechazadas', () => {
  const f = fixture(); f.config.MP_WEBHOOK_SECRET = 'test-signature-secret'; const p = new MercadoPagoProvider(f.config);
  const id = '123', requestId = 'request-1', ts = String(Math.floor(Date.now() / 1000));
  const sign = timestamp => createHmac('sha256', f.config.MP_WEBHOOK_SECRET).update(`id:${id};request-id:${requestId};ts:${timestamp};`).digest('hex');
  assert.doesNotThrow(() => p.verifySignature(`ts=${ts},v1=${sign(ts)}`, requestId, id));
  assert.throws(() => p.verifySignature(`ts=${ts},v1=${'0'.repeat(64)}`, requestId, id), /Firma/);
  const old = String(Math.floor(Date.now() / 1000) - 3600); assert.throws(() => p.verifySignature(`ts=${old},v1=${sign(old)}`, requestId, id), /Firma/); f.db.close();
});
