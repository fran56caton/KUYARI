import { z } from 'zod';
import QRCode from 'qrcode';
import { randomUUID } from 'node:crypto';
import { loveThemes, lovePalettes, loveOccasions, loveDetails } from '../shared/romance.js';
import { HttpError, token, digest, hashPassword, verifyPassword } from './security.js';
import type { Config } from './config.js';
import type { Express, Request, Response, RequestHandler } from 'express';
interface LoveDB {
  get<T = Record<string, unknown>>(sql: string, ...values: (string | number | null)[]): T | undefined | Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, ...values: (string | number | null)[]): T[] | Promise<T[]>;
  run(sql: string, ...values: (string | number | null)[]): unknown | Promise<unknown>;
}
interface Session { id: string; userId: string | null; user: { role: string } | null }
interface Row { id: string; public_token: string; session_id: string; user_id: string | null; content: string; privacy: 'link' | 'pin'; pin_hash: string | null; access_hash: string; active: number; created_at: string; request_key: string; request_hash: string }
const short = z.string().trim().max(180);
const url = z.string().max(1000).refine(v => !v || (() => { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } })(), 'Usa un enlace HTTPS').default('');
const contentSchema = z.object({
  theme: z.enum(loveThemes.map(t => t.id)), palette: z.enum(lovePalettes.map(t => t.id)), occasion: z.enum(loveOccasions),
  opening: z.enum(['envelope', 'heart', 'gates', 'book']), flower: z.enum(['roses', 'daisies', 'blue', 'peonies']),
  recipient: short.min(1), sender: short, title: short.min(2), subtitle: short, message: z.string().trim().min(10).max(6000),
  closing: z.string().trim().max(600), specialDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  details: z.array(z.enum(loveDetails.map(d => d.id))).max(12), intensity: z.enum(['gentle', 'full']), textStyle: z.enum(['serif', 'handwritten']),
  chapters: z.array(z.object({ title: short.min(1), text: z.string().trim().min(1).max(1000) })).max(5),
  promises: z.array(z.string().trim().min(1).max(300)).max(6), songUrl: url, videoUrl: url,
  assets: z.array(z.uuid()).max(10), giftId: z.string().max(100), giftNote: z.string().trim().max(1000)
});
const createSchema = z.object({ content: contentSchema, privacy: z.enum(['link', 'pin']), pin: z.string().max(12).default(''), consent: z.literal(true), previewed: z.literal(true), requestKey: z.uuid() }).refine(d => d.privacy !== 'pin' || /^\d{6,12}$/.test(d.pin), 'Usa un PIN de 6 a 12 dígitos');
const publicToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const isOwner = (row: Row, s: Session) => row.session_id === s.id || !!(s.userId && row.user_id === s.userId) || ['admin', 'operator'].includes(s.user?.role ?? '');
const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export async function romanceAssetReadable(db: LoveDB, assetId: string, s: Session) {
  const rows = await db.all<Row>("SELECT c.* FROM love_cards c WHERE EXISTS (SELECT 1 FROM json_each(c.content,'$.assets') WHERE value=?)", assetId);
  for (const row of rows) {
    if (isOwner(row, s)) return true;
    if (!row.active) continue;
    if (row.privacy === 'link' || await db.get('SELECT card_id FROM love_access WHERE session_id=? AND card_id=? AND expires_at>?', s.id, row.id, Date.now())) return true;
  }
  return false;
}
export async function heartQR(url: string, name = 'Una sorpresa para ti', palette = 'rose') {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size, cell = 260 / (size + 8), offset = 170 + 4 * cell;
  const paths: string[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (qr.modules.get(y, x)) paths.push(`<rect x="${(offset + x * cell).toFixed(3)}" y="${(200 + 4 * cell + y * cell).toFixed(3)}" width="${(cell + 0.015).toFixed(3)}" height="${(cell + 0.015).toFixed(3)}"/>`);
  const color = palette === 'sky' ? '#375e87' : palette === 'lilac' ? '#66517e' : '#5a183d';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="650" viewBox="0 0 600 650" role="img"><title>QR KUYARI para ${esc(name)}</title><defs><linearGradient id="heart" x2="1" y2="1"><stop stop-color="#fff3f6"/><stop offset="1" stop-color="#efb5c5"/></linearGradient></defs><rect width="600" height="650" rx="26" fill="#fffdfb"/><path d="M300 557C251 522 51 390 51 211C51 74 222 62 300 151C378 62 549 74 549 211C549 390 349 522 300 557Z" fill="url(#heart)" stroke="${color}" stroke-width="2"/><path d="M300 540C244 494 69 374 69 209C69 95 219 82 300 174C381 82 531 95 531 209C531 374 356 494 300 540Z" fill="none" stroke="#fffdfb" stroke-width="2"/><g fill="${color}" opacity=".65"><path d="M101 230q-34-20-28-54q26 4 28 30q2-26 28-30q6 34-28 54Z"/><path d="M499 230q-34-20-28-54q26 4 28 30q2-26 28-30q6 34-28 54Z"/><path d="M135 387q-16-4-22-18q15-9 28 3q-7-24 10-34q14 13 0 34q21-10 32 5q-11 18-30 10Z"/><path d="M465 387q-16-4-22-18q15-9 28 3q-7-24 10-34q14 13 0 34q21-10 32 5q-11 18-30 10Z"/></g><text x="300" y="181" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="${color}">KUYARI · HECHO CON AMOR</text><rect x="166" y="196" width="268" height="268" rx="4" fill="white"/><g fill="#20151c">${paths.join('')}</g><text x="300" y="493" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="18" fill="${color}">Abre una historia solo para ti</text><text x="300" y="599" text-anchor="middle" font-family="Georgia,serif" font-size="21" fill="${color}">${esc(name.slice(0, 35))}</text><text x="300" y="627" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#71656a">ESCANEA EL CORAZÓN Y DESCUBRE TU SORPRESA</text></svg>`;
}
export function registerRomance(app: Express, db: LoveDB, config: Config, limit: (count: number) => RequestHandler) {
  const getRow = async (value: string) => {
    const row = await db.get<Row>('SELECT * FROM love_cards WHERE public_token=?', publicToken.parse(value));
    if (!row) throw new HttpError(404, 'Esta sorpresa no está disponible'); return row;
  };
  app.post('/api/love-cards', limit(20), async (req: Request, res: Response) => {
    const input = createSchema.parse(req.body), s: Session = res.locals.session;
    const requestHash = digest(JSON.stringify(input));
    const previous = await db.get<Row>('SELECT * FROM love_cards WHERE session_id=? AND request_key=?', s.id, input.requestKey);
    if (previous) {
      if (previous.request_hash !== requestHash) throw new HttpError(409, 'La carta cambió. Revisa de nuevo la vista previa');
      res.json({ token: previous.public_token, path: `/sorpresa/${previous.public_token}`, accessKey: null }); return;
    }
    if ((await db.get<{ n: number }>('SELECT COUNT(*) n FROM love_cards WHERE session_id=?', s.id))!.n >= 50) throw new HttpError(429, 'Puedes guardar hasta 50 cartas por sesión');
    for (const id of new Set(input.content.assets)) if (!await db.get('SELECT id FROM assets WHERE id=? AND public_product=0 AND (session_id=? OR (user_id IS NOT NULL AND user_id=?))', id, s.id, s.userId)) throw new HttpError(403, 'Una fotografía no pertenece a esta carta');
    if (input.content.giftId && !await db.get('SELECT id FROM products WHERE id=? AND active=1', input.content.giftId)) throw new HttpError(400, 'Elige un regalo disponible');
    const id = randomUUID(), link = token(), accessKey = token(), pin = input.privacy === 'pin' ? await hashPassword(input.pin) : null;
    try {
      await db.run('INSERT INTO love_cards (id,public_token,session_id,user_id,content,privacy,pin_hash,access_hash,active,created_at,request_key,request_hash) VALUES (?,?,?,?,?,?,?,?,1,?,?,?)', id, link, s.id, s.userId, JSON.stringify(input.content), input.privacy, pin, digest(accessKey), new Date().toISOString(), input.requestKey, requestHash);
    } catch (e) {
      const saved = await db.get<Row>('SELECT * FROM love_cards WHERE session_id=? AND request_key=?', s.id, input.requestKey);
      if (!saved || saved.request_hash !== requestHash) throw e;
      res.json({ token: saved.public_token, path: `/sorpresa/${saved.public_token}`, accessKey: null }); return;
    }
    res.status(201).json({ token: link, path: `/sorpresa/${link}`, accessKey });
  });
  app.get('/api/love-cards/mine', async (_req: Request, res: Response) => {
    const s: Session = res.locals.session;
    const rows = await db.all<Row>('SELECT * FROM love_cards WHERE session_id=? OR (user_id IS NOT NULL AND user_id=?) ORDER BY created_at DESC LIMIT 100', s.id, s.userId);
    res.json(rows.map(r => { const c = JSON.parse(r.content); return { token: r.public_token, title: c.title, recipient: c.recipient, theme: c.theme, active: !!r.active, privacy: r.privacy, createdAt: r.created_at }; }));
  });
  app.post('/api/love-cards/access', limit(12), async (req: Request, res: Response) => {
    const input = z.object({ token: publicToken, key: publicToken }).parse(req.body);
    const row = await getRow(input.token);
    if (digest(input.key) !== row.access_hash) throw new HttpError(404, 'No pudimos validar esa clave');
    await db.run('UPDATE love_cards SET session_id=?,user_id=COALESCE(user_id,?) WHERE id=?', res.locals.session.id, res.locals.session.userId, row.id); res.json({ token: row.public_token });
  });
  app.get('/api/love-cards/:token', limit(120), async (req: Request, res: Response) => {
    const row = await getRow(String(req.params.token)), s: Session = res.locals.session, owner = isOwner(row, s);
    if (!row.active && !owner) throw new HttpError(404, 'La persona que creó esta sorpresa ha desactivado el enlace');
    if (!owner && row.privacy === 'pin' && !await db.get('SELECT card_id FROM love_access WHERE session_id=? AND card_id=? AND expires_at>?', s.id, row.id, Date.now())) { res.status(403).json({ error: 'Esta sorpresa tiene un PIN', needsPin: true }); return; }
    const content = JSON.parse(row.content), assets = [];
    for (const id of content.assets) { const a = await db.get('SELECT id,mime FROM assets WHERE id=?', id); if (a) assets.push(a); }
    const gift = content.giftId ? await db.get<{ id: string; name: string }>('SELECT id,name FROM products WHERE id=?', content.giftId) : null;
    res.json({ token: row.public_token, content, privacy: row.privacy, active: !!row.active, owner, assets, createdAt: row.created_at, gift: gift ? { ...gift, image: (await db.get<{ url: string }>('SELECT url FROM product_images WHERE product_id=? ORDER BY position LIMIT 1', gift.id))?.url ?? '' } : null });
  });
  app.post('/api/love-cards/:token/unlock', limit(8), async (req: Request, res: Response) => {
    const pin = z.string().regex(/^\d{6,12}$/).parse(req.body.pin), row = await getRow(String(req.params.token));
    if (!row.active || row.privacy !== 'pin' || !row.pin_hash || !await verifyPassword(pin, row.pin_hash)) throw new HttpError(403, 'PIN incorrecto o enlace no disponible');
    await db.run('INSERT INTO love_access (session_id,card_id,expires_at) VALUES (?,?,?) ON CONFLICT(session_id,card_id) DO UPDATE SET expires_at=excluded.expires_at', res.locals.session.id, row.id, Date.now() + 3600000); res.json({ ok: true });
  });
  app.patch('/api/love-cards/:token', async (req: Request, res: Response) => {
    const row = await getRow(String(req.params.token)); if (!isOwner(row, res.locals.session)) throw new HttpError(404, 'Carta no disponible');
    const active = z.boolean().parse(req.body.active); await db.run('UPDATE love_cards SET active=? WHERE id=?', +active, row.id); res.json({ ok: true });
  });
  app.get('/api/love-cards/:token/qr', async (req: Request, res: Response) => {
    const row = await getRow(String(req.params.token)); if (!isOwner(row, res.locals.session)) throw new HttpError(404, 'Carta no disponible');
    const c = JSON.parse(row.content); res.type('image/svg+xml').set('Content-Disposition', 'attachment; filename="KUYARI-corazon.svg"').send(await heartQR(`${config.APP_URL}/sorpresa/${row.public_token}`, `Para ${c.recipient}`, c.palette));
  });
}
