import { esc } from './ui.js';

const scenes = [
  { id: 'entrada', label: 'Jardín', title: 'Una sorpresa empieza contigo.', body: 'Un jardín virtual inspirado en los detalles de KUYARI.', action: 'Crear mi ramo', href: '/jardin-flores' },
  { id: 'flores', label: 'Flores', title: 'Cada detalle, a tu manera.', body: 'Flores, envolturas y cintas para combinar lo que más le gusta.', action: 'Explorar regalos', href: '/regalos' },
  { id: 'cartas', label: 'Cartas', title: 'Tus palabras también florecen.', body: 'Personaliza su carta y acompáñala con sus recuerdos favoritos.', action: 'Crear mi carta y su QR', href: '/crear-qr#personalizar' },
  { id: 'sorpresa', label: 'Tu regalo', title: 'Tu historia, hecha sorpresa.', body: 'Elige tu regalo y coordinamos contigo la disponibilidad y la entrega.', action: 'Crear una sorpresa', href: '/studio' },
];

/** Scroll World architecture A: real final-frame continuity, two native camera chains.
 * Adapted to KUYARI's SPA lifecycle, strict CSP and a section inside the existing home.
 * Video is sought outside the render loop; posters remain until decoded frames paint.
 */
export function mountGardenWorld(root: HTMLElement) {
  root.innerHTML = `<div class="world-stage"><div class="world-media" aria-hidden="true">${scenes.map((s, i) => `<picture data-world-scene="${i}" ${i ? 'hidden' : ''}><source media="(max-width:860px)" srcset="/assets/world/${s.id}-m.webp"><img src="/assets/world/${s.id}-d.webp" alt="" width="1280" height="720" loading="lazy"></picture>`).join('')}</div><div class="world-shade"></div><div class="world-content"><h2 data-world-title>${scenes[0]!.title}</h2><p data-world-body>${scenes[0]!.body}</p><a class="btn btn-primary" data-world-link href="${scenes[0]!.href}">${scenes[0]!.action} ↗</a></div><div class="world-controls"><nav aria-label="Etapas del jardín virtual">${scenes.map((s, i) => `<button type="button" data-world-go="${i}" aria-pressed="${!i}">${esc(s.label)}</button>`).join('')}</nav><a href="#coleccion">Ir a la colección ↗</a></div><p class="world-disclosure">Jardín virtual · imágenes creadas para esta experiencia</p></div>`;
  const small = matchMedia('(max-width:860px)'), motion = matchMedia('(prefers-reduced-motion:reduce)');
  const coarse = matchMedia('(pointer:coarse)').matches;
  const sourceKey = () => small.matches || coarse ? 'm' : 'd';
  const controller = new AbortController();
  const videos = new Map<number, HTMLVideoElement>(), blobs = new Map<number, string>();
  const loading = new Set<number>();
  const pictures = Array.from(root.querySelectorAll<HTMLElement>('[data-world-scene]'));
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-world-go]'));
  let current = 0, fraction = 0, frame = 0, active = false, disposed = false, primed = false, mobile = sourceKey();
  let generation = 0, scrollSpan = 1;
  const headerHeight = () => document.querySelector('.site-header')?.getBoundingClientRect().height ?? 82;
  const updateLayout = () => {
    const height = Math.max(400, innerHeight - headerHeight());
    scrollSpan = height * 1.15;
    root.style.setProperty('--world-header', `${headerHeight()}px`);
    root.style.setProperty('--world-height', `${height}px`);
    root.style.height = motion.matches ? `${height}px` : `${scrollSpan * scenes.length + height}px`;
  };
  const show = (index: number) => {
    current = index;
    pictures.forEach((picture, i) => { picture.hidden = i !== index; });
    const scene = scenes[index]!;
    root.querySelector('[data-world-title]')!.textContent = scene.title;
    root.querySelector('[data-world-body]')!.textContent = scene.body;
    const link = root.querySelector<HTMLAnchorElement>('[data-world-link]')!;
    link.href = scene.href; link.textContent = `${scene.action} ↗`;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    root.dataset.currentScene = scene.id;
  };
  const prime = (video: HTMLVideoElement) => {
    if (!primed || !coarse) return;
    const playing = video.play();
    playing?.then(() => { if (!disposed) video.pause(); }).catch(() => {});
  };
  const seek = () => {
    frame = 0;
    if (disposed || !active || motion.matches) return;
    const video = videos.get(0);
    if (!video || !Number.isFinite(video.duration) || video.seeking) return;
    const time = Math.min(video.duration - .04, Math.max(0, (current + fraction) / scenes.length * video.duration));
    if (Math.abs(video.currentTime - time) > (coarse ? .035 : .015)) video.currentTime = time;
  };
  const scheduleSeek = () => { if (!frame && !disposed) frame = requestAnimationFrame(seek); };
  const load = async () => {
    const index = 0;
    if (videos.has(index) || loading.has(index) || motion.matches || disposed) return;
    loading.add(index);
    const stamp = generation, key = mobile;
    try {
      const response = await fetch(`/assets/world/jardin-${key}.mp4`, { signal: controller.signal });
      if (!response.ok) throw Error('Video no disponible');
      const blob = await response.blob();
      if (disposed || stamp !== generation || motion.matches) return;
      const url = URL.createObjectURL(blob), video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.preload = 'auto';
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      video.className = 'world-video'; video.src = url;
      video.addEventListener('loadeddata', () => { prime(video); scheduleSeek(); }, { signal: controller.signal });
      video.addEventListener('seeked', () => { video.classList.add('is-ready'); scheduleSeek(); }, { signal: controller.signal });
      video.addEventListener('error', () => { video.remove(); videos.delete(index); URL.revokeObjectURL(url); blobs.delete(index); }, { once: true, signal: controller.signal });
      blobs.set(index, url); videos.set(index, video); root.querySelector('.world-media')!.appendChild(video);
    } catch { /* The photographic poster is the usable fallback; no spinner blocks a CTA. */ }
    finally { if (stamp === generation) loading.delete(index); }
  };
  const read = () => {
    if (disposed || motion.matches || !active) return;
    const progress = Math.max(0, Math.min(scenes.length - .001, (headerHeight() - root.getBoundingClientRect().top) / scrollSpan));
    const index = Math.floor(progress); fraction = progress - index;
    if (index !== current) show(index);
    void load(); scheduleSeek();
  };
  const clearVideos = () => {
    generation++; loading.clear(); videos.forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); });
    videos.clear(); blobs.forEach(url => URL.revokeObjectURL(url)); blobs.clear();
  };
  const onResize = () => {
    const next = sourceKey();
    if (next !== mobile) { mobile = next; clearVideos(); }
    updateLayout(); read();
  };
  buttons.forEach((button, i) => button.addEventListener('click', () => {
    if (motion.matches) { show(i); return; }
    window.scrollTo({ top: Math.max(0, scrollY + root.getBoundingClientRect().top - headerHeight() + (i + .45) * scrollSpan), behavior: 'instant' });
    read();
  }, { signal: controller.signal }));
  const observer = new IntersectionObserver(entries => {
    const next = entries.some(entry => entry.isIntersecting);
    if (next === active) return;
    active = next;
    if (active) { window.addEventListener('scroll', read, { passive: true }); read(); }
    else { window.removeEventListener('scroll', read); cancelAnimationFrame(frame); frame = 0; }
  });
  observer.observe(root);
  window.addEventListener('resize', onResize, { passive: true, signal: controller.signal });
  window.addEventListener('pointerdown', () => { primed = true; videos.forEach(prime); }, { once: true, passive: true, signal: controller.signal });
  const onMotion = () => { clearVideos(); root.classList.toggle('world-still', motion.matches); updateLayout(); read(); };
  motion.addEventListener('change', onMotion); updateLayout(); show(0);
  root.classList.toggle('world-still', motion.matches);
  return () => { disposed = true; controller.abort(); observer.disconnect(); motion.removeEventListener('change', onMotion); window.removeEventListener('scroll', read); cancelAnimationFrame(frame); clearVideos(); };
}
