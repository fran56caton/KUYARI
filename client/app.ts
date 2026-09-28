import { campaign } from './seasonal.js';
import type { User, Product } from '../shared/models.js';
import { $, api, state, card, page, esc, fail, type Store } from './ui.js';
import { catalog, product, assistant } from './catalog.js';
import { studio } from './studio.js';
import { initCart, checkout } from './checkout.js';
import { account, recovery, tracking, order, memory, policy, setup } from './customer.js';
import { initContact } from './contact.js';
import { admin } from './admin.js';
async function start() {
  const session = await api<{ csrf: string; user: User | null }>('/api/session');
  const store = await api<Store>('/api/store');
  state.csrf = session.csrf; state.user = session.user; state.store = store;
  $('#year').textContent = String(new Date().getFullYear());
  if (store.hasDemoProducts || (store.environment === 'production' && !store.storeLive)) { const banner = $('#environment-banner'); banner.hidden = false; banner.textContent = store.hasDemoProducts ? 'Colección de muestra · consulta por WhatsApp la disponibilidad y el precio antes de confirmar.' : 'Estamos preparando nuestra apertura. Las compras aún no están habilitadas.'; }
  $('#menu-toggle').onclick = () => { const open = $('#main-nav').classList.toggle('show'); $('#menu-toggle').setAttribute('aria-expanded', String(open)); };
  initCart();
  initContact();
  const path = location.pathname;
  if (path === '/') { const data = await api<{ products: Product[] }>('/api/products?excludeOccasion=30%20de%20septiembre'); $('#home-products').innerHTML = data.products.slice(0, 6).map(card).join('') || '<p class="empty-state">Nuestra colección está tomando forma. Vuelve pronto para encontrar tu próxima sorpresa.</p>'; }
  else if (path === '/30-de-septiembre') await campaign();
  else if (path === '/regalos') await catalog();
  else if (path.startsWith('/regalos/')) await product(path.split('/')[2]);
  else if (path === '/studio') await studio();
  else if (path === '/checkout') await checkout();
  else if (path === '/cuenta') await account();
  else if (path === '/recuperar') recovery();
  else if (path === '/seguimiento') tracking();
  else if (path.startsWith('/pedido/')) await order(path.split('/')[2]);
  else if (path.startsWith('/recuerdo/')) await memory(path.split('/')[2]);
  else if (path.startsWith('/politicas/')) await policy(path.split('/')[2]);
  else if (path === '/asistente') await assistant();
  else if (path === '/admin') await admin();
  else if (path === '/activar-admin') setup();
}
window.addEventListener('unhandledrejection', e => { e.preventDefault(); fail(e.reason); });
start().catch(e => { page('No pudimos abrir esta página.', `<p>${esc(e instanceof Error ? e.message : 'Inténtalo nuevamente en unos instantes.')}</p><div class="form-actions"><button id="retry-page" class="btn btn-primary">Reintentar</button><a href="/" class="btn btn-outline">Volver al inicio</a></div>`); $('#retry-page').onclick = () => location.reload(); });
