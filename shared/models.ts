export interface Image { id: string; url: string; alt: string }
export interface Variant { id: string; label: string; priceDelta: number; stock: number; active: number }
export interface Product {
  id: string; slug: string; name: string; summary: string; description: string;
  price: number; promo: number | null; stock: number; categoryId: string;
  category: string; active: number; featured: number; customizable: number;
  memoryPrice: number; options: { styles: string[]; colors: string[]; occasions: string[] };
  images: Image[]; variants: Variant[]; demo: number; inquiryOnly: boolean;
}
export interface Customization {
  occasion: string; style: string; color: string; message: string; card: boolean;
  memory: boolean; dedication: string; sender: string; recipient: string;
  songUrl: string; videoUrl: string; specialDate: string;
  privacy: 'link' | 'pin' | 'private'; pin: string; assets: string[];
}
export interface CartItem {
  key: string; productId: string; variantId: string; qty: number;
  customization: Customization; name: string; price: number; image: string;
}
export interface User { id: string; email: string; name: string; role: 'customer' | 'operator' | 'admin' }
export interface Zone { id: string; district: string; province: string; department: string; fee: number; minDays: number; slots: string[]; active: number }
export interface QuoteItem { productId: string; variantId: string; name: string; qty: number; unitPrice: number; customization: Customization; image: string }
export interface Quote { items: QuoteItem[]; subtotal: number; delivery: number; discount: number; total: number; couponId: string | null; zoneId: string }
export const orderStatuses = ['pending_confirmation', 'pending_payment', 'paid', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled', 'refunded', 'payment_review'] as const;
export type OrderStatus = typeof orderStatuses[number];
export const statusLabels: Record<OrderStatus, string> = {
  pending_confirmation: 'Por confirmar en WhatsApp', pending_payment: 'Pendiente de pago', paid: 'Pago confirmado', confirmed: 'Pedido confirmado', preparing: 'En preparación', ready: 'Listo para salir', shipped: 'En camino', delivered: 'Entregado', cancelled: 'Cancelado', refunded: 'Reembolsado', payment_review: 'Pago en revisión'
};
