import { z } from 'zod';
import type express from './router.js';
import type { Request, Response } from './router.js';
import type { DB } from './db.js';
import { requireAdmin } from './auth.js';
import { HttpError } from './security.js';
import { history, type OrderRow } from './commerce.js';

const settingsSchema = z.object({ enabled: z.boolean(), phone: z.string().trim().regex(/^9\d{8}$/), holder: z.string().trim().max(120), qrUrl: z.string().regex(/^$|^\/media\/products\/[A-Za-z0-9-]{36}$/), instructions: z.string().trim().max(1000) });
const emptySettings = { enabled: false, phone: '', holder: '', qrUrl: '', instructions: '' };
export async function yapeSettings(db: DB) {
  const row = await db.get<{ value: string }>("SELECT value FROM payment_settings WHERE id='yape'");
  return row ? settingsSchema.parse(JSON.parse(row.value)) : emptySettings;
}
export function registerYape(app: ReturnType<typeof express>, db: DB, authorize: (req: Request, res: Response) => Promise<OrderRow>) {
  app.get('/api/yape', async (_req, res) => res.json(await yapeSettings(db)));
  app.get('/api/admin/yape', requireAdmin, async (_req, res) => res.json(await yapeSettings(db)));
  app.put('/api/admin/yape', requireAdmin, async (req, res) => {
    const settings = settingsSchema.parse(req.body);
    if (settings.qrUrl) { const id = settings.qrUrl.split('/').pop()!; if (!await db.get('SELECT id FROM assets WHERE id=? AND public_product=1', id)) throw new HttpError(400, 'Sube el QR desde el panel de Yape.'); }
    await db.run("INSERT INTO payment_settings(id,value) VALUES('yape',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value", JSON.stringify(settings));
    await db.audit(res.locals.session.userId, 'yape.settings_updated', 'yape'); res.json(settings);
  });
  app.get('/api/orders/:code/yape', async (req, res) => {
    const order = await authorize(req, res), settings = await yapeSettings(db);
    res.json({ settings, eligible: settings.enabled && order.channel === 'whatsapp' && ['confirmed', 'preparing'].includes(order.status) && order.payment_status !== 'approved', amount: order.total,
      reports: await db.all('SELECT id,reference,payer,status,created_at FROM yape_reports WHERE order_id=? ORDER BY created_at DESC', order.id) });
  });
  app.post('/api/orders/:code/yape', async (req, res) => {
    const order = await authorize(req, res), settings = await yapeSettings(db);
    const data = z.object({ reference: z.string().trim().regex(/^[A-Za-z0-9-]{4,40}$/), payer: z.string().trim().min(3).max(120) }).parse(req.body);
    if (!settings.enabled) throw new HttpError(409, 'Yape aún no está habilitado.');
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await db.transaction(async () => {
      const current = await db.get<OrderRow>('SELECT * FROM orders WHERE id=?', order.id);
      if (!current || current.channel !== 'whatsapp' || !['confirmed', 'preparing'].includes(current.status) || current.payment_status === 'approved') throw new HttpError(409, 'Primero confirma el pedido y el total con KUYARI.');
      if (await db.get("SELECT id FROM yape_reports WHERE order_id=? AND status='review'", order.id)) throw new HttpError(409, 'Tu reporte ya está en revisión.');
      if (await db.get('SELECT id FROM yape_reports WHERE reference=?', data.reference.toUpperCase())) throw new HttpError(409, 'Este número de operación ya fue reportado.');
      await db.run('INSERT INTO yape_reports VALUES (?,?,?,?,?,?,?,?,?,?)', id, order.id, data.reference.toUpperCase(), data.payer, current.total, 'review', JSON.stringify({ phone: settings.phone, holder: settings.holder }), null, now, now);
      await db.run("UPDATE orders SET payment_status='review',updated_at=? WHERE id=?", now, order.id);
      await db.audit(res.locals.session.userId, 'yape.reported', order.id);
    }); res.status(201).json({ id, status: 'review' });
  });
  app.get('/api/admin/yape/reports', requireAdmin, async (_req, res) => res.json(await db.all('SELECT r.*,o.code,o.status order_status FROM yape_reports r JOIN orders o ON o.id=r.order_id ORDER BY r.created_at DESC LIMIT 100')));
  app.post('/api/admin/yape/reports/:id/review', requireAdmin, async (req, res) => {
    const data = z.object({ decision: z.enum(['approve', 'reject']), verifiedInApp: z.literal(true) }).parse(req.body);
    await db.transaction(async () => {
      const report = await db.get<{ id: string; order_id: string; reference: string; amount: number; status: string }>('SELECT * FROM yape_reports WHERE id=?', req.params.id);
      if (!report) throw new HttpError(404, 'Reporte no encontrado.');
      if (report.status !== 'review') throw new HttpError(409, 'Este reporte ya fue revisado.');
      const order = await db.get<OrderRow>('SELECT * FROM orders WHERE id=?', report.order_id);
      if (!order || order.payment_status === 'approved' || ['cancelled', 'refunded'].includes(order.status)) throw new HttpError(409, 'Este pedido no admite validar otro pago.');
      const now = new Date().toISOString();
      if (data.decision === 'approve') {
        if (report.amount !== order.total) throw new HttpError(409, 'El importe reportado no coincide con el pedido.');
        await db.run('INSERT INTO payments VALUES (?,?,?,?,?,?,?,?,?)', crypto.randomUUID(), order.id, 'yape_manual', 'yape:' + report.reference, 'approved', order.total, 0, now, now);
      }
      await db.run('UPDATE yape_reports SET status=?,reviewed_by=?,updated_at=? WHERE id=?', data.decision === 'approve' ? 'approved' : 'rejected', res.locals.session.userId, now, report.id);
      await db.run('UPDATE orders SET payment_status=?,updated_at=? WHERE id=?', data.decision === 'approve' ? 'approved' : 'not_requested', now, order.id);
      await history(db, order.id, order.status, data.decision === 'approve' ? 'Pago Yape verificado en la cuenta receptora.' : 'Reporte Yape rechazado tras verificar la cuenta receptora.', res.locals.session.userId);
      await db.audit(res.locals.session.userId, 'yape.' + data.decision, order.id);
    }); res.json({ ok: true });
  });
}
