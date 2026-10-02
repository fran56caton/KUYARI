import express, { type Request, type Response, type NextFunction } from './router.js';
import { helmet } from './router.js';
import { rateLimit } from './router.js';
import { multer } from './router.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
const resolve = (...parts: string[]) => parts.join('/');
import QRCode from 'qrcode';
import { registerRomance, romanceAssetReadable } from './romance.js';
import { registerYape } from './yape.js';
import type { Config } from './config.js';
import { paymentReady } from './config.js';
import type { DB } from './db.js';
import type { User } from '../shared/models.js';
import { sessions, csrfGuard, requireUser, requireStaff, requireAdmin, rotateSession } from './auth.js';
import { products, saveProduct, zones, saveZone } from './catalog.js';
import { quote, createOrder, orderView, canReadOrder, expireOrders, updateOrderStatus, applyPayment, type OrderRow } from './commerce.js';
import { MercadoPagoProvider, type PaymentProvider } from './payments.js';
import { Storage } from './storage.js';
import { whatsappOrder } from './whatsapp.js';
import { HttpError, log, token, digest, hashPassword, verifyPassword } from './security.js';
import { loginSchema, registerSchema, statusSchema, couponSchema } from './validation.js';
interface Memory {
    id: string;
    order_id: string;
    public_token: string;
    privacy: string;
    pin_hash: string | null;
    content: string;
    active: number;
}
interface Asset {
    id: string;
    storage_key: string;
    mime: string;
    size: number;
    public_product: number;
    session_id: string;
    user_id: string | null;
}
const text = z.string().trim().max(300);
const idParam = (req: Request, key = 'id') => z.string().min(1).max(100).parse(req.params[key]);
const escape = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function createApp(db: DB, config: Config, provider: PaymentProvider = new MercadoPagoProvider(config)) {
    const app = express(), storage = new Storage(db.bucket);
    app.disable('x-powered-by');
    if (config.TRUST_PROXY === 'true')
        app.set('trust proxy', 1);
    app.use(helmet({ contentSecurityPolicy: { directives: {
                defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'blob:'], mediaSrc: ["'self'", 'https:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], formAction: ["'self'"], ...(config.NODE_ENV !== 'production' ? { upgradeInsecureRequests: null } : {})
            } }, referrerPolicy: { policy: 'no-referrer' }, strictTransportSecurity: config.NODE_ENV === 'production' ? { maxAge: 31536000 } : false }));
    app.use(express.json({ limit: '100kb', strict: true }));
    app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
    const limiter = (limit: number, minutes = 15) => rateLimit({ windowMs: minutes * 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo' } });
    app.get('/assets/september.css', (_req, res) => res.sendFile(resolve('assets/september.css')));
    app.get('/assets/love.css', (_req, res) => res.sendFile(resolve('assets/love.css')));
    app.get('/health', async (_req, res) => { (await db.get('SELECT 1')); res.json({ status: 'ok' }); });
    app.post('/api/payments/webhook', limiter(600), async (req, res) => {
        const dataId = z.string().regex(/^\d{1,32}$/).parse(req.query['data.id']);
        provider.verifySignature(req.get('x-signature') ?? '', req.get('x-request-id') ?? '', dataId);
        if (req.query.type && req.query.type !== 'payment')
            throw new HttpError(400, 'Tipo de evento no admitido');
        const payment = await provider.getPayment(dataId);
        if (payment.id !== dataId)
            throw new HttpError(409, 'Identificador de pago inconsistente');
        (await applyPayment(db, config, payment));
        res.json({ received: true });
    });
    app.use('/api', limiter(900), sessions(db, config), csrfGuard(config));
    registerRomance(app, db, config, limiter);
    registerYape(app, db, authorizedOrder);
    app.get('/api/session', (_req, res) => res.json({ csrf: res.locals.session.csrf, user: res.locals.session.user }));
    app.get('/api/store', async (_req, res) => res.json({ name: 'KUYARI', currency: 'PEN', environment: config.NODE_ENV, orderChannel: config.ORDER_CHANNEL, whatsapp: [config.WHATSAPP_PRIMARY, config.WHATSAPP_SECONDARY], hasDemoProducts: Boolean((await db.get('SELECT id FROM products WHERE demo=1 AND active=1 LIMIT 1'))), paymentMode: config.PAYMENT_MODE, paymentReady: config.ORDER_CHANNEL === 'online' && paymentReady(config), storeLive: config.STORE_LIVE === 'true', businessName: config.BUSINESS_NAME, businessEmail: config.BUSINESS_EMAIL, zones: (await zones(db)), categories: (await db.all('SELECT * FROM categories WHERE active=1')) }));
    app.get('/api/products', async (req, res) => {
        const q = z.string().max(100).default('').parse(req.query.q).toLocaleLowerCase('es');
        const category = z.string().max(100).default('').parse(req.query.category);
        const occasion = z.string().max(100).default('').parse(req.query.occasion);
        const excludeOccasion = z.string().max(100).default('').parse(req.query.excludeOccasion);
        const sort = z.enum(['featured', 'price_asc', 'price_desc', 'popular']).default('featured').parse(req.query.sort);
        const page = z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
        const budget = req.query.budget === undefined ? Infinity : z.coerce.number().int().positive().parse(req.query.budget);
        let list = (await products(db)).filter(p => (!category || p.categoryId === category) && (!occasion || p.options.occasions.includes(occasion)) && (!excludeOccasion || !p.options.occasions.includes(excludeOccasion)) && `${p.name} ${p.summary} ${p.options.occasions.join(' ')}`.toLocaleLowerCase('es').includes(q) && (budget === Infinity || (!p.inquiryOnly && (p.promo ?? p.price) <= budget)));
        if (sort === 'price_asc')
            list.sort((a, b) => Number(a.inquiryOnly) - Number(b.inquiryOnly) || (a.promo ?? a.price) - (b.promo ?? b.price));
        if (sort === 'price_desc')
            list.sort((a, b) => Number(a.inquiryOnly) - Number(b.inquiryOnly) || (b.promo ?? b.price) - (a.promo ?? a.price));
        if (sort === 'popular') {
            const counts = new Map((await db.all<{
                product_id: string;
                n: number;
            }>("SELECT i.product_id,SUM(i.qty) n FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.payment_status='approved' GROUP BY i.product_id")).map(r => [r.product_id, r.n]));
            list = list.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
        }
        res.json({ products: list.slice((page - 1) * 12, page * 12), total: list.length, page, pages: Math.ceil(list.length / 12) });
    });
    app.get('/api/products/:slug', async (req, res) => {
        const p = (await products(db)).find(p => p.slug === req.params.slug);
        if (!p)
            throw new HttpError(404, 'Regalo no encontrado');
        res.json(p);
    });
    app.get('/api/products/by-id/:id', async (req, res) => {
        const p = (await products(db)).find(p => p.id === idParam(req));
        if (!p)
            throw new HttpError(404, 'Regalo no encontrado');
        res.json(p);
    });
    app.post('/api/quote', async (req, res) => { (await expireOrders(db)); res.json((await quote(db, req.body, config))); });
    app.post('/api/orders', limiter(30), async (req, res) => {
        const result = await (await createOrder(db, config, req.body, res.locals.session));
        res.status(201).json({ order: (await orderView(db, result.order)), trackingKey: result.trackingKey });
    });
    async function authorizedOrder(req: Request, res: Response) {
        const o = (await db.get<OrderRow>('SELECT * FROM orders WHERE code=?', idParam(req, 'code')));
        if (!o || !(await canReadOrder(db, o, res.locals.session.id, res.locals.session.userId)))
            throw new HttpError(404, 'Pedido no encontrado o acceso no validado');
        return o;
    }
    app.post('/api/orders/access', limiter(12), async (req, res) => {
        const input = z.object({ code: z.string().regex(/^KU-[A-F0-9]{10}$/), key: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).parse(req.body);
        const o = (await db.get<OrderRow>('SELECT * FROM orders WHERE code=? AND tracking_hash=?', input.code, digest(input.key)));
        if (!o)
            throw new HttpError(404, 'No pudimos validar esos datos');
        (await db.run('INSERT OR IGNORE INTO session_orders VALUES (?,?)', res.locals.session.id, o.id));
        res.json({ code: o.code });
    });
    app.get('/api/orders/:code', async (req, res) => res.json((await orderView(db, (await authorizedOrder(req, res))))));
    app.get('/api/orders/:code/whatsapp', async (req, res) => res.json((await whatsappOrder(db, config, (await authorizedOrder(req, res))))));
    app.post('/api/orders/:code/payment', limiter(15), async (req, res) => {
        const o = (await authorizedOrder(req, res));
        if (o.channel !== 'online' || config.ORDER_CHANNEL !== 'online')
            throw new HttpError(409, 'Este pedido se coordina por WhatsApp');
        if (o.status !== 'pending_payment' || o.expires_at <= Date.now())
            throw new HttpError(409, 'Este pedido ya no admite iniciar un pago');
        if (o.checkout_url)
            return res.json({ url: o.checkout_url });
        const lock = (await db.run('UPDATE orders SET payment_lock=? WHERE id=? AND payment_lock<?', Date.now() + 30000, o.id, Date.now()));
        if (!lock.changes)
            throw new HttpError(409, 'Ya se está iniciando el pago. Espera unos segundos');
        try {
            const checkout = await provider.createCheckout(o);
            (await db.run('UPDATE orders SET preference_id=?,checkout_url=? WHERE id=?', checkout.id, checkout.url, o.id));
            res.json({ url: checkout.url });
        }
        finally {
            (await db.run('UPDATE orders SET payment_lock=0 WHERE id=?', o.id));
        }
    });
    app.post('/api/auth/register', limiter(8), async (req, res) => {
        const data = registerSchema.parse(req.body), password = await hashPassword(data.password);
        if ((await db.get('SELECT id FROM users WHERE email=?', data.email)))
            throw new HttpError(409, 'No fue posible crear esa cuenta. Intenta iniciar sesión o recuperar el acceso');
        const user: User = { id: randomUUID(), email: data.email, name: data.name, role: 'customer' };
        (await db.run('INSERT INTO users (id,email,password_hash,name,created_at) VALUES (?,?,?,?,?)', user.id, user.email, password, user.name, new Date().toISOString()));
        const s = (await rotateSession(db, config, res, user));
        res.status(201).json({ user, csrf: s.csrf });
    });
    const dummyHashPromise = Promise.resolve('pbkdf2:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000');
    app.post('/api/setup', limiter(5), async (req, res) => {
        const input = registerSchema.extend({ setupToken: z.string().min(32).max(128) }).parse(req.body);
        if (!config.SETUP_TOKEN || digest(input.setupToken) !== digest(config.SETUP_TOKEN) || (await db.get("SELECT id FROM users WHERE role='admin' LIMIT 1")))
            throw new HttpError(403, 'Este enlace de activación no está disponible');
        const password = await hashPassword(input.password);
        const user: User = { id: randomUUID(), email: input.email, name: input.name, role: 'admin' };
        (await db.transaction(async () => {
            if ((await db.get("SELECT id FROM users WHERE role='admin' LIMIT 1")))
                throw new HttpError(403, 'El acceso ya fue configurado');
            (await db.run('INSERT INTO users (id,email,password_hash,name,role,created_at) VALUES (?,?,?,?,?,?)', user.id, user.email, password, user.name, user.role, new Date().toISOString()));
            (await db.audit(user.id, 'admin.activated', user.id));
        }));
        const s = (await rotateSession(db, config, res, user));
        res.status(201).json({ user, csrf: s.csrf });
    });
    app.post('/api/auth/login', limiter(20), async (req, res) => {
        const data = loginSchema.parse(req.body);
        const row = (await db.get<User & {
            password_hash: string;
        }>('SELECT * FROM users WHERE email=? AND disabled=0', data.email));
        const valid = await verifyPassword(data.password, row?.password_hash ?? await dummyHashPromise);
        if (!row || !valid)
            throw new HttpError(401, 'Correo o contraseña incorrectos');
        const user: User = { id: row.id, email: row.email, name: row.name, role: row.role };
        const s = (await rotateSession(db, config, res, user));
        res.json({ user, csrf: s.csrf });
    });
    app.post('/api/auth/logout', async (_req, res) => { const s = (await rotateSession(db, config, res, null)); res.json({ csrf: s.csrf, user: null }); });
    app.post('/api/auth/forgot', limiter(5), async (req, res) => {
        const email = z.email().max(254).parse(req.body.email).toLowerCase();
        if (!config.SMTP_HOST)
            throw new HttpError(503, 'La recuperación por correo no está disponible en este momento');
        const u = (await db.get<User>('SELECT * FROM users WHERE email=? AND disabled=0', email));
        if (u) {
            const reset = token();
            (await db.run('DELETE FROM password_resets WHERE user_id=?', u.id));
            (await db.run('INSERT INTO password_resets VALUES (?,?,?)', digest(reset), u.id, Date.now() + 15 * 60000));
            (await db.run('INSERT INTO outbox (id,event_key,recipient,subject,body) VALUES (?,?,?,?,?)', randomUUID(), `reset:${randomUUID()}`, email, 'Recupera tu acceso a KUYARI', `Abre este enlace antes de 15 minutos: ${config.APP_URL}/recuperar#${reset}\nSi no lo solicitaste, ignora este correo.`));
        }
        res.json({ message: 'Si existe una cuenta con ese correo, recibirás un enlace de recuperación' });
    });
    app.post('/api/auth/reset', limiter(8), async (req, res) => {
        const data = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: loginSchema.shape.password }).parse(req.body);
        const hashed = await hashPassword(data.password);
        (await db.transaction(async () => {
            const r = (await db.get<{
                user_id: string;
            }>('SELECT * FROM password_resets WHERE token_hash=? AND expires_at>?', digest(data.token), Date.now()));
            if (!r)
                throw new HttpError(400, 'El enlace venció o ya fue utilizado');
            (await db.run('UPDATE users SET password_hash=? WHERE id=?', hashed, r.user_id));
            (await db.run('DELETE FROM sessions WHERE user_id=?', r.user_id));
            (await db.run('DELETE FROM password_resets WHERE user_id=?', r.user_id));
        }));
        res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión' });
    });
    app.get('/api/account', requireUser, async (_req, res) => {
        const u = res.locals.session.user!;
        res.json({ user: u, orders: (await db.all('SELECT code,status,total,created_at date FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100', u.id)), addresses: (await db.all<{
                id: string;
                data: string;
            }>('SELECT id,data FROM addresses WHERE user_id=?', u.id)).map(a => ({ id: a.id, ...JSON.parse(a.data) as object })), memories: (await db.all('SELECT m.public_token token,m.privacy,m.active,o.code FROM digital_memories m JOIN orders o ON o.id=m.order_id WHERE o.user_id=?', u.id)) });
    });
    app.patch('/api/account', requireUser, async (req, res) => { const name = text.min(2).parse(req.body.name); (await db.run('UPDATE users SET name=? WHERE id=?', name, res.locals.session.userId)); res.json({ ok: true }); });
    app.post('/api/account/addresses', requireUser, async (req, res) => {
        const address = z.object({ label: text.min(2), recipient: text.min(2), phone: text.min(7), address: text.min(8), zoneId: text.min(1) }).parse(req.body);
        if (!(await zones(db)).some(z => z.id === address.zoneId))
            throw new HttpError(400, 'Zona no disponible');
        if ((await db.get<{
            n: number;
        }>('SELECT COUNT(*) n FROM addresses WHERE user_id=?', res.locals.session.userId))!.n >= 10)
            throw new HttpError(400, 'Puedes guardar hasta 10 direcciones');
        (await db.run('INSERT INTO addresses VALUES (?,?,?)', randomUUID(), res.locals.session.userId, JSON.stringify(address)));
        res.status(201).json({ ok: true });
    });
    app.delete('/api/account/addresses/:id', requireUser, async (req, res) => { (await db.run('DELETE FROM addresses WHERE id=? AND user_id=?', idParam(req), res.locals.session.userId)); res.json({ ok: true }); });
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 0 } });
    app.post('/api/uploads', limiter(30), upload.single('file'), async (req, res) => {
        if (!req.file)
            throw new HttpError(400, 'Selecciona un archivo');
        const total = (await db.get<{
            n: number;
        }>('SELECT COUNT(*) n FROM assets WHERE session_id=?', res.locals.session.id))!.n;
        if (total >= 40)
            throw new HttpError(429, 'Límite de archivos de esta sesión alcanzado');
        const a = await storage.put(req.file.buffer), id = randomUUID();
        (await db.run('INSERT INTO assets VALUES (?,?,?,?,?,?,0,?)', id, res.locals.session.id, res.locals.session.userId, a.key, a.mime, a.size, new Date().toISOString()));
        res.status(201).json({ id, mime: a.mime });
    });
    async function memoryOwner(m: Memory, res: Response) { const o = (await db.get<OrderRow>('SELECT * FROM orders WHERE id=?', m.order_id))!; return (await canReadOrder(db, o, res.locals.session.id, res.locals.session.userId)) || ['admin', 'operator'].includes(res.locals.session.user?.role ?? ''); }
    async function memoryReadable(m: Memory, res: Response) {
        if ((await memoryOwner(m, res)))
            return true;
        if (!m.active)
            return false;
        return m.privacy === 'link' || (m.privacy === 'pin' && Boolean((await db.get('SELECT memory_id FROM memory_access WHERE session_id=? AND memory_id=? AND expires_at>?', res.locals.session.id, m.id, Date.now()))));
    }
    app.get('/api/memories/:id', limiter(120), async (req, res) => {
        const m = (await db.get<Memory>('SELECT * FROM digital_memories WHERE public_token=?', idParam(req)));
        if (!m || (!m.active && !(await memoryOwner(m, res))) || (m.privacy === 'private' && !(await memoryOwner(m, res))))
            throw new HttpError(404, 'Recuerdo no disponible');
        if (!(await memoryReadable(m, res)))
            return res.status(403).json({ error: 'Este recuerdo está protegido', needsPin: true });
        res.json({ ...JSON.parse(m.content) as object, privacy: m.privacy, active: !!m.active, owner: (await memoryOwner(m, res)), assets: (await db.all('SELECT a.id,a.mime FROM memory_assets ma JOIN assets a ON a.id=ma.asset_id WHERE ma.memory_id=?', m.id)) });
    });
    app.post('/api/memories/:id/unlock', limiter(8), async (req, res) => {
        const pin = z.string().regex(/^\d{6,12}$/).parse(req.body.pin), m = (await db.get<Memory>("SELECT * FROM digital_memories WHERE public_token=? AND active=1 AND privacy='pin'", idParam(req)));
        const valid = await verifyPassword(pin, m?.pin_hash ?? await dummyHashPromise);
        if (!m || !valid)
            throw new HttpError(403, 'PIN incorrecto o recuerdo no disponible');
        (await db.run('INSERT INTO memory_access VALUES (?,?,?) ON CONFLICT(session_id,memory_id) DO UPDATE SET expires_at=excluded.expires_at', res.locals.session.id, m.id, Date.now() + 3600000));
        res.json({ ok: true });
    });
    app.patch('/api/memories/:id', async (req, res) => {
        const m = (await db.get<Memory>('SELECT * FROM digital_memories WHERE public_token=?', idParam(req)));
        if (!m || !(await memoryOwner(m, res)))
            throw new HttpError(404, 'Recuerdo no encontrado');
        const active = z.boolean().parse(req.body.active);
        const o = (await db.get<OrderRow>('SELECT * FROM orders WHERE id=?', m.order_id))!;
        if (active && o.payment_status !== 'approved' && !(o.channel === 'whatsapp' && ['confirmed', 'preparing', 'ready', 'shipped', 'delivered'].includes(o.status)))
            throw new HttpError(409, 'El recuerdo se activa cuando KUYARI confirma el pedido');
        (await db.run('UPDATE digital_memories SET active=? WHERE id=?', +active, m.id));
        (await db.audit(res.locals.session.userId, active ? 'memory.enabled' : 'memory.disabled', m.id));
        res.json({ ok: true });
    });
    app.get('/api/memories/:id/qr', async (req, res) => {
        const m = (await db.get<Memory>('SELECT * FROM digital_memories WHERE public_token=?', idParam(req)));
        if (!m || !(await memoryOwner(m, res)))
            throw new HttpError(404, 'Recuerdo no encontrado');
        res.type('image/svg+xml').send(await QRCode.toString(`${config.APP_URL}/recuerdo/${m.public_token}`, { type: 'svg', errorCorrectionLevel: 'M', margin: 3 }));
    });
    app.get('/api/assets/:id', async (req, res) => {
        const a = (await db.get<Asset>('SELECT * FROM assets WHERE id=?', idParam(req)));
        if (!a)
            throw new HttpError(404, 'Archivo no encontrado');
        const owned = a.session_id === res.locals.session.id || (a.user_id && a.user_id === res.locals.session.userId);
        const memories = (await db.all<Memory>('SELECT m.* FROM digital_memories m JOIN memory_assets ma ON ma.memory_id=m.id WHERE ma.asset_id=?', a.id));
        if (!owned && !(await Promise.all(memories.map(m => memoryReadable(m, res)))).some(Boolean) && !await romanceAssetReadable(db, a.id, res.locals.session))
            throw new HttpError(404, 'Archivo no encontrado');
        res.type(a.mime).set('Content-Disposition', 'inline').send(await storage.get(a.storage_key));
    });
    app.get('/media/products/:id', async (req, res) => {
        const a = (await db.get<Asset>('SELECT * FROM assets WHERE id=? AND public_product=1', idParam(req)));
        if (!a)
            throw new HttpError(404, 'Imagen no encontrada');
        res.type(a.mime).set('Cache-Control', 'public,max-age=86400').send(await storage.get(a.storage_key));
    });
    app.get('/api/policies/:slug', async (req, res) => {
        const p = (await db.get('SELECT slug,title,body,published,updated_at FROM policies WHERE slug=?', idParam(req, 'slug')));
        if (!p)
            throw new HttpError(404, 'Página no encontrada');
        res.json(p);
    });
    app.use('/api/admin', requireStaff);
    app.get('/api/admin/dashboard', async (_req, res) => {
        const metrics = (await db.get("SELECT COALESCE(SUM(CASE WHEN payment_status='approved' THEN total ELSE 0 END),0) revenue,COUNT(*) orders,COALESCE(AVG(CASE WHEN payment_status='approved' THEN total END),0) average,COALESCE(SUM(status IN ('pending_payment','pending_confirmation')),0) pending FROM orders"));
        res.json({ metrics, topProducts: (await db.all("SELECT i.name,SUM(i.qty) units FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.payment_status='approved' GROUP BY i.product_id ORDER BY units DESC LIMIT 5")), recent: (await db.all('SELECT code,status,total,created_at FROM orders ORDER BY created_at DESC LIMIT 10')), unsentEmails: (await db.get('SELECT COUNT(*) count FROM outbox WHERE sent_at IS NULL')), services: { payment: paymentReady(config), email: !!config.SMTP_HOST, storage: !!config.S3_BUCKET, live: config.STORE_LIVE === 'true' } });
    });
    app.get('/api/admin/orders', async (req, res) => {
        const search = z.string().max(100).default('').parse(req.query.q), status = z.string().max(30).default('').parse(req.query.status);
        res.json((await db.all("SELECT code,status,payment_status,total,email,created_at FROM orders WHERE (code LIKE ? OR email LIKE ?) AND (?='' OR status=?) ORDER BY created_at DESC LIMIT 200", `%${search}%`, `%${search}%`, status, status)));
    });
    app.get('/api/admin/orders/:code', async (req, res) => { const o = (await db.get<OrderRow>('SELECT * FROM orders WHERE code=?', idParam(req, 'code'))); if (!o)
        throw new HttpError(404, 'Pedido no encontrado'); res.json((await orderView(db, o, true))); });
    app.patch('/api/admin/orders/:code', async (req, res) => {
        const data = statusSchema.parse(req.body), o = (await db.get<OrderRow>('SELECT * FROM orders WHERE code=?', idParam(req, 'code')));
        if (!o)
            throw new HttpError(404, 'Pedido no encontrado');
        (await updateOrderStatus(db, o.id, data.status, res.locals.session.userId!, data.note));
        res.json({ ok: true });
    });
    app.post('/api/admin/payments/:id/reconcile', async (req, res) => { const p = await provider.getPayment(idParam(req)); (await applyPayment(db, config, p)); (await db.audit(res.locals.session.userId, 'payment.reconciled', p.reference)); res.json({ ok: true }); });
    app.get('/api/admin/products', async (_req, res) => res.json((await products(db, true))));
    app.post('/api/admin/products/archive-demo', requireAdmin, async (_req, res) => { (await db.run('UPDATE products SET active=0 WHERE demo=1')); (await db.audit(res.locals.session.userId, 'catalog.demo_archived', 'products')); res.json({ ok: true }); });
    app.post('/api/admin/products', requireAdmin, async (req, res) => { const id = (await saveProduct(db, req.body)); (await db.audit(res.locals.session.userId, 'product.created', id)); res.status(201).json({ id }); });
    app.put('/api/admin/products/:id', requireAdmin, async (req, res) => { const id = (await saveProduct(db, req.body, idParam(req))); (await db.audit(res.locals.session.userId, 'product.updated', id)); res.json({ id }); });
    app.post('/api/admin/images', requireAdmin, limiter(30), upload.single('file'), async (req, res) => {
        if (!req.file)
            throw new HttpError(400, 'Selecciona una imagen');
        const a = await storage.put(req.file.buffer, true), id = randomUUID();
        (await db.run('INSERT INTO assets VALUES (?,?,?,?,?,?,1,?)', id, res.locals.session.id, res.locals.session.userId, a.key, a.mime, a.size, new Date().toISOString()));
        res.status(201).json({ url: `/media/products/${id}` });
    });
    app.get('/api/admin/categories', async (_req, res) => res.json((await db.all('SELECT * FROM categories ORDER BY name'))));
    app.patch('/api/admin/categories/:id', requireAdmin, async (req, res) => { const c = z.object({ name: text.min(2), active: z.boolean() }).parse(req.body); const id = idParam(req); (await db.run('UPDATE categories SET name=?,active=? WHERE id=?', c.name, +c.active, id)); (await db.audit(res.locals.session.userId, 'category.updated', id)); res.json({ ok: true }); });
    app.post('/api/admin/categories', requireAdmin, async (req, res) => { const c = z.object({ name: text.min(2), slug: z.string().regex(/^[a-z0-9-]{2,100}$/) }).parse(req.body); const id = randomUUID(); (await db.run('INSERT INTO categories VALUES (?,?,?,1)', id, c.slug, c.name)); (await db.audit(res.locals.session.userId, 'category.created', id)); res.status(201).json({ id }); });
    app.get('/api/admin/zones', async (_req, res) => res.json((await zones(db, true))));
    app.post('/api/admin/zones', requireAdmin, async (req, res) => { const id = (await saveZone(db, req.body)); (await db.audit(res.locals.session.userId, 'zone.created', id)); res.status(201).json({ id }); });
    app.put('/api/admin/zones/:id', requireAdmin, async (req, res) => { const id = (await saveZone(db, req.body, idParam(req))); (await db.audit(res.locals.session.userId, 'zone.updated', id)); res.json({ id }); });
    app.get('/api/admin/coupons', async (_req, res) => res.json((await db.all('SELECT * FROM coupons ORDER BY code'))));
    async function couponSave(req: Request, res: Response) { const c = couponSchema.parse(req.body), id = req.params.id ? idParam(req) : randomUUID(); (await db.run('INSERT INTO coupons VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,kind=excluded.kind,value=excluded.value,starts_at=excluded.starts_at,ends_at=excluded.ends_at,minimum=excluded.minimum,usage_limit=excluded.usage_limit,per_user=excluded.per_user,active=excluded.active', id, c.code, c.kind, c.value, c.start, c.end, c.minimum, c.limit, c.perUser, +c.active)); (await db.audit(res.locals.session.userId, 'coupon.saved', id)); res.json({ id }); }
    app.post('/api/admin/coupons', requireAdmin, couponSave);
    app.put('/api/admin/coupons/:id', requireAdmin, couponSave);
    app.get('/api/admin/customers', async (_req, res) => res.json((await db.all('SELECT u.id,u.email,u.name,COUNT(o.id) orders FROM users u LEFT JOIN orders o ON o.user_id=u.id GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200'))));
    app.get('/api/admin/memories', async (_req, res) => res.json((await db.all('SELECT m.public_token token,m.privacy,m.active,o.code FROM digital_memories m JOIN orders o ON o.id=m.order_id ORDER BY o.created_at DESC LIMIT 200'))));
    app.get('/api/admin/policies', requireAdmin, async (_req, res) => res.json((await db.all('SELECT * FROM policies'))));
    app.put('/api/admin/policies/:slug', requireAdmin, async (req, res) => { const p = z.object({ title: text.min(2), body: z.string().trim().min(100).max(20000), published: z.boolean() }).parse(req.body); const slug = idParam(req, 'slug'); if (!(await db.get('SELECT slug FROM policies WHERE slug=?', slug)))
        throw new HttpError(404, 'Política no encontrada'); (await db.run('UPDATE policies SET title=?,body=?,published=?,updated_at=? WHERE slug=?', p.title, p.body, +p.published, new Date().toISOString(), slug)); (await db.audit(res.locals.session.userId, 'policy.updated', slug)); res.json({ ok: true }); });
    app.get('/api/admin/users', requireAdmin, async (_req, res) => res.json((await db.all("SELECT id,email,name,role,disabled FROM users WHERE role!='customer'"))));
    app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => { const p = z.object({ role: z.enum(['customer', 'operator', 'admin']), disabled: z.boolean() }).parse(req.body); const id = idParam(req); if (id === res.locals.session.userId)
        throw new HttpError(400, 'No puedes modificar tu propio acceso'); if (!(await db.get('SELECT id FROM users WHERE id=?', id)))
        throw new HttpError(404, 'Usuario no encontrado'); (await db.run('UPDATE users SET role=?,disabled=? WHERE id=?', p.role, +p.disabled, id)); (await db.run('DELETE FROM sessions WHERE user_id=?', id)); (await db.audit(res.locals.session.userId, 'user.access_updated', id)); res.json({ ok: true }); });
    app.get('/api/admin/audit', requireAdmin, async (_req, res) => res.json((await db.all('SELECT action,resource,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100'))));
    app.post('/api/admin/email/retry', requireAdmin, async (_req, res) => { (await db.run('UPDATE outbox SET attempts=0,next_attempt=0 WHERE sent_at IS NULL')); res.json({ ok: true }); });
    app.use('/api', (_req, _res) => { throw new HttpError(404, 'Ruta no encontrada'); });
    app.use('/assets/web', express.static(resolve('assets/web'), { maxAge: '1d', dotfiles: 'deny' }));
    app.get('/assets/favicon.svg', (_req, res) => res.sendFile(resolve('assets/favicon.svg')));
    app.use('/src', express.static(resolve('dist/client'), { maxAge: config.NODE_ENV === 'production' ? '1h' : 0, dotfiles: 'deny' }));
    app.use('/shared', express.static(resolve('dist/shared'), { maxAge: '1h', dotfiles: 'deny' }));
    app.get('/styles.css', (_req, res) => res.sendFile(resolve('styles.css')));
    app.get('/robots.txt', (_req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /cuenta\nDisallow: /checkout\nDisallow: /pedido/\nDisallow: /recuerdo/\nDisallow: /sorpresa/\nDisallow: /mis-cartas\nDisallow: /api/\nSitemap: ${config.APP_URL}/sitemap.xml`));
    app.get('/sitemap.xml', async (_req, res) => res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/regalos', '/30-de-septiembre', ...(await products(db)).map(p => `/regalos/${p.slug}`)].map(p => `<url><loc>${escape(config.APP_URL + p)}</loc></url>`).join('')}</urlset>`));
    app.get(/^(?:\/$|\/regalos(?:\/[a-z0-9-]+)?$|\/studio$|\/checkout$|\/cuenta$|\/recuperar$|\/seguimiento$|\/pedido\/KU-[A-F0-9]{10}$|\/recuerdo\/[A-Za-z0-9_-]{43}$|\/asistente$|\/30-de-septiembre$|\/pagar-yape$|\/crear-qr$|\/mis-cartas$|\/sorpresa\/[A-Za-z0-9_-]{43}$|\/admin$|\/activar-admin$|\/politicas\/[a-z-]+$)/, async (req, res) => {
        let title = 'KUYARI | Tu historia, hecha sorpresa', description = 'Regalos personalizados, flores y recuerdos digitales. Crea una sorpresa que cuente tu historia.', status = 200;
        if (req.path === '/30-de-septiembre') {
            title = '30 de septiembre: carritos y flores azules | KUYARI';
            description = 'Encuentra tu detalle: ramos de carritos, flores azules y cajas sorpresa. Personaliza tu propuesta y consulta por WhatsApp.';
        }
        if (req.path.startsWith('/regalos/')) {
            const p = (await products(db)).find(p => req.path === `/regalos/${p.slug}`);
            if (p) {
                title = `${p.name} | KUYARI`;
                description = p.summary;
            }
            else
                status = 404;
        }
        if (/^\/(pedido|recuerdo|sorpresa|mis-cartas|crear-qr|admin|activar-admin|cuenta|checkout|recuperar)/.test(req.path))
            res.set('X-Robots-Tag', 'noindex, nofollow');
        let html = await db.staticText('/index.html');
        html = html.replace('<title>KUYARI | Tu historia, hecha sorpresa</title>', `<title>${escape(title)}</title>`).replace('<!--seo-->', `<meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(config.APP_URL + req.path)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(config.APP_URL + req.path)}"><meta property="og:image" content="${config.APP_URL}/assets/web/ramo-kuyari.webp"><meta name="twitter:card" content="summary_large_image">`);
        res.status(status).type('html').set('Cache-Control', 'no-cache').send(html);
    });
    app.use((_req, res) => res.status(404).type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Página no encontrada | KUYARI</title><link rel="stylesheet" href="/styles.css"><main class="container section"><h1>Esta página no existe.</h1><a class="btn btn-primary" href="/">Volver a KUYARI</a></main></html>'));
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        const requestId = randomUUID();
        const invalidJson = err instanceof SyntaxError && 'body' in err;
        const status = err instanceof HttpError ? err.status : err instanceof z.ZodError || err instanceof multer.MulterError || invalidJson ? 400 : 500;
        const error = err instanceof HttpError ? err.message : err instanceof z.ZodError ? 'Revisa los campos indicados y las opciones seleccionadas' : err instanceof multer.MulterError ? 'El archivo supera el tamaño permitido' : invalidJson ? 'La solicitud no tiene un formato válido' : 'No pudimos completar la operación. Inténtalo de nuevo';
        log('request.failed', { requestId, status: String(status) });
        res.status(status).json({ error, requestId, ...(err instanceof z.ZodError ? { fields: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } : {}) });
    });
    return app;
}

