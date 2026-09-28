import { readConfig } from './config.js';
import { DB } from './db.js';
import { createApp } from './app.js';
import { expireOrders } from './commerce.js';
import { EmailChannel, deliverNotifications } from './notifications.js';
import { log } from './security.js';
const config = readConfig(), db = new DB(config.DB_PATH);
const server = createApp(db, config).listen(config.PORT, config.HOST, () => log('server.ready'));
server.requestTimeout = 30000; server.headersTimeout = 15000;
let busy = false;
const timer = setInterval(async () => {
  if (busy) return; busy = true;
  try {
    expireOrders(db);
    db.run('DELETE FROM sessions WHERE expires_at<?', Date.now());
    db.run('DELETE FROM memory_access WHERE expires_at<?', Date.now());
    db.run('DELETE FROM password_resets WHERE expires_at<?', Date.now());
    if (config.SMTP_HOST) await deliverNotifications(db, new EmailChannel(config));
  } catch { log('maintenance.failed'); } finally { busy = false; }
}, 30000);
timer.unref();
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { clearInterval(timer); server.close(() => { db.close(); process.exit(0); }); });
