import { z } from 'zod';
import { orderStatuses } from '../shared/models.js';
const short = z.string().trim().max(180);
const blank = z.string().trim().max(1000).default('');
const safeUrl = z.string().trim().max(1000).refine(v => !v || (() => { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } })(), 'Usa un enlace HTTPS válido').default('');
export const customizationSchema = z.object({
  occasion: short.default(''), style: short.default(''), color: short.default(''), message: z.string().trim().max(1000).default(''), card: z.boolean().default(true),
  memory: z.boolean().default(false), dedication: z.string().trim().max(4000).default(''), sender: short.default(''), recipient: short.default(''),
  songUrl: safeUrl, videoUrl: safeUrl, specialDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(''),
  privacy: z.enum(['link', 'pin', 'private']).default('link'), pin: z.string().regex(/^(\d{6,12})?$/).default(''), assets: z.array(z.uuid()).max(10).default([])
}).refine(c => !c.memory || c.privacy !== 'pin' || c.pin.length >= 6, 'El recuerdo protegido necesita un PIN de 6 a 12 dígitos');
export const cartSchema = z.array(z.object({ productId: z.string().min(1).max(100), variantId: z.string().max(100).default(''), qty: z.number().int().min(1).max(20), customization: customizationSchema })).min(1).max(30);
export const quoteSchema = z.object({ items: cartSchema, zoneId: z.string().max(100), coupon: z.string().trim().max(40).default(''), email: z.email().max(254).transform(v => v.toLowerCase()) });
export const checkoutSchema = quoteSchema.extend({
  buyer: z.object({ firstName: short.min(2), lastName: short.min(2), phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/) }),
  delivery: z.object({ recipient: short.min(2), phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/), address: z.string().trim().min(8).max(300), reference: blank, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), slot: short.min(1), anonymous: z.boolean(), otherPerson: z.boolean(), secretMessage: blank, instructions: blank }),
  consent: z.literal(true), idempotencyKey: z.uuid(), expectedTotal: z.number().int().positive()
});
export const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), name: short.min(2), summary: z.string().trim().min(5).max(300), description: z.string().trim().min(5).max(8000),
  price: z.number().int().min(0).max(10000000), promo: z.number().int().positive().nullable().default(null), stock: z.number().int().min(0).max(100000), inquiryOnly: z.boolean().default(false),
  categoryId: z.string().min(1), active: z.boolean(), featured: z.boolean(), customizable: z.boolean(), memoryPrice: z.number().int().min(0).max(1000000),
  options: z.object({ styles: z.array(short).max(20), colors: z.array(short).max(20), occasions: z.array(short).max(20) }),
  images: z.array(z.object({ url: z.string().max(500).regex(/^\/(?:assets\/web\/[a-zA-Z0-9-]+\.webp|media\/products\/[a-f0-9-]+)$/), alt: short.min(2) })).min(1).max(10),
  variants: z.array(z.object({ id: z.string().max(100).default(''), label: short.min(1), priceDelta: z.number().int().min(0).max(1000000), stock: z.number().int().min(0).max(100000), active: z.boolean() })).max(20)
}).refine(p => p.inquiryOnly || p.price > 0, 'Indica un precio mayor a cero o activa la consulta por WhatsApp').refine(p => p.promo === null || (!p.inquiryOnly && p.promo < p.price), 'La promoción debe ser menor al precio y requiere un precio confirmado');
export const zoneSchema = z.object({ district: short.min(2), province: short.min(2), department: short.min(2), fee: z.number().int().min(0), minDays: z.number().int().min(1).max(30), slots: z.array(short.min(1)).min(1).max(10), active: z.boolean() });
export const couponSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,40}$/), kind: z.enum(['percent', 'fixed']), value: z.number().int().positive(), start: z.iso.datetime(), end: z.iso.datetime(), minimum: z.number().int().min(0), limit: z.number().int().positive(), perUser: z.number().int().positive(), active: z.boolean() }).refine(c => c.end > c.start && (c.kind !== 'percent' || c.value <= 100), 'Revisa fechas y porcentaje');
export const loginSchema = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(12).max(128) });
export const registerSchema = loginSchema.extend({ name: short.min(2), consent: z.literal(true) });
export const statusSchema = z.object({ status: z.enum(orderStatuses), note: z.string().trim().max(1000).default('') });
export type Checkout = z.infer<typeof checkoutSchema>;
