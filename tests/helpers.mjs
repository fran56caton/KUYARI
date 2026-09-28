import { randomUUID } from 'node:crypto';
import { DB } from '../dist/server/db.js';
import { readConfig } from '../dist/server/config.js';
import { saveProduct, saveZone } from '../dist/server/catalog.js';
export function fixture() {
  const db = new DB(':memory:'), config = readConfig({ NODE_ENV: 'test', ORDER_CHANNEL: 'online', MP_COLLECTOR_ID: '123' });
  db.run('INSERT INTO categories VALUES (?,?,?,1)', 'flowers', 'flowers', 'Flores');
  saveProduct(db, { slug: 'rosas', name: 'Rosas', summary: 'Flores para compartir', description: 'Rosas con dedicatoria personalizada', price: 9000, promo: null, stock: 3, categoryId: 'flowers', active: true, featured: true, customizable: true, memoryPrice: 1000, options: { styles: ['Clásico'], colors: ['Coral'], occasions: ['Gracias'] }, images: [{ url: '/assets/web/ramo-kuyari.webp', alt: 'Rosas KUYARI' }], variants: [] }, 'rosas');
  saveZone(db, { district: 'Huánuco', province: 'Huánuco', department: 'Huánuco', fee: 1000, minDays: 1, slots: ['09:00–12:00'], active: true }, 'zone');
  const input = { items: [{ productId: 'rosas', variantId: '', qty: 1, customization: {} }], zoneId: 'zone', coupon: '', email: 'buyer@example.test', buyer: { firstName: 'Ana', lastName: 'Pérez', phone: '+51987654321' }, delivery: { recipient: 'María Pérez', phone: '+51987654321', address: 'Calle Las Flores 123', reference: '', date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), slot: '09:00–12:00', anonymous: false, otherPerson: true, secretMessage: '', instructions: '' }, consent: true, idempotencyKey: randomUUID(), expectedTotal: 10000 };
  return { db, config, input, session: { id: 'session-one', userId: null } };
}

