import type { Request, Response, NextFunction } from 'express';
import type { DB } from './db.js';
import type { Config } from './config.js';
import type { User } from '../shared/models.js';
import { token, digest, HttpError } from './security.js';
export interface Session { id: string; userId: string | null; csrf: string; user: User | null }
declare module 'express-serve-static-core' { interface Locals { session: Session } }
export function sessions(db: DB, config: Config) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('kuyari_session='))?.slice('kuyari_session='.length);
    const row = value && /^[A-Za-z0-9_-]{43}$/.test(value) ? db.get<{ id: string; user_id: string | null; csrf: string }>('SELECT * FROM sessions WHERE id=? AND expires_at>?', digest(value), Date.now()) : undefined;
    const session = row ? { id: row.id, userId: row.user_id, csrf: row.csrf, user: row.user_id ? db.get<User>('SELECT id,email,name,role FROM users WHERE id=? AND disabled=0', row.user_id) ?? null : null } : issueSession(db, config, res);
    if (session.userId && !session.user) { db.run('DELETE FROM sessions WHERE id=?', session.id); res.locals.session = issueSession(db, config, res); }
    else res.locals.session = session;
    next();
  };
}
export function issueSession(db: DB, config: Config, res: Response, user: User | null = null): Session {
  const raw = token(), id = digest(raw), csrf = token();
  const duration = user?.role === 'admin' || user?.role === 'operator' ? 8 * 3600000 : 7 * 86400000;
  db.run('INSERT INTO sessions VALUES (?,?,?,?)', id, user?.id ?? null, csrf, Date.now() + duration);
  res.cookie('kuyari_session', raw, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', maxAge: duration, path: '/' });
  return { id, userId: user?.id ?? null, csrf, user };
}
export function rotateSession(db: DB, config: Config, res: Response, user: User | null) {
  const old = res.locals.session;
  const fresh = issueSession(db, config, res, user);
  if (user) {
    db.run('INSERT OR IGNORE INTO session_orders SELECT ?,order_id FROM session_orders WHERE session_id=?', fresh.id, old.id);
    db.run('UPDATE orders SET user_id=? WHERE user_id IS NULL AND id IN (SELECT order_id FROM session_orders WHERE session_id=?)', user.id, old.id);
    db.run('UPDATE assets SET session_id=?,user_id=? WHERE session_id=?', fresh.id, user.id, old.id);
    db.run('UPDATE love_cards SET session_id=?,user_id=COALESCE(user_id,?) WHERE session_id=?', fresh.id, user.id, old.id);
  }
  db.run('DELETE FROM sessions WHERE id=?', old.id);
  res.locals.session = fresh;
  return fresh;
}
export function csrfGuard(config: Config) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.headers.origin !== config.APP_URL || req.headers['x-csrf-token'] !== res.locals.session.csrf) throw new HttpError(403, 'La sesión cambió. Recarga la página e inténtalo nuevamente');
    next();
  };
}
export function requireUser(_req: Request, res: Response, next: NextFunction) { if (!res.locals.session.user) throw new HttpError(401, 'Inicia sesión para continuar'); next(); }
export function requireStaff(_req: Request, res: Response, next: NextFunction) { if (!['operator', 'admin'].includes(res.locals.session.user?.role ?? '')) throw new HttpError(403, 'Acceso reservado al equipo de KUYARI'); next(); }
export function requireAdmin(_req: Request, res: Response, next: NextFunction) { if (res.locals.session.user?.role !== 'admin') throw new HttpError(403, 'Se requiere acceso de administrador'); next(); }
