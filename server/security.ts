import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const token = () => randomBytes(32).toString('base64url');
export const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export async function hashPassword(value: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(value, salt, 64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(value: string, stored: string): Promise<boolean> {
  const [salt, encoded] = stored.split(':');
  if (!salt || !encoded || encoded.length !== 128) return false;
  const key = await derive(value, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(encoded, 'hex'));
}
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
// Logs accept only deliberately selected non-sensitive operational fields.
export function log(event: string, fields: { orderId?: string; requestId?: string; status?: string; count?: number } = {}) {
  process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), event, ...fields })}\n`);
}
