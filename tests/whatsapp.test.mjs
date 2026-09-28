import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { createOrder, updateOrderStatus, expireOrders } from '../dist/server/commerce.js';
import { whatsappOrder } from '../dist/server/whatsapp.js';
import { Storage } from '../dist/server/storage.js';
import sharp from 'sharp';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('WhatsApp: ambos números, privacidad y confirmación sin declarar pago', async t => {
  const f = fixture(); t.after(() => f.db.close()); f.config.ORDER_CHANNEL = 'whatsapp';
  f.input.items[0].customization = { memory: true, privacy: 'pin', pin: '123456', dedication: 'Mi historia privada' }; f.input.expectedTotal = 11000;
  f.input.delivery.secretMessage = 'Nota privada del comprador';
  const created = await createOrder(f.db, f.config, f.input, f.session);
  assert.equal(created.order.status, 'pending_confirmation'); assert.equal(created.order.payment_status, 'not_requested');
  const message = whatsappOrder(f.db, f.config, created.order);
  assert.deepEqual(message.contacts.map(c => c.phone), ['51930951679', '51900080962']);
  for (const c of message.contacts) assert.equal(new URL(c.url).searchParams.get('text'), message.message);
  assert.match(message.message, /S\/ 110.00/); assert.ok(message.message.includes(created.order.code));
  for (const secret of ['123456', created.trackingKey, f.input.delivery.secretMessage, f.input.delivery.address]) assert.ok(!message.message.includes(secret));
  assert.equal(f.db.get('SELECT active FROM digital_memories').active, 0);
  updateOrderStatus(f.db, created.order.id, 'confirmed', 'admin', 'Confirmado por WhatsApp');
  assert.equal(f.db.get('SELECT payment_status FROM orders').payment_status, 'not_requested');
  assert.equal(f.db.get('SELECT active FROM digital_memories').active, 1);
  assert.equal(f.db.get('SELECT COUNT(*) n FROM payments').n, 0);
});

test('WhatsApp: vencer devuelve el stock una sola vez e impide confirmar', async t => {
  const f = fixture(); t.after(() => f.db.close()); f.config.ORDER_CHANNEL = 'whatsapp';
  const created = await createOrder(f.db, f.config, f.input, f.session);
  assert.equal(f.db.get('SELECT stock FROM products').stock, 2);
  f.db.run('UPDATE orders SET expires_at=0'); expireOrders(f.db); expireOrders(f.db);
  assert.equal(f.db.get('SELECT stock FROM products').stock, 3);
  assert.throws(() => updateOrderStatus(f.db, created.order.id, 'confirmed', 'admin', ''), /estado/);
});

test('fotos: optimiza tamaño, persiste el archivo y rechaza contenido falso', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'kuyari-photos-'));
  const f = fixture(); t.after(() => f.db.close());
  f.config.UPLOAD_DIR = dir; const storage = new Storage(f.config);
  const photo = await sharp({ create: { width: 2400, height: 2000, channels: 3, background: '#e76f61' } }).png().toBuffer();
  const saved = await storage.put(photo, true); assert.equal(saved.mime, 'image/webp');
  const bytes = await storage.get(saved.key), metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 1800); assert.ok(bytes.length < photo.length);
  await assert.rejects(storage.put(Buffer.from('<script>not a photo</script>'), true), /Archivo no permitido/);
});
