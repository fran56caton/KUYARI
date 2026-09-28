import type { User, Zone, CartItem, Customization, Product } from '../shared/models.js';
export interface Store { environment: string; orderChannel: 'whatsapp' | 'online'; whatsapp: string[]; hasDemoProducts: boolean; paymentMode: string; paymentReady: boolean; storeLive: boolean; businessName: string; businessEmail: string; zones: Zone[]; categories: { id: string; name: string }[] }
export const state: { csrf: string; user: User | null; store: Store | null } = { csrf: '', user: null, store: null };
export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => { const e = root.querySelector<T>(selector); if (!e) throw new Error(`Elemento no disponible: ${selector}`); return e; };
export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const money = (cents: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(cents / 100);
export class ApiError extends Error { status: number; data: Record<string, unknown>; constructor(status: number, data: Record<string, unknown>) { super(typeof data.error === 'string' ? data.error : 'No pudimos completar la operación'); this.status = status; this.data = data; } }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const isFile = body instanceof FormData;
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { ...(method === 'GET' ? {} : { 'X-CSRF-Token': state.csrf }), ...(body && !isFile ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: isFile ? body : JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}
let toastTimer: ReturnType<typeof setTimeout>;
export function toast(message: string) { const el = $('#toast'); el.textContent = message; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 6000); }
export function fail(error: unknown, root: ParentNode = document) { const el = root.querySelector<HTMLElement>('[data-error]'); const message = error instanceof Error ? error.message : 'No pudimos completar la operación'; if (el) { el.textContent = message; el.hidden = false; el.focus(); } else toast(message); }
export function onForm(id: string, action: (form: HTMLFormElement) => Promise<void>) {
  const form = $<HTMLFormElement>(id);
  form.addEventListener('submit', async e => { e.preventDefault(); const button = form.querySelector<HTMLButtonElement>('[type=submit]'); if (button) button.disabled = true; const error = form.querySelector<HTMLElement>('[data-error]'); if (error) error.hidden = true; try { await action(form); } catch (e) { fail(e, form); } finally { if (button) button.disabled = false; } });
}
export const value = (form: HTMLFormElement, name: string) => String(new FormData(form).get(name) ?? '').trim();
export const checked = (form: HTMLFormElement, name: string) => new FormData(form).get(name) === 'on';
export const errorBox = '<p class="form-error" role="alert" tabindex="-1" data-error hidden></p>';
export const field = (name: string, label: string, v = '', type = 'text', required = true, extra = '') => `<label class="field">${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(v)}" ${required ? 'required' : ''} ${extra}></label>`;
export const area = (name: string, label: string, v = '', max = 1000) => `<label class="field">${esc(label)}<textarea name="${esc(name)}" maxlength="${max}" rows="4">${esc(v)}</textarea></label>`;
export const select = (name: string, label: string, options: { value: string; label: string }[], selected = '', required = true) => `<label class="field">${esc(label)}<select name="${esc(name)}" ${required ? 'required' : ''}>${options.map(o => `<option value="${esc(o.value)}" ${o.value === selected ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
export const check = (name: string, label: string, enabled = false) => `<label class="check-option"><input name="${esc(name)}" type="checkbox" ${enabled ? 'checked' : ''}>${esc(label)}</label>`;
export function page(title: string, body: string, eyebrow = 'KUYARI · TU HISTORIA') { $('#contenido').innerHTML = `<section class="section"><div class="container"><p class="eyebrow">${esc(eyebrow)}</p><h1 class="page-title">${esc(title)}</h1>${body}</div></section>`; document.title = `${title} | KUYARI`; }
export const card = (p: Product) => `<article class="product-card"><a href="/regalos/${esc(p.slug)}"><div class="product-image"><img src="${esc(p.images[0]?.url)}" alt="${esc(p.images[0]?.alt)}" loading="lazy" width="600" height="600">${p.inquiryOnly ? '<span class="product-label season-label">A tu medida</span>' : p.promo ? '<span class="product-label">Precio especial</span>' : ''}</div><div class="product-body"><p class="eyebrow">${esc(p.category)}</p><h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p><div class="product-bottom"><strong>${p.inquiryOnly ? 'Consultar precio' : money(p.promo ?? p.price)}</strong><span>${p.inquiryOnly ? 'Personalizar ↗' : p.stock ? 'Descubrir ↗' : 'Agotado'}</span></div></div></a></article>`;
export function analytics(event: string, details: Record<string, string | number> = {}) { try { window.dispatchEvent(new CustomEvent('kuyari:analytics', { detail: { event, ...details } })); } catch { /* Analytics is optional; commerce never waits for it. */ } }
export const emptyCustomization = (): Customization => ({ occasion: '', style: '', color: '', message: '', card: true, memory: false, dedication: '', sender: '', recipient: '', songUrl: '', videoUrl: '', specialDate: '', privacy: 'link', pin: '', assets: [] });
const cartKey = 'kuyari-cart-v2';
export function loadCart(): CartItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(cartKey) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((i): i is CartItem => i && typeof i === 'object' && typeof i.key === 'string' && typeof i.productId === 'string' && typeof i.name === 'string' && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 20 && Number.isSafeInteger(i.price) && i.price > 0 && i.customization && typeof i.customization === 'object').slice(0, 30).map(i => ({ ...i, customization: { ...emptyCustomization(), ...i.customization, pin: sessionStorage.getItem(`pin:${i.key}`) ?? '' } }));
  } catch { return []; }
}
export function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(cartKey, JSON.stringify(items.map(i => { if (i.customization.pin) sessionStorage.setItem(`pin:${i.key}`, i.customization.pin); return { ...i, customization: { ...i.customization, pin: '' } }; })));
  } catch { toast('Tu navegador no permitió guardar la caja. Revisa el almacenamiento antes de continuar'); }
  $('#cart-count').textContent = String(items.reduce((n, i) => n + i.qty, 0));
}
export function cartPayload(items = loadCart()) { return items.map(({ productId, variantId, qty, customization }) => ({ productId, variantId, qty, customization })); }
export function summary(items: CartItem[]) { return items.map(i => `<div class="order-line"><div><strong>${esc(i.name)}</strong><p>${i.qty} unidad${i.qty > 1 ? 'es' : ''} · ${esc([i.customization.occasion, i.customization.style, i.customization.color].filter(Boolean).join(' · '))}</p>${i.customization.message ? `<p class="dedication">${esc(i.customization.message)}</p>` : ''}${i.customization.memory ? `<p>Recuerdo digital · ${esc(i.customization.privacy)} · ${i.customization.assets.length} archivos</p>` : ''}</div><strong>${money(i.price * i.qty)}</strong></div>`).join(''); }
