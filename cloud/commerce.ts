import { randomUUID, randomBytes } from 'node:crypto';
import type { DB } from './db.js';
import type { Config } from './config.js';
import type {  Customization, OrderStatus, QuoteItem } from '../shared/models.js';
import { statusLabels } from '../shared/models.js';
import { products, zones } from './catalog.js';
import { checkoutSchema, quoteSchema, type Checkout } from './validation.js';
import { HttpError, digest, hashPassword, token, log } from './security.js';
export async function applyPayment(..._args: unknown[]): Promise<never> { throw new HttpError(503, 'Los pagos en línea están desactivados'); }
export interface OrderRow {
    channel: 'online' | 'whatsapp';
    id: string;
    code: string;
    session_id: string;
    user_id: string | null;
    email: string;
    buyer: string;
    delivery: string;
    subtotal: number;
    delivery_fee: number;
    discount: number;
    total: number;
    status: OrderStatus;
    payment_status: string;
    coupon_id: string | null;
    reserved: number;
    expires_at: number;
    preference_id: string | null;
    checkout_url: string | null;
    payment_lock: number;
    idempotency_key: string;
    request_hash: string;
    tracking_hash: string;
    created_at: string;
    updated_at: string;
}
export interface ItemRow {
    id: string;
    order_id: string;
    product_id: string;
    variant_id: string | null;
    name: string;
    image: string;
    qty: number;
    unit_price: number;
    customization: string;
}
interface Coupon {
    id: string;
    kind: string;
    value: number;
    minimum: number;
    usage_limit: number;
    per_user: number;
}
export async function quote(db: DB, raw: unknown, config: Config) {
    const input = quoteSchema.parse(raw);
    const catalog = (await products(db));
    const zone = (await zones(db)).find(z => z.id === input.zoneId);
    if (!zone)
        throw new HttpError(400, 'Selecciona una zona de entrega disponible');
    const demand = new Map<string, number>();
    const items: QuoteItem[] = input.items.map(item => {
        const p = catalog.find(p => p.id === item.productId);
        if (!p || (config.NODE_ENV === 'production' && p.demo))
            throw new HttpError(409, 'Un producto ya no está disponible');
        if (p.inquiryOnly)
            throw new HttpError(409, 'Este regalo requiere confirmar precio y disponibilidad por WhatsApp');
        const c = item.customization;
        if (!p.customizable && (c.message || c.style || c.color || c.occasion || c.memory))
            throw new HttpError(400, 'Este producto no permite personalización');
        for (const [value, allowed] of [[c.style, p.options.styles], [c.color, p.options.colors], [c.occasion, p.options.occasions]] as [
            string,
            string[]
        ][]) {
            if (value && !allowed.includes(value))
                throw new HttpError(400, 'Selecciona una opción disponible del producto');
        }
        const activeVariants = p.variants.filter(v => v.active);
        const v = activeVariants.find(v => v.id === item.variantId);
        if ((activeVariants.length && !v) || (item.variantId && !v))
            throw new HttpError(400, 'Selecciona una variante disponible');
        demand.set(p.id, (demand.get(p.id) ?? 0) + item.qty);
        if (demand.get(p.id)! > p.stock)
            throw new HttpError(409, `Stock insuficiente para ${p.name}`);
        if (v) {
            demand.set(`v:${v.id}`, (demand.get(`v:${v.id}`) ?? 0) + item.qty);
            if (demand.get(`v:${v.id}`)! > v.stock)
                throw new HttpError(409, `Stock insuficiente para ${v.label}`);
        }
        return { productId: p.id, variantId: v?.id ?? '', name: `${p.name}${v ? ` · ${v.label}` : ''}`, qty: item.qty, unitPrice: (p.promo ?? p.price) + (v?.priceDelta ?? 0) + (c.memory ? p.memoryPrice : 0), customization: c, image: p.images[0]?.url ?? '' };
    });
    const subtotal = items.reduce((n, i) => n + i.unitPrice * i.qty, 0);
    let discount = 0;
    let couponId: string | null = null;
    if (input.coupon) {
        const now = new Date().toISOString();
        const coupon = (await db.get<Coupon>('SELECT * FROM coupons WHERE code=? AND active=1 AND starts_at<=? AND ends_at>=?', input.coupon.toUpperCase(), now, now));
        if (!coupon || subtotal < coupon.minimum)
            throw new HttpError(400, 'El cupón no está disponible para esta compra');
        const count = (await db.get<{
            total: number;
            personal: number;
        }>("SELECT COUNT(*) total, COALESCE(SUM(identity_hash=?),0) personal FROM coupon_usages WHERE coupon_id=? AND status IN ('reserved','used')", digest(input.email), coupon.id))!;
        if (count.total >= coupon.usage_limit || count.personal >= coupon.per_user)
            throw new HttpError(400, 'El cupón alcanzó su límite de uso');
        discount = Math.min(subtotal - 1, coupon.kind === 'percent' ? Math.floor(subtotal * coupon.value / 100) : coupon.value);
        couponId = coupon.id;
    }
    return { items, subtotal, discount, delivery: zone.fee, total: subtotal + zone.fee - discount, couponId, zoneId: zone.id };
}
export async function history(db: DB, orderId: string, status: OrderStatus, note = '', actor: string | null = null) {
    const now = new Date().toISOString();
    (await db.run('INSERT INTO order_status_history VALUES (?,?,?,?,?,?)', randomUUID(), orderId, status, note, actor, now));
    (await db.run('UPDATE orders SET status=?, updated_at=? WHERE id=?', status, now, orderId));
    (await db.run('INSERT OR IGNORE INTO outbox (id,event_key,recipient,subject,body) SELECT ?,?,email,?,? FROM orders WHERE id=?', randomUUID(), `order:${orderId}:${status}`, `KUYARI · ${statusLabels[status]}`, `Tu pedido está en estado: ${statusLabels[status]}. Consulta su seguimiento desde Mi cuenta.`, orderId));
}
async function releaseInventory(db: DB, order: OrderRow) {
    if (!order.reserved)
        return;
    for (const i of (await db.all<ItemRow>('SELECT * FROM order_items WHERE order_id=?', order.id))) {
        (await db.run('UPDATE products SET stock=stock+? WHERE id=?', i.qty, i.product_id));
        if (i.variant_id)
            (await db.run('UPDATE product_variants SET stock=stock+? WHERE id=?', i.qty, i.variant_id));
    }
    (await db.run('UPDATE orders SET reserved=0 WHERE id=?', order.id));
    (await db.run("UPDATE coupon_usages SET status='released' WHERE order_id=? AND status='reserved'", order.id));
}
export async function expireOrders(db: DB) {
    (await db.transaction(async () => {
        const expired = (await db.all<OrderRow>("SELECT * FROM orders WHERE status IN ('pending_payment','pending_confirmation') AND expires_at<?", Date.now()));
        for (const o of expired) {
            (await releaseInventory(db, o));
            (await history(db, o.id, 'cancelled', o.channel === 'whatsapp' ? 'Plazo de confirmación vencido' : 'Plazo de pago vencido'));
        }
    }));
}
async function validateDelivery(db: DB, input: Checkout) {
    const z = (await zones(db)).find(z => z.id === input.zoneId)!;
    if (!z || !z.slots.includes(input.delivery.slot))
        throw new HttpError(400, 'Horario de entrega no disponible');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const min = Date.parse(`${today}T00:00:00Z`) + z.minDays * 86400000;
    const desired = Date.parse(`${input.delivery.date}T00:00:00Z`);
    if (!Number.isFinite(desired) || new Date(desired).toISOString().slice(0, 10) !== input.delivery.date || desired < min || desired > min + 90 * 86400000)
        throw new HttpError(400, 'Elige una fecha disponible dentro de los próximos 90 días');
    return { ...input.delivery, district: z.district, province: z.province, department: z.department };
}
export async function createOrder(db: DB, config: Config, raw: unknown, session: {
    id: string;
    userId: string | null;
}) {
    const input = checkoutSchema.parse(raw);
    if (config.NODE_ENV === 'production' && config.STORE_LIVE !== 'true')
        throw new HttpError(503, 'La tienda todavía no ha habilitado compras');
    const requestHash = digest(JSON.stringify(input));
    const previous = (await db.get<OrderRow>('SELECT * FROM orders WHERE session_id=? AND idempotency_key=?', session.id, input.idempotencyKey));
    if (previous) {
        if (previous.request_hash !== requestHash)
            throw new HttpError(409, 'La compra cambió; revisa nuevamente el resumen');
        return { order: previous, trackingKey: null };
    }
    const pins = await Promise.all(input.items.map(i => i.customization.memory && i.customization.privacy === 'pin' ? hashPassword(i.customization.pin) : Promise.resolve(null)));
    (await expireOrders(db));
    const created = await (await db.transaction(async () => {
        // Recheck after asynchronous password derivation to serialize concurrent retries.
        const existing = (await db.get<OrderRow>('SELECT * FROM orders WHERE session_id=? AND idempotency_key=?', session.id, input.idempotencyKey));
        if (existing) {
            if (existing.request_hash !== requestHash)
                throw new HttpError(409, 'La compra cambió; revisa nuevamente el resumen');
            return { order: existing, trackingKey: null };
        }
        const q = (await quote(db, input, config));
        if (q.total !== input.expectedTotal)
            throw new HttpError(409, 'El precio cambió. Actualiza el resumen antes de confirmar');
        const delivery = (await validateDelivery(db, input));
        for (const item of q.items)
            for (const assetId of item.customization.assets) {
                if (!(await db.get('SELECT id FROM assets WHERE id=? AND (session_id=? OR (user_id IS NOT NULL AND user_id=?)) AND public_product=0', assetId, session.id, session.userId)))
                    throw new HttpError(403, 'Un archivo no pertenece a esta compra');
            }
        const id = randomUUID(), code = `KU-${randomBytes(5).toString('hex').toUpperCase()}`, trackingKey = token(), now = new Date().toISOString();
        (await db.run(`INSERT INTO orders (id,code,session_id,user_id,email,buyer,delivery,subtotal,delivery_fee,discount,total,status,coupon_id,expires_at,idempotency_key,request_hash,tracking_hash,policy_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending_payment',?,?,?,?,?,?,?,?)`, id, code, session.id, session.userId, input.email, JSON.stringify(input.buyer), JSON.stringify(delivery), q.subtotal, q.delivery, q.discount, q.total, q.couponId, Date.now() + 30 * 60000, input.idempotencyKey, requestHash, digest(trackingKey), '2026-09-27', now, now));
        (await db.run('INSERT INTO session_orders VALUES (?,?)', session.id, id));
        if (config.ORDER_CHANNEL === 'whatsapp')
            (await db.run("UPDATE orders SET channel='whatsapp',payment_status='not_requested',expires_at=? WHERE id=?", Date.now() + 24 * 3600000, id));
        (await Promise.all(q.items.map(async (item, index) => {
            const c = { ...item.customization, pin: '' };
            const itemId = randomUUID();
            (await db.run('UPDATE products SET stock=stock-? WHERE id=? ', item.qty, item.productId));
            if (item.variantId)
                (await db.run('UPDATE product_variants SET stock=stock-? WHERE id=? ', item.qty, item.variantId));
            (await db.run('INSERT INTO order_items VALUES (?,?,?,?,?,?,?,?,?)', itemId, id, item.productId, item.variantId || null, item.name, item.image, item.qty, item.unitPrice, JSON.stringify(c)));
            if (c.memory) {
                const memoryId = randomUUID();
                const content = { dedication: c.dedication, message: c.card ? c.message : '', sender: delivery.anonymous ? '' : c.sender, recipient: c.recipient, songUrl: c.songUrl, videoUrl: c.videoUrl, specialDate: c.specialDate };
                (await db.run('INSERT INTO digital_memories VALUES (?,?,?,?,?,?,?,0)', memoryId, id, itemId, token(), c.privacy, pins[index], JSON.stringify(content)));
                for (const assetId of new Set(c.assets))
                    (await db.run('INSERT INTO memory_assets VALUES (?,?)', memoryId, assetId));
            }
        })));
        if (q.couponId)
            (await db.run('INSERT INTO coupon_usages VALUES (?,?,?,?,?)', randomUUID(), q.couponId, id, digest(input.email), 'reserved'));
        (await history(db, id, config.ORDER_CHANNEL === 'whatsapp' ? 'pending_confirmation' : 'pending_payment'));
        (await db.audit(session.userId, 'order.created', id));
        log('order.created', { orderId: id });
        return { orderId: id, trackingKey };
    }));
    return 'order' in created ? created : { order: (await db.get<OrderRow>('SELECT * FROM orders WHERE id=?', created.orderId))!, trackingKey: created.trackingKey };
}
export async function canReadOrder(db: DB, o: OrderRow, sessionId: string, userId: string | null) {
    return Boolean((userId && o.user_id === userId) || (await db.get('SELECT order_id FROM session_orders WHERE session_id=? AND order_id=?', sessionId, o.id)));
}
export async function orderView(db: DB, o: OrderRow, admin = false) {
    const items = (await db.all<ItemRow>('SELECT * FROM order_items WHERE order_id=?', o.id)).map(i => ({ id: i.id, name: i.name, qty: i.qty, unitPrice: i.unit_price, image: i.image, customization: JSON.parse(i.customization) as Customization }));
    return { id: o.id, code: o.code, channel: o.channel, status: o.status, paymentStatus: o.payment_status, subtotal: o.subtotal, deliveryFee: o.delivery_fee, discount: o.discount, total: o.total, createdAt: o.created_at, expiresAt: o.expires_at, items,
        buyer: JSON.parse(o.buyer) as Checkout['buyer'], email: o.email, delivery: JSON.parse(o.delivery) as Checkout['delivery'],
        history: (await db.all('SELECT status,created_at date FROM order_status_history WHERE order_id=? ORDER BY created_at', o.id)),
        memories: (await db.all('SELECT public_token token,privacy,active FROM digital_memories WHERE order_id=?', o.id)),
        ...(admin ? { payments: (await db.all('SELECT provider,provider_id,status,amount,refunded,created_at FROM payments WHERE order_id=?', o.id)), auditHistory: (await db.all('SELECT status,note,actor,created_at FROM order_status_history WHERE order_id=? ORDER BY created_at', o.id)) } : {}) };
}
const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = { pending_confirmation: ['confirmed', 'cancelled'], pending_payment: ['cancelled'], paid: ['confirmed'], confirmed: ['preparing'], preparing: ['ready'], ready: ['shipped'], shipped: ['delivered'] };
export async function updateOrderStatus(db: DB, id: string, status: OrderStatus, actor: string, note: string) {
    (await db.transaction(async () => {
        const o = (await db.get<OrderRow>('SELECT * FROM orders WHERE id=?', id));
        if (!o)
            throw new HttpError(404, 'Pedido no encontrado');
        if (!transitions[o.status]?.includes(status))
            throw new HttpError(409, 'Ese cambio no corresponde al estado actual. Los pagos y reembolsos se verifican con el proveedor');
        if (status === 'cancelled')
            (await releaseInventory(db, o));
        if (status === 'confirmed' && o.channel === 'whatsapp') {
            (await db.run("UPDATE coupon_usages SET status='used' WHERE order_id=?", o.id));
            (await db.run('UPDATE digital_memories SET active=1 WHERE order_id=?', o.id));
        }
        (await history(db, id, status, note, actor));
        (await db.audit(actor, `order.${status}`, id));
    }));
}
