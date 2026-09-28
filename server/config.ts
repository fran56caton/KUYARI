import { z } from 'zod';
const empty = z.string().default('');
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000), HOST: z.string().default('127.0.0.1'),
  APP_URL: z.url().default('http://localhost:3000'), DB_PATH: z.string().default('data/kuyari-development.sqlite'),
  STORE_LIVE: z.enum(['true', 'false']).default('false'), TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  ORDER_CHANNEL: z.enum(['whatsapp', 'online']).default('whatsapp'), WHATSAPP_PRIMARY: z.string().regex(/^\d{8,15}$/).default('51930951679'), WHATSAPP_SECONDARY: z.string().regex(/^\d{8,15}$/).default('51900080962'),
  SETUP_TOKEN: empty,
  PAYMENT_MODE: z.enum(['sandbox', 'production']).default('sandbox'), MP_ACCESS_TOKEN: empty, MP_WEBHOOK_SECRET: empty, MP_COLLECTOR_ID: empty,
  SMTP_HOST: empty, SMTP_PORT: z.coerce.number().int().positive().default(587), SMTP_USER: empty, SMTP_PASSWORD: empty, SMTP_FROM: empty,
  S3_BUCKET: empty, S3_REGION: z.string().default('us-east-1'), S3_ENDPOINT: empty, S3_ACCESS_KEY_ID: empty, S3_SECRET_ACCESS_KEY: empty,
  UPLOAD_DIR: z.string().default('data/uploads'), BUSINESS_NAME: empty, BUSINESS_EMAIL: empty,
  ADMIN_EMAIL: empty, ADMIN_PASSWORD: empty
});
export type Config = z.infer<typeof envSchema>;
export function readConfig(input: NodeJS.ProcessEnv = process.env): Config {
  const c = envSchema.parse(input);
  c.APP_URL = new URL(c.APP_URL).origin;
  if (c.NODE_ENV === 'production') {
    if (!c.APP_URL.startsWith('https://')) throw new Error('APP_URL debe usar HTTPS en producción');
    if (c.DB_PATH.includes('development') || c.DB_PATH === ':memory:') throw new Error('DB_PATH debe apuntar a un volumen persistente de producción');
    if (c.STORE_LIVE === 'true' && c.ORDER_CHANNEL === 'online' && (!paymentReady(c) || !c.SMTP_HOST || !c.SMTP_FROM || !c.S3_BUCKET || !c.BUSINESS_NAME || !c.BUSINESS_EMAIL || c.PAYMENT_MODE !== 'production')) {
      throw new Error('Completa pagos, correo, almacenamiento y datos comerciales antes de activar STORE_LIVE');
    }
  }
  return c;
}
export const paymentReady = (c: Config) => Boolean(c.MP_ACCESS_TOKEN && c.MP_WEBHOOK_SECRET && c.MP_COLLECTOR_ID && c.APP_URL.startsWith('https://'));
