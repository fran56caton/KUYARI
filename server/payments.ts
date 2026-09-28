import { MercadoPagoConfig, Preference, Payment, WebhookSignatureValidator } from 'mercadopago';
import type { Config } from './config.js';
import { paymentReady } from './config.js';
import { HttpError } from './security.js';
import type { OrderRow, VerifiedPayment } from './commerce.js';
export interface PaymentProvider {
  createCheckout(order: OrderRow): Promise<{ id: string; url: string }>;
  verifySignature(signature: string, requestId: string, dataId: string): void;
  getPayment(id: string): Promise<VerifiedPayment>;
}
export class MercadoPagoProvider implements PaymentProvider {
  config: Config;
  constructor(config: Config) { this.config = config; }
  private client() {
    if (!paymentReady(this.config)) throw new HttpError(503, 'Los pagos aún no están habilitados. Tu pedido no se ha cobrado');
    return new MercadoPagoConfig({ accessToken: this.config.MP_ACCESS_TOKEN, options: { timeout: 10000 } });
  }
  async createCheckout(order: OrderRow) {
    const result = await new Preference(this.client()).create({ body: {
      items: [{ id: order.id, title: `KUYARI · ${order.code}`, quantity: 1, unit_price: order.total / 100, currency_id: 'PEN' }],
      external_reference: order.id, payer: { email: order.email },
      back_urls: { success: `${this.config.APP_URL}/pedido/${order.code}`, pending: `${this.config.APP_URL}/pedido/${order.code}`, failure: `${this.config.APP_URL}/pedido/${order.code}` },
      notification_url: `${this.config.APP_URL}/api/payments/webhook`, auto_return: 'approved',
      expires: true, expiration_date_from: new Date().toISOString(), expiration_date_to: new Date(order.expires_at).toISOString(),
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] }
    }, requestOptions: { idempotencyKey: order.id } });
    const url = this.config.PAYMENT_MODE === 'production' ? result.init_point : result.sandbox_init_point;
    if (!result.id || !url || !/^https:\/\/(?:[a-z0-9-]+\.)*mercadopago\.(?:com|com\.pe)\//.test(url)) throw new HttpError(502, 'El proveedor no pudo iniciar el pago');
    return { id: result.id, url };
  }
  verifySignature(signature: string, requestId: string, dataId: string) {
    if (!this.config.MP_WEBHOOK_SECRET) throw new HttpError(503, 'Webhook no configurado');
    try { WebhookSignatureValidator.validate({ xSignature: signature, xRequestId: requestId, dataId, secret: this.config.MP_WEBHOOK_SECRET, toleranceSeconds: 300 }); }
    catch { throw new HttpError(401, 'Firma de notificación inválida'); }
  }
  async getPayment(id: string): Promise<VerifiedPayment> {
    const p = await new Payment(this.client()).get({ id });
    if (!p.id || !p.external_reference || !p.status || typeof p.transaction_amount !== 'number' || !p.date_last_updated || !Number.isFinite(Date.parse(p.date_last_updated))) throw new HttpError(502, 'Respuesta de pago incompleta');
    return { id: String(p.id), reference: p.external_reference, status: p.status, amount: Math.round(p.transaction_amount * 100), currency: p.currency_id ?? '', collector: String(p.collector_id ?? ''), live: p.live_mode === true, refunded: Math.round((p.transaction_amount_refunded ?? 0) * 100), updated: new Date(p.date_last_updated).toISOString() };
  }
}
