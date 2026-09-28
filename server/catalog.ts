import { randomUUID } from 'node:crypto';
import type { Product, Variant, Image, Zone } from '../shared/models.js';
import type { DB } from './db.js';
import { HttpError } from './security.js';
import { productSchema, zoneSchema } from './validation.js';
type ProductRow = Omit<Product, 'options' | 'variants' | 'images' | 'categoryId' | 'memoryPrice'> & { options: string; category_id: string; memory_price: number; inquiry_only: number };
export function products(db: DB, includeInactive = false): Product[] {
  const rows = db.all<ProductRow>(`SELECT p.*,c.name category FROM products p JOIN categories c ON c.id=p.category_id ${includeInactive ? '' : 'WHERE p.active=1 AND c.active=1'} ORDER BY p.featured DESC,p.created_at DESC`);
  const images = db.all<Image & { product_id: string }>('SELECT * FROM product_images ORDER BY position');
  const variants = db.all<Variant & { product_id: string; price_delta: number }>('SELECT * FROM product_variants');
  return rows.map(p => ({ id: p.id, slug: p.slug, name: p.name, summary: p.summary, description: p.description, price: p.inquiry_only ? 0 : p.price, promo: p.inquiry_only ? null : p.promo, stock: p.inquiry_only ? 0 : p.stock, inquiryOnly: !!p.inquiry_only, categoryId: p.category_id, category: p.category, active: p.active, featured: p.featured, customizable: p.customizable, memoryPrice: p.memory_price, demo: p.demo,
    options: JSON.parse(p.options) as Product['options'], images: images.filter(i => i.product_id === p.id).map(({ id, url, alt }) => ({ id, url, alt })),
    variants: variants.filter(v => v.product_id === p.id).map(v => ({ id: v.id, label: v.label, priceDelta: v.price_delta, stock: v.stock, active: v.active })) }));
}
export function saveProduct(db: DB, input: unknown, id: string = randomUUID(), demo = false) {
  const p = productSchema.parse(input);
  if (!db.get('SELECT id FROM categories WHERE id=?', p.categoryId)) throw new HttpError(400, 'Selecciona una categoría existente');
  for (const img of p.images) {
    if (img.url.startsWith('/media/products/') && !db.get('SELECT id FROM assets WHERE id=? AND public_product=1', img.url.split('/').pop()!)) throw new HttpError(400, 'Imagen no disponible');
  }
  // Legacy SQL requires a positive price. The sentinel is hidden by products(), and quote() rejects inquiry-only gifts.
  const now = new Date().toISOString();
  db.transaction(() => {
    db.run(`INSERT INTO products (id,slug,name,summary,description,price,promo,stock,category_id,active,featured,customizable,memory_price,options,demo,created_at,updated_at,inquiry_only) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,summary=excluded.summary,description=excluded.description,price=excluded.price,promo=excluded.promo,stock=excluded.stock,category_id=excluded.category_id,active=excluded.active,featured=excluded.featured,customizable=excluded.customizable,memory_price=excluded.memory_price,options=excluded.options,updated_at=excluded.updated_at,inquiry_only=excluded.inquiry_only`, id, p.slug, p.name, p.summary, p.description, p.inquiryOnly ? 1 : p.price, p.inquiryOnly ? null : p.promo, p.inquiryOnly ? 0 : p.stock, p.categoryId, +p.active, +p.featured, +p.customizable, p.memoryPrice, JSON.stringify(p.options), +demo, now, now, +p.inquiryOnly);
    db.run('DELETE FROM product_images WHERE product_id=?', id);
    p.images.forEach((i, n) => db.run('INSERT INTO product_images VALUES (?,?,?,?,?)', randomUUID(), id, i.url, i.alt, n));
    db.run('UPDATE product_variants SET active=0 WHERE product_id=?', id);
    for (const v of p.variants) {
      if (v.id && !db.get('SELECT id FROM product_variants WHERE id=? AND product_id=?', v.id, id)) throw new HttpError(400, 'Variante ajena al producto');
      db.run('INSERT INTO product_variants VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,price_delta=excluded.price_delta,stock=excluded.stock,active=excluded.active', v.id || randomUUID(), id, v.label, v.priceDelta, v.stock, +v.active);
    }
  });
  return id;
}
export function zones(db: DB, all = false): Zone[] {
  return db.all<{ id: string; district: string; province: string; department: string; fee: number; min_days: number; slots: string; active: number }>(`SELECT * FROM delivery_zones ${all ? '' : 'WHERE active=1'} ORDER BY district`).map(z => ({ id: z.id, district: z.district, province: z.province, department: z.department, fee: z.fee, minDays: z.min_days, slots: JSON.parse(z.slots) as string[], active: z.active }));
}
export function saveZone(db: DB, input: unknown, id: string = randomUUID()) {
  const z = zoneSchema.parse(input);
  db.run('INSERT INTO delivery_zones VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET district=excluded.district,province=excluded.province,department=excluded.department,fee=excluded.fee,min_days=excluded.min_days,slots=excluded.slots,active=excluded.active', id, z.district, z.province, z.department, z.fee, z.minDays, JSON.stringify(z.slots), +z.active);
  return id;
}
