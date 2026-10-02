import type { Product } from '../shared/models.js';
import { $, api, esc, page, card, field, select, area, errorBox, onForm, value, fail } from './ui.js';
import { contactLinks } from './contact.js';

export const campaignOccasion = '30 de septiembre';
const types = [{ id: '', name: 'Todos los detalles' }, { id: 'septiembre-flores', name: 'Flores azules' }, { id: 'septiembre-carritos', name: 'Carritos' }, { id: 'septiembre-combos', name: 'Flores + carritos' }];
const filters = () => `<div class="season-filters" role="group" aria-label="Tipo de regalo">${types.map((t, i) => `<button type="button" data-season-type="${t.id}" aria-pressed="${i === 0}">${t.name}</button>`).join('')}</div>`;

export async function campaign() {
    page('Este 30, regala una sonrisa.', `<div class="collection-intro"><p class="lead">Carritos para su niño interior. Flores azules para decirle cuánto importa. Encuentra ese detalle que tiene su nombre.</p><span class="date-stamp"><b>30</b>SEPTIEMBRE</span></div>${filters()}<p class="collection-note">Propuestas para personalizar · precio, modelo y entrega se confirman contigo por WhatsApp.</p><div class="product-grid season-grid" id="season-products" aria-live="polite"></div>${errorBox}<div class="season-tail"><span>¿Y si mezclamos tus ideas?</span><a class="btn btn-outline" href="#" id="season-help">Diseñemos algo especial ↗</a></div>`, 'EDICIÓN AZUL · KUYARI');
    document.body.classList.add('season-page');
    $('#season-help').onclick = e => { e.preventDefault(); $('#whatsapp-help').click(); };
  const params = new URLSearchParams(location.search);
  let selected = types.some(t => t.id === params.get('tipo')) ? params.get('tipo') ?? '' : '';
  async function render() {
    const result = await api<{ products: Product[] }>(`/api/products?occasion=${encodeURIComponent(campaignOccasion)}&category=${encodeURIComponent(selected)}`);
    $('#season-products').innerHTML = result.products.map(card).join('') || '<p class="empty-state">Estamos preparando nuevas ideas para esta colección. Escríbenos y diseñamos tu detalle.</p>';
    document.querySelectorAll<HTMLButtonElement>('[data-season-type]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.seasonType === selected)));
  }
  document.querySelectorAll<HTMLButtonElement>('[data-season-type]').forEach(b => b.onclick = () => {
    selected = b.dataset.seasonType!;
    history.replaceState(null, '', `/30-de-septiembre${selected ? `?tipo=${selected}` : ''}`);
    render().catch(fail);
  });
  await render();
}

export function inquiryProduct(p: Product) {
  document.body.classList.add('season-page');
  const year = new Date().getFullYear();
  const requestedDate = new Date() > new Date(year, 8, 30, 23, 59) ? `${year + 1}-09-30` : `${year}-09-30`;
  page(p.name, `<a class="text-link" href="/30-de-septiembre">← Volver a la edición azul</a><div class="product-detail inquiry-detail"><div><img class="detail-photo" id="main-photo" src="${esc(p.images[0]?.url)}" alt="${esc(p.images[0]?.alt)}" width="800" height="900"><div class="thumbnails">${p.images.map((im, n) => `<button type="button" data-photo="${n}" aria-label="Ver imagen ${n + 1}"><img src="${esc(im.url)}" alt="${esc(im.alt)}" width="90" height="90"></button>`).join('')}</div><p class="fine-print">Imagen referencial. Acordaremos contigo la composición y el modelo del carrito antes de confirmar.</p></div><div class="detail-copy"><p class="eyebrow">${esc(p.category)} · 30 DE SEPTIEMBRE</p><p class="inquiry-price">Un detalle a tu medida.</p><p class="preserve-lines">${esc(p.description)}</p><a class="btn btn-outline full-width" href="/crear-qr?regalo=${encodeURIComponent(p.id)}">Acompañar con una carta + QR ♡</a><div class="inquiry-assurance"><span>Dedicatoria personal</span><span>Atención por WhatsApp</span><span>Precio por confirmar</span></div><form id="inquiry-form"><h2 id="personalizar">Dale tu toque.</h2><div class="form-grid">${select('style', 'Presentación', (p.options.styles.length ? p.options.styles : ['A coordinar']).map(v => ({ value: v, label: v })))}${select('color', 'Tonos del detalle', (p.options.colors.length ? p.options.colors : ['Azul']).map(v => ({ value: v, label: v })))}${field('qty', 'Cantidad de regalos', '1', 'number', true, 'min="1" max="20" step="1"')}${field('date', 'Fecha que te gustaría', requestedDate, 'date', true)}</div>${field('recipient', '¿Para quién es? (opcional)', '', 'text', false, 'maxlength="100"')}${field('model', 'Modelo de carrito o idea especial (opcional)', '', 'text', false, 'maxlength="180"')}${area('message', 'Tu dedicatoria (opcional)', '', 400)}<div class="form-grid">${field('budget', 'Tu presupuesto en soles (opcional)', '', 'number', false, 'min="1" max="100000"')}${select('delivery', '¿Cómo te gustaría recibirlo?', [{ value: 'Consultar envío a domicilio', label: 'Envío a domicilio' }, { value: 'Consultar recojo coordinado', label: 'Recojo coordinado' }])}</div>${errorBox}<button type="submit" class="btn btn-season full-width">Preparar mi consulta ↗</button><p class="fine-print">La fecha y modalidad son preferencias; las confirmamos contigo. No se realiza ningún cobro.</p></form><div id="inquiry-result" aria-live="polite"></div></div></div><section class="related"><h2>Otra forma de decir «pensé en ti».</h2><a class="btn btn-outline" href="/30-de-septiembre">Ver todos los detalles ↗</a></section>`, 'EDICIÓN AZUL');
  document.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach(b => b.onclick = () => { const im = p.images[Number(b.dataset.photo)], photo = $<HTMLImageElement>('#main-photo'); photo.src = im.url; photo.alt = im.alt; });
  const form = $<HTMLFormElement>('#inquiry-form');
  form.oninput = () => { $('#inquiry-result').innerHTML = ''; };
  onForm('#inquiry-form', async f => {
    const message = ['Hola, KUYARI 💙. Me interesa un detalle de la edición del 30 de septiembre.', `Regalo: ${p.name}`, `Presentación: ${value(f, 'style')}`, `Tonos: ${value(f, 'color')}`, `Cantidad: ${value(f, 'qty')}`, `Fecha deseada: ${value(f, 'date')}`, value(f, 'recipient') ? `Para: ${value(f, 'recipient')}` : '', value(f, 'model') ? `Idea o modelo: ${value(f, 'model')}` : '', value(f, 'message') ? `Dedicatoria: ${value(f, 'message')}` : '', value(f, 'budget') ? `Mi presupuesto: S/ ${value(f, 'budget')}` : '', `Entrega: ${value(f, 'delivery')}`, '¿Me confirman el precio, los modelos disponibles y la entrega?'].filter(Boolean).join('\n');
    $('#inquiry-result').innerHTML = `<div class="inquiry-result"><h3>Tu idea ya tiene forma.</h3><p>Elige uno de nuestros números y envía tu consulta. El equipo confirmará los detalles contigo.</p><div class="contact-links">${contactLinks(message)}</div><details><summary>Ver mi mensaje</summary><pre class="whatsapp-message">${esc(message)}</pre></details></div>`;
    $('#inquiry-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}
