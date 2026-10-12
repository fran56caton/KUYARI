import { esc } from './ui.js';

const scenes = [
  { id: 'entrada', label: 'Jardín', title: 'Una sorpresa empieza contigo.', body: 'Un jardín virtual inspirado en los detalles de KUYARI.', action: 'Crear mi ramo', href: '/jardin-flores' },
  { id: 'flores', label: 'Flores', title: 'Cada detalle, a tu manera.', body: 'Flores, envolturas y cintas para combinar lo que más le gusta.', action: 'Explorar regalos', href: '/regalos' },
  { id: 'cartas', label: 'Cartas', title: 'Tus palabras también florecen.', body: 'Personaliza su carta y acompáñala con sus recuerdos favoritos.', action: 'Crear mi carta y su QR', href: '/crear-qr#personalizar' },
  { id: 'sorpresa', label: 'Tu regalo', title: 'Tu historia, hecha sorpresa.', body: 'Elige tu regalo y coordinamos contigo la disponibilidad y la entrega.', action: 'Crear una sorpresa', href: '/studio' },
];

/** Continuous muted native autoplay, as explicitly requested by the owner.
 * Pause and optional scroll exploration remain deliberate visitor controls.
 */
export function mountGardenWorld(root: HTMLElement) {
  root.innerHTML = `<div class="world-stage"><div class="world-media" aria-hidden="true">${scenes.map((s, i) => `<picture data-world-scene="${i}" ${i ? 'hidden' : ''}><source media="(max-width:860px)" srcset="/assets/world/${s.id}-m.webp"><img src="/assets/world/${s.id}-d.webp" alt="" width="1280" height="720" loading="lazy"></picture>`).join('')}</div><div class="world-shade"></div><div class="world-playback"><button type="button" data-world-play>Reproducir vídeo</button><button type="button" data-world-scroll aria-pressed="false">Explorar con scroll</button><span data-world-error role="status" hidden></span></div><div class="world-content"><h2 data-world-title>${scenes[0]!.title}</h2><p data-world-body>${scenes[0]!.body}</p><a class="btn btn-primary" data-world-link href="${scenes[0]!.href}">${scenes[0]!.action} ↗</a></div><div class="world-controls"><nav aria-label="Etapas del jardín virtual">${scenes.map((s, i) => `<button type="button" data-world-go="${i}" aria-pressed="${!i}">${esc(s.label)}</button>`).join('')}</nav><a href="#coleccion">Ir a la colección ↗</a></div><p class="world-disclosure">Jardín virtual · vídeo creado para esta experiencia</p></div>`;
  const small = matchMedia('(max-width:860px)');
  const sourceKey = () => small.matches ? 'm' : 'd';
  const controller = new AbortController(), signal = controller.signal;
  const pictures = Array.from(root.querySelectorAll<HTMLElement>('[data-world-scene]'));
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-world-go]'));
  const playButton = root.querySelector<HTMLButtonElement>('[data-world-play]')!;
  const scrollButton = root.querySelector<HTMLButtonElement>('[data-world-scroll]')!;
  const error = root.querySelector<HTMLElement>('[data-world-error]')!;
  let video: HTMLVideoElement | undefined;
  let mode: 'video' | 'scroll' = 'video', wantsPlay = true;
  let current = 0, fraction = 0, frame = 0, active = false, disposed = false, mobile = sourceKey();
  let scrollSpan = 1, pendingPosition: number | undefined, playAttempt = 0;
  let selectedScene: number | undefined, pendingPlay: HTMLVideoElement | undefined, retryTimer = 0, retries = 0;
  const headerHeight = () => document.querySelector('.site-header')?.getBoundingClientRect().height ?? 82;
  const updateControl = () => {
    playButton.textContent = mode === 'video' && wantsPlay && video && !video.paused ? 'Pausar vídeo' : 'Reproducir vídeo';
    scrollButton.setAttribute('aria-pressed', String(mode === 'scroll'));
  };
  const updateLayout = () => {
    const height = Math.max(400, innerHeight - headerHeight());
    scrollSpan = height * 1.15;
    root.style.setProperty('--world-header', `${headerHeight()}px`);
    root.style.setProperty('--world-height', `${height}px`);
    root.style.height = mode === 'scroll' ? `${scrollSpan * scenes.length + height}px` : `${height}px`;
    root.classList.toggle('world-scroll', mode === 'scroll');
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
  const pause = () => { playAttempt++; pendingPlay = undefined; clearTimeout(retryTimer); retryTimer = 0; video?.pause(); updateControl(); };
  const applyPosition = () => {
    if (!video || pendingPosition === undefined || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(video.duration - .04, pendingPosition * video.duration);
    pendingPosition = undefined;
  };
  const syncScene = () => {
    if (!video || mode !== 'video' || selectedScene !== undefined || pendingPosition !== undefined || !Number.isFinite(video.duration)) return;
    const index = Math.min(scenes.length - 1, Math.floor(video.currentTime / video.duration * scenes.length));
    if (index !== current) show(index);
  };
  const play = () => {
    if (!video || mode !== 'video' || !wantsPlay || !active || document.hidden || disposed || !video.paused || pendingPlay === video) return;
    clearTimeout(retryTimer); retryTimer = 0;
    const media = video; pendingPlay = media;
    const attempt = ++playAttempt;
    void media.play().then(() => {
      if (disposed || attempt !== playAttempt) return;
      pendingPlay = undefined; retries = 0; updateControl();
    }).catch(() => {
      if (disposed || attempt !== playAttempt) return;
      pendingPlay = undefined; updateControl();
      // An interrupted first attempt must not become a permanent manual-play state.
      if (wantsPlay && active && mode === 'video' && !document.hidden && retries < 3) {
        retryTimer = window.setTimeout(() => { retryTimer = 0; play(); }, 250 * 2 ** retries++);
      }
    });
  };
  const load = () => {
    if (video || disposed) return;
    const media = document.createElement('video'); video = media;
    media.muted = true; media.defaultMuted = true; media.playsInline = true; media.loop = true; media.autoplay = wantsPlay && mode === 'video'; media.preload = 'auto';
    media.setAttribute('muted', ''); media.setAttribute('playsinline', ''); media.setAttribute('loop', '');
    media.className = 'world-video'; media.src = `/assets/world/jardin-${mobile}.mp4`;
    media.addEventListener('loadedmetadata', () => { applyPosition(); read(); }, { signal });
    media.addEventListener('loadeddata', () => { media.classList.add('is-ready'); if (mode === 'scroll') read(); else play(); }, { signal });
    media.addEventListener('canplay', play, { signal });
    media.addEventListener('playing', () => {
      if (!wantsPlay || mode !== 'video' || !active || document.hidden) { pause(); return; }
      media.classList.add('is-ready'); error.hidden = true; retries = 0; updateControl();
    }, { signal });
    media.addEventListener('pause', updateControl, { signal });
    media.addEventListener('timeupdate', syncScene, { signal });
    media.addEventListener('seeked', () => { media.classList.add('is-ready'); if (mode === 'scroll') read(); else syncScene(); }, { signal });
    media.addEventListener('error', () => {
      if (video !== media || disposed) return;
      wantsPlay = false; media.classList.remove('is-ready'); updateControl();
      error.textContent = 'No se pudo cargar el vídeo. Pulsa Reproducir vídeo para reintentar.'; error.hidden = false;
    }, { signal });
    root.querySelector('.world-media')!.appendChild(media);
    play();
  };
  const seek = () => {
    frame = 0;
    if (disposed || !active || mode !== 'scroll' || !video || !Number.isFinite(video.duration) || video.seeking) return;
    const time = Math.min(video.duration - .04, Math.max(0, (current + fraction) / scenes.length * video.duration));
    if (Math.abs(video.currentTime - time) > .035) video.currentTime = time;
  };
  const read = () => {
    if (disposed || mode !== 'scroll' || !active) return;
    const progress = Math.max(0, Math.min(scenes.length - .001, (headerHeight() - root.getBoundingClientRect().top) / scrollSpan));
    const index = Math.floor(progress); fraction = progress - index;
    if (index !== current) show(index);
    load();
    if (!frame) frame = requestAnimationFrame(seek);
  };
  const clearVideo = () => {
    pause();
    if (video) { const old = video; video = undefined; old.removeAttribute('src'); old.load(); old.remove(); }
  };
  const setMode = (next: 'video' | 'scroll') => {
    const wasScroll = mode === 'scroll'; mode = next; updateLayout(); updateControl();
    if (wasScroll && next === 'video') root.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  buttons.forEach((button, i) => button.addEventListener('click', () => {
    if (mode === 'scroll') {
      window.scrollTo({ top: Math.max(0, scrollY + root.getBoundingClientRect().top - headerHeight() + (i + .45) * scrollSpan), behavior: 'instant' }); read();
    } else {
      selectedScene = i; show(i); pendingPosition = (i + .45) / scenes.length;
      load(); applyPosition(); play(); updateControl();
    }
  }, { signal }));
  playButton.addEventListener('click', () => {
    if (mode === 'video' && wantsPlay && video && !video.paused) { wantsPlay = false; if (video) video.autoplay = false; pause(); }
    else {
      wantsPlay = true; retries = 0; error.hidden = true;
      setMode('video'); load();
      if (video?.error) video.load();
      play();
    }
    updateControl();
  }, { signal });
  scrollButton.addEventListener('click', () => {
    wantsPlay = false; pause();
    if (video) video.autoplay = false;
    if (mode === 'scroll') { wantsPlay = true; selectedScene = undefined; setMode('video'); play(); }
    else {
      setMode('scroll');
      window.scrollTo({ top: Math.max(0, scrollY + root.getBoundingClientRect().top - headerHeight() + (current + .45) * scrollSpan), behavior: 'instant' }); read();
    }
    updateControl();
  }, { signal });
  const observer = new IntersectionObserver(entries => {
    active = entries.some(entry => entry.isIntersecting);
    if (active) { retries = 0; load(); if (mode === 'scroll') read(); else play(); }
    else { pause(); cancelAnimationFrame(frame); frame = 0; }
  });
  observer.observe(root);
  window.addEventListener('scroll', read, { passive: true, signal });
  window.addEventListener('resize', () => {
    const next = sourceKey();
    if (next !== mobile) {
      pendingPosition = video?.duration ? video.currentTime / video.duration : (current + .45) / scenes.length;
      mobile = next; clearVideo(); if (active) load();
    }
    updateLayout(); read();
  }, { passive: true, signal });
  const resume = () => { retries = 0; play(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else resume(); }, { signal });
  window.addEventListener('pageshow', resume, { signal });
  window.addEventListener('focus', resume, { signal });
  // Recover a browser's gesture requirement from any page interaction, never a required play-button click.
  document.addEventListener('pointerdown', resume, { passive: true, signal });
  document.addEventListener('touchend', resume, { passive: true, signal });
  document.addEventListener('keydown', resume, { signal });
  updateLayout(); show(0); updateControl();
  return () => { disposed = true; controller.abort(); observer.disconnect(); cancelAnimationFrame(frame); clearVideo(); };
}
