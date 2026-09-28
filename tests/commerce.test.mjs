import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture } from './helpers.mjs';
import { quote, createOrder, applyPayment, expireOrders, updateOrderStatus } from '../dist/server/commerce.js';
test('el precio del navegador nunca controla el cobro y el stock agregado se valida', () => {
  const f = fixture();
  assert.equal(quote(f.db, { ...f.input, items: [{ ...f.input.items[0], price: 1 }] }, f.config).total, 10000);
  assert.throws(() => quote(f.db, { ...f.input, items: [{ ...f.input.items[0], qty: 2 }, { ...f.input.items[0], qty: 2 }] }, f.config), /Stock insuficiente/);
  f.db.close();
});
test('el pedido es atómico, persiste personalización completa y reintentar no duplica ni descuenta stock', async () => {
  const f = fixture(); const message = 'Una historia '.repeat(40).trim(); f.input.items[0].customization = { message, memory: true, dedication: 'Siempre juntos', privacy: 'pin', pin: '123456' }; f.input.expectedTotal = 11000;
  const [a, b] = await Promise.all([createOrder(f.db, f.config, f.input, f.session), createOrder(f.db, f.config, f.input, f.session)]);
  assert.equal(a.order.id, b.order.id); assert.equal(f.db.get('SELECT stock FROM products').stock, 2);
  const saved = JSON.parse(f.db.get('SELECT customization FROM order_items').customization); assert.equal(saved.message, message); assert.equal(saved.pin, '');
  const memory = f.db.get('SELECT * FROM digital_memories'); assert.ok(memory.pin_hash); assert.equal(memory.active, 0); assert.ok(memory.public_token.length >= 43);
  await assert.rejects(() => createOrder(f.db, f.config, { ...f.input, email: 'other@example.test' }, f.session), /compra cambió/); f.db.close();
});
test('rechaza total cambiado y nunca deja reservas parciales', async () => {
  const f = fixture(); await assert.rejects(() => createOrder(f.db, f.config, { ...f.input, expectedTotal: 1 }, f.session), /precio cambió/);
  assert.equal(f.db.get('SELECT stock FROM products').stock, 3); assert.equal(f.db.get('SELECT COUNT(*) n FROM orders').n, 0); f.db.close();
});
test('pagos verifican importe, cuenta y modo; repeticiones y eventos antiguos son idempotentes', async () => {
  const f = fixture(), { order } = await createOrder(f.db, f.config, f.input, f.session);
  const payment = { id: '987', reference: order.id, status: 'approved', amount: 10000, currency: 'PEN', collector: '123', live: false, refunded: 0, updated: new Date().toISOString() };
  assert.throws(() => applyPayment(f.db, f.config, { ...payment, amount: 1 }), /no coincide/);
  assert.throws(() => applyPayment(f.db, f.config, { ...payment, collector: 'bad' }), /no coincide/);
  assert.throws(() => applyPayment(f.db, f.config, { ...payment, live: true }), /no coincide/);
  applyPayment(f.db, f.config, payment); applyPayment(f.db, f.config, payment);
  applyPayment(f.db, f.config, { ...payment, status: 'pending', updated: '2020-01-01T00:00:00.000Z' });
  assert.equal(f.db.get('SELECT status FROM orders').status, 'paid'); assert.equal(f.db.get('SELECT COUNT(*) n FROM payments').n, 1); assert.equal(f.db.get("SELECT COUNT(*) n FROM order_status_history WHERE status='paid'").n, 1);
  assert.throws(() => updateOrderStatus(f.db, order.id, 'delivered', 'staff', ''), /estado actual/);
  updateOrderStatus(f.db, order.id, 'confirmed', 'staff', ''); assert.equal(f.db.get('SELECT status FROM orders').status, 'confirmed'); f.db.close();
});
test('expirar libera una sola vez; un pago tardío queda en revisión', async () => {
  const f = fixture(), { order } = await createOrder(f.db, f.config, f.input, f.session);
  f.db.run('UPDATE orders SET expires_at=0'); expireOrders(f.db); expireOrders(f.db);
  assert.equal(f.db.get('SELECT stock FROM products').stock, 3);
  applyPayment(f.db, f.config, { id: '1234', reference: order.id, status: 'approved', amount: 10000, currency: 'PEN', collector: '123', live: false, refunded: 0, updated: new Date().toISOString() });
  assert.equal(f.db.get('SELECT status FROM orders').status, 'payment_review'); f.db.close();
});
test('cupón se valida en backend y su límite incluye reservas', async () => {
  const f = fixture(); f.db.run('INSERT INTO coupons VALUES (?,?,?,?,?,?,?,?,?,?)', 'coupon', 'HISTORIA', 'percent', 10, '2020-01-01', '2099-01-01', 5000, 1, 1, 1);
  f.input.coupon = 'HISTORIA'; f.input.expectedTotal = 9100;
  await createOrder(f.db, f.config, f.input, f.session);
  await assert.rejects(() => createOrder(f.db, f.config, { ...f.input, idempotencyKey: randomUUID() }, f.session), /límite/); f.db.close();
});
