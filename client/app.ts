import type { User, Product } from '../shared/models.js';
import { $, api, state, card, page, esc, fail, leavePage, type Store } from './ui.js';
import { initCart, checkout } from './checkout.js';
import { initContact, contactLinks } from './contact.js';
const homeHTML = $('#contenido').innerHTML;
const imports = { garden: () => import('./garden.js'), love: () => import('./love.js'), catalog: () => import('./catalog.js'), customer: () => import('./customer.js'), seasonal: () => import('./seasonal.js'), studio: () => import('./studio.js'), admin: () => import('./admin.js'), yape: () => import('./yape.js') };
function warmRoute(path: string) {
  const loader = path.startsWith('/jardin-') ? imports.garden : path === '/crear-qr' || path === '/mis-cartas' || path.startsWith('/sorpresa/') ? imports.love : path.startsWith('/regalos') || path === '/asistente' ? imports.catalog : path === '/studio' ? imports.studio : path === '/30-de-septiembre' ? imports.seasonal : path === '/admin' ? imports.admin : path === '/pagar-yape' ? imports.yape : imports.customer;
  loader().catch(() => {});
}
async function start() {
  warmRoute(location.pathname);
  const session = await api<{ csrf: string; user: User | null }>('/api/session');
  const store = await api<Store>('/api/store');
  state.csrf = session.csrf; state.user = session.user; state.store = store;
  $('#year').textContent = String(new Date().getFullYear());
  if (store.hasDemoProducts || (store.environment === 'production' && !store.storeLive)) { const banner = $('#environment-banner'); banner.hidden = false; banner.textContent = store.hasDemoProducts ? 'Colección de muestra · consulta por WhatsApp la disponibilidad y el precio antes de confirmar.' : 'Estamos preparando nuestra apertura. Las compras aún no están habilitadas.'; }
  $('#menu-toggle').onclick = () => { const open = $('#main-nav').classList.toggle('show'); $('#menu-toggle').setAttribute('aria-expanded', String(open)); };
  $('#main-nav').addEventListener('click', e => { if ((e.target as Element).closest('a')) { $('#main-nav').classList.remove('show'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); } });
  initCart();
  initContact();
  $('#main-nav').insertAdjacentHTML('beforeend', '<a href="/pagar-yape">Yape</a>');
  await renderRoute();
  document.addEventListener('pointerover', e => { const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]'); if (a && a.origin === location.origin) warmRoute(a.pathname); }, { passive: true });
  document.addEventListener('click', e => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || link.target || link.hasAttribute('download') || link.origin !== location.origin || !isPage(link.pathname)) return;
    if (link.pathname === location.pathname && link.search === location.search && link.hash) return;
    e.preventDefault(); navigate(new URL(link.href)).catch(fail);
  });
  window.addEventListener('popstate', () => navigate(new URL(location.href), false).catch(fail));
}
async function renderRoute() {
  const path = location.pathname;
  document.body.classList.remove('love-immersive');
  if (path === '/') { const data = await api<{ products: Product[] }>('/api/products?excludeOccasion=30%20de%20septiembre'); leavePage(); $('#contenido').innerHTML = homeHTML; document.title = 'KUYARI | Tu historia, hecha sorpresa'; $('#home-products').innerHTML = data.products.slice(0, 6).map(card).join('') || '<p class="empty-state">Nuestra colección está tomando forma. Vuelve pronto para encontrar tu próxima sorpresa.</p>'; }
  else if (path === '/30-de-septiembre') await (await import('./seasonal.js')).campaign();
  else if (path === '/jardin-cartas') await (await import('./garden.js')).gardenLetters();
  else if (path === '/jardin-flores') await (await import('./garden.js')).gardenFlowersPage();
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
  else if (path === '/pagar-yape') await (await import('./yape.js')).yapePage();
  else page('No encontramos esta sección.', '<p>Elige una sección del menú para continuar.</p><a class="btn btn-primary" href="/">Volver al inicio</a>');
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => { const url = new URL(link.href); if (url.origin === location.origin && url.pathname === '/crear-qr' && !url.hash) { url.hash = 'personalizar'; link.href = url.pathname + url.search + url.hash; } });
  const footerContact = document.querySelector('#footer-contact'); if (footerContact) footerContact.innerHTML = contactLinks('Hola, KUYARI. Quisiera información sobre sus regalos.', true);
  positionSection();
}
function isPage(path: string) { return /^(?:\/$|\/(?:regalos(?:\/[a-z0-9-]+)?|jardin-cartas|jardin-flores|studio|checkout|cuenta|recuperar|seguimiento|asistente|30-de-septiembre|crear-qr|mis-cartas|pagar-yape|admin|activar-admin)$|\/(?:pedido|recuerdo|sorpresa|politicas)\/[^/]+$)/.test(path); }
let navigating = false, queued: { url: URL; push: boolean } | undefined;
async function navigate(url: URL, push = true) {
  if (navigating) { queued = { url, push }; return; }
  navigating = true;
  try {
    if (push) history.pushState(null, '', url.pathname + url.search + url.hash);
    $('#main-nav').classList.remove('show'); $('#menu-toggle').setAttribute('aria-expanded', 'false');
    $<HTMLDialogElement>('#cart-dialog').close();
    await renderRoute();
    if (!location.hash && location.pathname !== '/crear-qr') window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (e) { page('No pudimos abrir esta sección.', `<p>${esc(e instanceof Error ? e.message : 'Inténtalo de nuevo.')}</p><a href="/" class="btn btn-outline">Volver al inicio</a>`); }
  finally { navigating = false; if (queued) { const next = queued; queued = undefined; await navigate(next.url, next.push); } }
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
