import nodemailer from 'nodemailer';
import type { Config } from './config.js';
import type { DB } from './db.js';
import { log } from './security.js';
export interface NotificationChannel { send(to: string, subject: string, text: string): Promise<void> }
export class EmailChannel implements NotificationChannel {
  config: Config;
  constructor(config: Config) { this.config = config; }
  async send(to: string, subject: string, text: string) {
    const c = this.config;
    if (!c.SMTP_HOST || !c.SMTP_FROM) throw new Error('Correo no configurado');
    const transport = nodemailer.createTransport({ host: c.SMTP_HOST, port: c.SMTP_PORT, secure: c.SMTP_PORT === 465, requireTLS: c.NODE_ENV === 'production', connectionTimeout: 10000, socketTimeout: 15000, ...(c.SMTP_USER ? { auth: { user: c.SMTP_USER, pass: c.SMTP_PASSWORD } } : {}) });
    await transport.sendMail({ from: c.SMTP_FROM, to, subject, text });
  }
}
export async function deliverNotifications(db: DB, channel: NotificationChannel) {
  const pending = db.all<{ id: string; recipient: string; subject: string; body: string; attempts: number }>('SELECT * FROM outbox WHERE sent_at IS NULL AND attempts<10 AND next_attempt<=? LIMIT 10', Date.now());
  for (const item of pending) {
    try { await channel.send(item.recipient, item.subject, item.body); db.run('UPDATE outbox SET sent_at=? WHERE id=?', new Date().toISOString(), item.id); }
    catch { db.run('UPDATE outbox SET attempts=attempts+1,next_attempt=? WHERE id=?', Date.now() + Math.min(3600000, 60000 * 2 ** item.attempts), item.id); log('notification.retry'); }
  }
}
