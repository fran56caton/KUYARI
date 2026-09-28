/** Lógica de carrito sin dependencias del navegador; puede verificarse con Node.js. */
export function addItem(items, incoming) {
  if (!incoming || typeof incoming.id !== 'string' || !Number.isFinite(incoming.price) || incoming.price < 0) throw new TypeError('Producto no válido');
  const index = items.findIndex(item => item.id === incoming.id);
  if (index < 0) return [...items, { ...incoming, qty: 1 }];
  return items.map((item, i) => i === index ? { ...item, qty: Math.min(99, item.qty + 1) } : item);
}
export function removeItem(items, id) { return items.filter(item => item.id !== id); }
export function changeQuantity(items, id, delta) { return items.map(item => item.id === id ? { ...item, qty: Math.max(1, Math.min(99, item.qty + delta)) } : item); }
export function countItems(items) { return items.reduce((sum, item) => sum + item.qty, 0); }
export function subtotal(items) { return items.reduce((sum, item) => sum + item.price * item.qty, 0); }
export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.qty) && item.qty >= 1 && item.qty <= 99).slice(0, 50).map(item => ({ id: item.id, name: item.name.slice(0, 180), price: item.price, qty: item.qty, ...(typeof item.details === 'string' ? { details: item.details.slice(0, 300) } : {}) }));
}
export function orderText(items, deliveryNote = '') {
  const lines = ['Hola, KUYARI. Quiero consultar por estos regalos:', ''];
  items.forEach((item, index) => { lines.push(`${index + 1}. ${item.name} × ${item.qty} — S/ ${(item.price * item.qty).toFixed(2)}`); if (item.details) lines.push(`   ${item.details}`); });
  lines.push('', `Subtotal referencial: S/ ${subtotal(items).toFixed(2)}`, deliveryNote, '¿Me confirman disponibilidad, precio final y entrega?');
  return lines.join('\n');
}
