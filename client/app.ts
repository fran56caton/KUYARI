import type { User, Product } from '../shared/models.js';
import { $, api, state, card, page, esc, fail, type Store } from './ui.js';
import { initCart, checkout } from './checkout.js';
import { initContact } from './contact.js';
async function start() {
  const path = location.pathname;
  if (path !== '/') $('#contenido').innerHTML = '<section class="section"><div class="container"><p role="status">Abriendo tu sección…</p></div></section>';
  const session = await api<{ csrf: string; user: User | null }>('/api/session');
  const store = await api<Store>('/api/store');
  state.csrf = session.csrf; state.user = session.user; state.store = store;
  $('#year').textContent = String(new Date().getFullYear());
  if (store.hasDemoProducts || (store.environment === 'production' && !store.storeLive)) { const banner = $('#environment-banner'); banner.hidden = false; banner.textContent = store.hasDemoProducts ? 'Colección de muestra · consulta por WhatsApp la disponibilidad y el precio antes de confirmar.' : 'Estamos preparando nuestra apertura. Las compras aún no están habilitadas.'; }
  $('#menu-toggle').onclick = () => { const open = $('#main-nav').classList.toggle('show'); $('#menu-toggle').setAttribute('aria-expanded', String(open)); };
  $('#main-nav').addEventListener('click', e => { if ((e.target as Element).closest('a')) { $('#main-nav').classList.remove('show'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); } });
  initCart();
  initContact();
  if (path === '/') { const data = await api<{ products: Product[] }>('/api/products?excludeOccasion=30%20de%20septiembre'); $('#home-products').innerHTML = data.products.slice(0, 6).map(card).join('') || '<p class="empty-state">Nuestra colección está tomando forma. Vuelve pronto para encontrar tu próxima sorpresa.</p>'; }
  else if (path === '/30-de-septiembre') await (await import('./seasonal.js')).campaign();
  else if (path === '/crear-qr') await (await import('./love.js')).createLove();
  else if (path === '/mis-cartas') await (await import('./love.js')).myLoveCards();
  else if (path.startsWith('/sorpresa/')) await (await import('./love.js')).loveViewer(path.split('/')[2]);
  else if (path === '/regalos') await (await import('./catalog.js')).catalog();
  else if (path.startsWith('/regalos/')) await (await import('./catalog.js')).product(path.split('/')[2]);
  else if (path === '/studio') await (await import('./studio.js')).studio();
  else if (path === '/checkout') await checkout();
  else if (path === '/cuenta') await (await import('./customer.js')).account();
  else if (path === '/recuperar') await (await import('./customer.js')).recovery();
  else if (path === '/seguimiento') await (await import('./customer.js')).tracking();
  else if (path.startsWith('/pedido/')) await (await import('./customer.js')).order(path.split('/')[2]);
  else if (path.startsWith('/recuerdo/')) await (await import('./customer.js')).memory(path.split('/')[2]);
  else if (path.startsWith('/politicas/')) await (await import('./customer.js')).policy(path.split('/')[2]);
  else if (path === '/asistente') await (await import('./catalog.js')).assistant();
  else if (path === '/admin') await (await import('./admin.js')).admin();
  else if (path === '/activar-admin') await (await import('./customer.js')).setup();
  else page('No encontramos esta sección.', '<p>Elige una sección del menú para continuar.</p><a class="btn btn-primary" href="/">Volver al inicio</a>');
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => { const url = new URL(link.href); if (url.origin === location.origin && url.pathname === '/crear-qr' && !url.hash) { url.hash = 'personalizar'; link.href = url.pathname + url.search + url.hash; } });
  positionSection();
}
function positionSection() {
  if (!location.hash) return;
  let id: string; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id); if (!target) return;
  const header = document.querySelector('.site-header')?.getBoundingClientRect().height || 80;
  window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 20), behavior: 'instant' });
}
window.addEventListener('hashchange', positionSection);
window.addEventListener('unhandledrejection', e => { e.preventDefault(); fail(e.reason); });
start().catch(e => { page('No pudimos abrir esta página.', `<p>${esc(e instanceof Error ? e.message : 'Inténtalo nuevamente en unos instantes.')}</p><div class="form-actions"><button id="retry-page" class="btn btn-primary">Reintentar</button><a href="/" class="btn btn-outline">Volver al inicio</a></div>`); $('#retry-page').onclick = () => location.reload(); });
