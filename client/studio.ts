import type { Product, Customization, CartItem } from '../shared/models.js';
import { $, api, esc, money, page, field, select, area, check, errorBox, value, checked, emptyCustomization, loadCart, saveCart, summary, toast, analytics, fail } from './ui.js';
import { catalog } from './catalog.js';
export async function studio() {
  const params = new URLSearchParams(location.search), slug = params.get('product');
  if (!slug) return catalog(true);
  const p = await api<Product>(`/api/products/${encodeURIComponent(slug)}`), editing = loadCart().find(i => i.key === params.get('edit'));
  if (p.inquiryOnly) { location.replace(`/regalos/${encodeURIComponent(p.slug)}#personalizar`); return; }
  const draftKey = `studio:${p.id}:${editing?.key ?? 'new'}`;
  let c: Customization = editing?.customization ?? emptyCustomization();
  try { const draft = sessionStorage.getItem(draftKey); if (draft) c = { ...c, ...JSON.parse(draft) as Customization }; } catch { /* A corrupt draft is ignored; saved cart entries remain intact. */ }
  let assets = [...c.assets]; let step = 0;
  const option = (name: string, label: string, choices: string[], selected: string) => choices.length ? select(name, label, choices.map(v => ({ value: v, label: v })), selected || choices[0]) : '';
  const variants = p.variants.filter(v => v.active);
  page('Una sorpresa, muy tuya.', `<p class="lead">${esc(p.name)} · Diseña cada detalle y revísalo antes de guardarlo.</p><ol class="studio-progress" aria-label="Pasos de personalización"><li>01 · Regalo</li><li>02 · Mensaje</li><li>03 · Recuerdo</li><li>04 · Resumen</li></ol><div class="studio-layout"><form id="studio-form"><fieldset data-step="0"><legend>Elige los detalles</legend>${variants.length ? select('variant', 'Presentación', variants.map(v => ({ value: v.id, label: `${v.label} · + ${money(v.priceDelta)}` })), editing?.variantId ?? '') : ''}${p.customizable ? `${option('occasion', 'Ocasión', p.options.occasions, c.occasion)}${option('style', 'Estilo', p.options.styles, c.style)}${option('color', 'Color', p.options.colors, c.color)}` : '<p>Este regalo se prepara tal como aparece en su descripción.</p>'}<p>La fecha, zona y destinatario de entrega se eligen al finalizar la compra.</p></fieldset><fieldset data-step="1" hidden><legend>Las palabras que importan</legend>${p.customizable ? `${check('card', 'Incluir tarjeta con mi mensaje', c.card)}${area('message', 'Dedicatoria de la tarjeta', c.message)}${field('sender', 'Tu nombre para el recuerdo', c.sender, 'text', false, 'maxlength="180"')}${field('recipient', 'Nombre de la persona especial', c.recipient, 'text', false, 'maxlength="180"')}` : '<p>Puedes añadir instrucciones de entrega en el checkout.</p>'}</fieldset><fieldset data-step="2" hidden><legend>Un recuerdo para volver a sentir</legend>${p.customizable ? `${check('memory', `Añadir Recuerdo Digital KUYARI (+ ${money(p.memoryPrice)})`, c.memory)}<div id="memory-fields">${area('dedication', 'La historia detrás de este regalo', c.dedication, 4000)}${field('songUrl', 'Enlace de una canción (HTTPS)', c.songUrl, 'url', false)}${field('videoUrl', 'Enlace de un video (HTTPS)', c.videoUrl, 'url', false)}${field('specialDate', 'Fecha especial', c.specialDate, 'date', false)}${select('privacy', '¿Quién podrá abrirlo?', [{ value: 'link', label: 'Quien tenga el enlace' }, { value: 'pin', label: 'Solo con enlace y PIN' }, { value: 'private', label: 'Solo yo, desde mi cuenta o sesión de compra' }], c.privacy)}<div id="pin-field">${field('pin', 'PIN de 6 a 12 dígitos', c.pin, 'password', false, 'pattern="[0-9]{6,12}" inputmode="numeric" autocomplete="new-password"')}</div><label class="field">Fotos y video<input id="memory-upload" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple></label><p class="fine-print">Hasta 10 archivos. Imágenes: 3 MB cada una; video MP4: 3 MB. Comparte únicamente contenido que tengas permiso de utilizar. Los archivos no son públicos fuera del recuerdo.</p><ul id="asset-list" class="asset-list"></ul><p id="upload-status" role="status"></p></div>` : '<p>Este regalo no incluye personalización digital.</p>'}</fieldset><fieldset data-step="3" hidden><legend>Así será tu sorpresa</legend><div id="studio-summary"></div><p>El precio final y la disponibilidad se verifican de nuevo al confirmar el pedido.</p></fieldset>${errorBox}<div class="form-actions"><button id="studio-back" type="button" class="btn btn-outline">Anterior</button><button id="studio-next" type="button" class="btn btn-primary">Continuar</button><button id="studio-add" type="button" class="btn btn-primary" hidden>${editing ? 'Guardar cambios' : 'Añadir a mi caja'}</button></div></form><aside class="preview-panel"><p class="eyebrow">TU HISTORIA TOMA FORMA</p><img class="detail-photo" src="${esc(p.images[0]?.url)}" alt="${esc(p.images[0]?.alt)}" width="500" height="500"><h2 class="preview-title">${esc(p.name)}</h2><blockquote class="dedication" id="live-message"></blockquote><p class="large-price" id="studio-price"></p></aside></div>`, 'KUYARI STUDIO');
  const form = $<HTMLFormElement>('#studio-form');
  function selection(): CartItem {
    const custom: Customization = { ...emptyCustomization(), occasion: value(form, 'occasion'), style: value(form, 'style'), color: value(form, 'color'), card: checked(form, 'card'), message: value(form, 'message'), memory: checked(form, 'memory'), dedication: value(form, 'dedication'), sender: value(form, 'sender'), recipient: value(form, 'recipient'), songUrl: value(form, 'songUrl'), videoUrl: value(form, 'videoUrl'), specialDate: value(form, 'specialDate'), privacy: (value(form, 'privacy') || 'link') as Customization['privacy'], pin: value(form, 'pin'), assets };
    const variant = variants.find(v => v.id === value(form, 'variant'));
    return { key: editing?.key ?? crypto.randomUUID(), productId: p.id, variantId: variant?.id ?? '', qty: editing?.qty ?? 1, name: `${p.name}${variant ? ` · ${variant.label}` : ''}`, price: (p.promo ?? p.price) + (variant?.priceDelta ?? 0) + (custom.memory ? p.memoryPrice : 0), customization: custom, image: p.images[0]?.url ?? '' };
  }
  function update() {
    const item = selection(); $('#live-message').textContent = item.customization.card ? item.customization.message || 'Tus palabras harán este regalo único.' : 'Una sorpresa preparada para esa persona.'; $('#studio-price').textContent = money(item.price);
    if (p.customizable) { $('#memory-fields').hidden = !item.customization.memory; $('#pin-field').hidden = item.customization.privacy !== 'pin'; }
    try { sessionStorage.setItem(draftKey, JSON.stringify(item.customization)); } catch { toast('No se pudo guardar el borrador en este navegador'); }
    $('#studio-summary').innerHTML = summary([item]);
  }
  function showStep() { document.querySelectorAll<HTMLElement>('[data-step]').forEach(s => { s.hidden = Number(s.dataset.step) !== step; }); document.querySelectorAll('.studio-progress li').forEach((li, n) => li.setAttribute('aria-current', n === step ? 'step' : 'false')); $<HTMLButtonElement>('#studio-back').disabled = step === 0; $('#studio-next').hidden = step === 3; $('#studio-add').hidden = step !== 3; update(); }
  $('#studio-next').onclick = () => {
    const fields = $(`[data-step="${step}"]`).querySelectorAll<HTMLInputElement>('input,select,textarea');
    for (const f of fields) if (f.offsetParent !== null && !f.reportValidity()) return;
    const item = selection(); if (step === 2 && item.customization.memory && item.customization.privacy === 'pin' && !/^\d{6,12}$/.test(item.customization.pin)) { fail(new Error('Define un PIN de 6 a 12 dígitos'), form); return; }
    step++; showStep();
  };
  $('#studio-back').onclick = () => { step--; showStep(); };
  form.oninput = update;
  $('#studio-add').onclick = () => {
    const item = selection(); const cart = loadCart(); if (cart.length >= 30 && !editing) { toast('Tu caja admite hasta 30 regalos distintos'); return; }
    if (editing) saveCart(cart.map(i => i.key === editing.key ? item : i)); else saveCart([...cart, item]);
    sessionStorage.removeItem(draftKey); analytics('add_to_cart', { productId: p.id, quantity: item.qty }); location.href = '/checkout';
  };
  function renderAssets() { if (!p.customizable) return; $('#asset-list').innerHTML = assets.map((id, n) => `<li>Archivo ${n + 1}<a href="/api/assets/${esc(id)}" target="_blank" rel="noopener">Ver</a><button type="button" data-remove-asset="${esc(id)}">Quitar</button></li>`).join(''); document.querySelectorAll<HTMLButtonElement>('[data-remove-asset]').forEach(b => b.onclick = () => { assets = assets.filter(id => id !== b.dataset.removeAsset); renderAssets(); update(); }); }
  if (p.customizable) $<HTMLInputElement>('#memory-upload').onchange = async e => {
    const input = e.target as HTMLInputElement; const files = [...(input.files ?? [])];
    if (assets.length + files.length > 10) return fail(new Error('Puedes añadir hasta 10 archivos'), form);
    if (files.some(file => file.size > 3 * 1024 * 1024)) return fail(new Error('Cada foto o video admite hasta 3 MB.'), form);
    const next = $<HTMLButtonElement>('#studio-next'); next.disabled = true;
    try { for (const file of files) { $('#upload-status').textContent = `Guardando ${file.name}…`; const data = new FormData(); data.set('file', file); const uploaded = await api<{ id: string }>('/api/uploads', 'POST', data); assets.push(uploaded.id); renderAssets(); update(); } $('#upload-status').textContent = 'Archivos guardados'; }
    catch (e) { fail(e, form); $('#upload-status').textContent = 'No se pudieron guardar todos los archivos'; }
    finally { next.disabled = false; input.value = ''; }
  };
  renderAssets(); showStep();
}
