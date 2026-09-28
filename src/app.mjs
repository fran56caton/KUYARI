import { CONFIG } from './config.mjs';
import { PRODUCTS, CUSTOM_BASE_PRICE, QR_EXTRA_PRICE } from './catalog.mjs';
import { addItem, removeItem, changeQuantity, countItems, subtotal, normalizeCart, orderText } from './cart-core.mjs';

const $ = selector => document.querySelector(selector);
const formatMoney = amount => new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency }).format(amount);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE_KEY = 'kuyari-demo-cart-v1';
let cart = [];
try { cart = normalizeCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { cart = []; }
let toastTimeout;

function toast(message) {
  const node = $('#toast'); node.textContent = message; node.hidden = false;
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { node.hidden = true; }, 3800);
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { toast('El navegador no permite guardar tu caja.'); }
  renderCart();
}
function renderProducts(category = 'todos') {
  const products = PRODUCTS.filter(product => category === 'todos' || product.category === category);
  $('#product-grid').innerHTML = products.map(product => `<article class="product-card">
    <div class="product-image"><img loading="lazy" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.alt)}"/><span class="product-label">${escapeHTML(product.occasion)}</span></div>
    <div class="product-body"><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.description)}</p><div class="product-bottom"><strong>${formatMoney(product.price)}</strong><button class="round-add" data-add="${escapeHTML(product.id)}" aria-label="Agregar ${escapeHTML(product.name)} a mi caja">+</button></div></div></article>`).join('');
}
function setCartOpen(open) {
  $('#cart-drawer').hidden = !open; $('#drawer-overlay').hidden = !open;
  $('#cart-drawer').setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('drawer-open', open);
  if (open) $('#close-cart').focus(); else $('#open-cart').focus();
}
function renderCart() {
  $('#cart-count').textContent = String(countItems(cart));
  $('#cart-subtotal').textContent = formatMoney(subtotal(cart));
  $('#cart-items').innerHTML = cart.length ? cart.map(item => `<div class="cart-item"><div><h3>${escapeHTML(item.name)}</h3>${item.details ? `<p>${escapeHTML(item.details)}</p>` : ''}<strong>${formatMoney(item.price * item.qty)}</strong></div><div class="cart-controls"><div class="qty"><button data-delta="-1" data-id="${escapeHTML(item.id)}" aria-label="Disminuir cantidad de ${escapeHTML(item.name)}">−</button><span>${item.qty}</span><button data-delta="1" data-id="${escapeHTML(item.id)}" aria-label="Aumentar cantidad de ${escapeHTML(item.name)}">+</button></div><button class="remove" data-remove="${escapeHTML(item.id)}" aria-label="Quitar ${escapeHTML(item.name)}">Quitar</button></div></div>`).join('') : '<p class="cart-empty">Tu caja está esperando una sorpresa. ♡</p>';
  $('#copy-order').disabled = !cart.length; $('#send-order').disabled = !cart.length;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Contenido copiado al portapapeles.'); }
  catch { toast('No se pudo copiar. Abre la página desde localhost o HTTPS.'); }
}
function customSelection() {
  const form = $('#custom-form');
  const occasion = form.elements.occasion.value;
  const flowers = form.elements.flowers.value;
  const card = $('#include-card').checked;
  const qr = $('#include-qr').checked;
  const message = $('#gift-message').value.trim();
  const link = $('#memory-url').value.trim();
  const details = [occasion, `Flores: ${flowers}`, card ? 'Con tarjeta' : 'Sin tarjeta', ...(card && message ? [`Dedicatoria: ${message}`] : []), ...(qr ? ['Solicita complemento QR (sujeto a confirmación)' ] : []), ...(qr && isValidHttpUrl(link) ? [`Enlace del recuerdo: ${link}`] : [])].join(' · ');
  return { id: `custom-${encodeURIComponent(JSON.stringify([occasion, flowers, card, qr, message, qr ? link : '']))}`, name: `Caja personalizada con ${flowers}`, price: CUSTOM_BASE_PRICE + (qr ? QR_EXTRA_PRICE : 0), details };
}
function isValidHttpUrl(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; } }
function updatePreview() {
  const gift = customSelection();
  $('#preview-occasion').textContent = $('#custom-form').elements.occasion.value.toUpperCase();
  $('#preview-name').textContent = gift.name;
  $('#preview-price').textContent = formatMoney(gift.price);
  $('#preview-message').textContent = $('#include-card').checked ? `“${$('#gift-message').value.trim() || 'Un mensaje especial para una persona única.'}”` : 'Sin tarjeta incluida';
  $('#preview-extras').textContent = [$('#include-card').checked ? 'Tarjeta incluida' : 'Sin tarjeta', $('#include-qr').checked ? 'Complemento QR solicitado' : null].filter(Boolean).join(' + ');
  $('#message-counter').textContent = `${$('#gift-message').value.length} / 120`;
}
function init() {
  $('#year').textContent = String(new Date().getFullYear()); renderProducts(); renderCart(); updatePreview();
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(node => { node.classList.toggle('active', node === btn); node.setAttribute('aria-pressed', String(node === btn)); });
    renderProducts(btn.dataset.filter);
  }));
  $('#product-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-add]'); if (!button) return;
    const product = PRODUCTS.find(item => item.id === button.dataset.add); if (!product) return;
    cart = addItem(cart, product); persist(); toast('Agregado a tu caja ♡');
  });
  $('#custom-form').addEventListener('input', updatePreview);
  $('#add-custom').addEventListener('click', () => { cart = addItem(cart, customSelection()); persist(); toast('Tu regalo personalizado está en la caja ♡'); });
  $('#open-cart').addEventListener('click', () => setCartOpen(true));
  $('#close-cart').addEventListener('click', () => setCartOpen(false));
  $('#drawer-overlay').addEventListener('click', () => setCartOpen(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#cart-drawer').hidden) setCartOpen(false); });
  $('#cart-items').addEventListener('click', event => {
    const change = event.target.closest('[data-delta]');
    const remove = event.target.closest('[data-remove]');
    if (change) { cart = changeQuantity(cart, change.dataset.id, Number(change.dataset.delta)); persist(); }
    if (remove) { cart = removeItem(cart, remove.dataset.remove); persist(); }
  });
  $('#copy-order').addEventListener('click', () => { if (cart.length) copyText(orderText(cart, CONFIG.deliveryNote)); });
  $('#send-order').addEventListener('click', () => {
    if (!cart.length) return;
    if (!/^\d{8,15}$/.test(CONFIG.whatsappNumber)) { toast('Configura el número de WhatsApp real en src/config.mjs. Puedes copiar el pedido.'); return; }
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(orderText(cart, CONFIG.deliveryNote))}`, '_blank', 'noopener,noreferrer');
  });
  $('#copy-memory').addEventListener('click', () => {
    const link = $('#memory-url').value.trim();
    if (!isValidHttpUrl(link)) { toast('Escribe un enlace válido que comience con https:// o http://'); return; }
    copyText(link);
  });
  $('#menu-toggle').addEventListener('click', () => {
    const isOpen = $('#main-nav').classList.toggle('show'); $('#menu-toggle').setAttribute('aria-expanded', String(isOpen));
  });
  document.querySelectorAll('#main-nav a').forEach(a => a.addEventListener('click', () => { $('#main-nav').classList.remove('show'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); }));
}
init();
