import type { DB } from './db.js';
import type { OrderRow, ItemRow } from './commerce.js';
import type { Config } from './config.js';
import type { Customization } from '../shared/models.js';
export function whatsappOrder(db: DB, config: Config, o: OrderRow) {
  const buyer = JSON.parse(o.buyer) as { firstName: string; lastName: string };
  const delivery = JSON.parse(o.delivery) as { recipient: string; district: string; date: string; slot: string; anonymous: boolean };
  const items = db.all<ItemRow>('SELECT * FROM order_items WHERE order_id=?', o.id);
  const money = (value: number) => `S/ ${(value / 100).toFixed(2)}`;
  const lines = ['Hola, KUYARI. Quiero coordinar esta sorpresa 💝', `Pedido: ${o.code}`, `Soy ${buyer.firstName} ${buyer.lastName}.`, '', ...items.flatMap(i => {
    const c = JSON.parse(i.customization) as Customization;
    return [`• ${i.name} × ${i.qty} — ${money(i.unit_price * i.qty)}`, [c.occasion, c.style, c.color].filter(Boolean).join(' · '), ...(c.card && c.message ? [`Tarjeta: ${c.message.slice(0, 350)}`] : []), ...(c.memory ? ['Incluye Recuerdo Digital KUYARI.'] : [])];
  }), '', `Productos: ${money(o.subtotal)}`, `Entrega: ${money(o.delivery_fee)}`, ...(o.discount ? [`Descuento: ${money(o.discount)}`] : []), `Total solicitado: ${money(o.total)}`, '', `Para: ${delivery.recipient}`, `Distrito: ${delivery.district}`, `Fecha: ${delivery.date} · ${delivery.slot}`, ...(delivery.anonymous ? ['Regalo anónimo.'] : []), '', 'La personalización y los datos de entrega están guardados en el pedido.', '¿Me confirman disponibilidad y entrega? Todavía no he realizado ningún pago.'];
  const message = lines.filter(Boolean).join('\n');
  return { message, contacts: [{ label: 'Atención principal', phone: config.WHATSAPP_PRIMARY }, { label: 'Atención alternativa', phone: config.WHATSAPP_SECONDARY }].map(c => ({ ...c, url: `https://wa.me/${c.phone}?text=${encodeURIComponent(message)}` })) };
}
