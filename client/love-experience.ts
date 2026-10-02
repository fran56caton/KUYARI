import type { LoveContent } from '../shared/romance.js';
import { esc } from './ui.js';
import { loveArt, loveParticles } from './love-art.js';
function safeLink(link: string) { try { const u = new URL(link); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }
export interface LoveAsset { id: string; mime: string }
export type LoveExperience = (() => void) & { update: (content: LoveContent, assets: LoveAsset[]) => boolean };
export function mountLoveExperience(root: HTMLElement, c: LoveContent, assets: LoveAsset[] = []): LoveExperience {
  function buildScreens() {
  const date = c.specialDate ? new Date(`${c.specialDate}T12:00:00Z`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }) : '';
  return [
    { name: 'Tu carta', html: `<span class="love-overline">${esc(c.occasion)}${date ? ` · ${esc(date)}` : ''}</span><h2>${esc(c.title)}</h2><p class="love-to">Para ${esc(c.recipient)}</p><div class="love-letter-text">${esc(c.message)}</div>${c.sender ? `<p class="love-signature">Con amor, ${esc(c.sender)}</p>` : ''}` },
    ...c.chapters.map((ch, i) => ({ name: `Recuerdo ${i + 1}`, html: `<span class="love-overline">UN PEDACITO DE NUESTRA HISTORIA</span><span class="love-chapter-number">${String(i + 1).padStart(2, '0')}</span><h2>${esc(ch.title)}</h2><div class="love-letter-text">${esc(ch.text)}</div><span class="love-flourish" aria-hidden="true">❦</span>` })),
    ...(c.promises.length ? [{ name: 'Mis promesas', html: `<span class="love-overline">LOS PEQUEÑOS DETALLES</span><h2>Lo que quiero<br>vivir contigo.</h2><ol class="love-promises">${c.promises.map((p, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span>${esc(p)}</li>`).join('')}</ol>` }] : []),
    ...(assets.length ? [{ name: 'Nuestros momentos', html: `<span class="love-overline">MOMENTOS QUE SE QUEDAN</span><h2>Una vida en<br>pequeños recuerdos.</h2><div class="love-photo-grid">${assets.map(a => a.mime.startsWith('video/') ? `<video src="/api/assets/${esc(a.id)}" controls playsinline preload="none" aria-label="Video de esta sorpresa"></video>` : `<figure><img src="/api/assets/${esc(a.id)}" alt="Un momento elegido para esta carta" loading="lazy" decoding="async"><figcaption>Un recuerdo para siempre ♡</figcaption></figure>`).join('')}</div>` }] : []),
    { name: 'Siempre contigo', html: `<span class="love-overline">Y SIEMPRE QUE QUIERAS, VUELVE AQUÍ</span><div class="love-final-heart" aria-hidden="true">♡</div><h2>${esc(c.closing || 'Qué bonito coincidir contigo.')}</h2>${c.sender ? `<p class="love-signature">${esc(c.sender)}</p>` : ''}<div class="love-extra-links">${safeLink(c.songUrl) ? `<a class="love-soft-button" href="${esc(c.songUrl)}" target="_blank" rel="noopener noreferrer">♫ Nuestra canción</a>` : ''}${safeLink(c.videoUrl) ? `<a class="love-soft-button" href="${esc(c.videoUrl)}" target="_blank" rel="noopener noreferrer">▷ Nuestro video</a>` : ''}</div><button class="love-soft-button" data-love-replay>Volver a sentirlo ↻</button>` }
  ];
  }
  let screens = buildScreens();
  root.innerHTML = `<div class="love-stage palette-${c.palette} theme-${c.theme} ${c.details.includes('sparkle') ? 'has-opening-sparkle' : ''} text-${c.textStyle} intensity-${c.intensity}">${loveArt(c)}${loveParticles(c)}<div class="love-stage-vignette"></div><button type="button" class="love-motion-toggle" aria-pressed="false">Pausar movimiento</button><button type="button" class="love-sound" aria-pressed="false" aria-label="Activar melodía de la sorpresa">♫ <span>Melodía</span></button><div class="love-intro"><p class="love-overline">KUYARI · UNA HISTORIA SOLO PARA TI</p><h2>${esc(c.recipient ? `Para ${c.recipient}.` : 'Para alguien muy especial.')}</h2><p>${esc(c.subtitle)}</p><button type="button" class="love-opening opening-${c.opening}" aria-label="Abrir esta sorpresa"><span class="love-envelope-flap"></span><span class="love-envelope-paper">${esc(c.recipient)}</span><span class="love-seal">♡</span><span class="love-book-mark">❦</span></button><p class="love-invitation">${c.opening === 'gates' ? 'Abre las puertas de nuestra historia' : c.opening === 'heart' ? 'Toca el corazón. Hay algo para ti.' : c.opening === 'book' ? 'Abre el primer capítulo de nuestra historia' : 'Toca el sobre. Lo escribí pensando en ti.'}</p><button class="love-open-text" type="button">Abrir mi sorpresa <span>↗</span></button></div><div class="love-content-panel" hidden><article class="love-paper" tabindex="-1"></article><nav class="love-story-nav" aria-label="Capítulos de la sorpresa"><button class="love-back" type="button" aria-label="Capítulo anterior">←</button><div class="love-story-progress" aria-live="polite"></div><button class="love-next" type="button">Siguiente →</button></nav></div><div class="love-stage-brand">Hecho con cariño · KUYARI</div></div>`;
  const stage = root.querySelector<HTMLElement>('.love-stage')!, intro = root.querySelector<HTMLElement>('.love-intro')!, panel = root.querySelector<HTMLElement>('.love-content-panel')!, paper = root.querySelector<HTMLElement>('.love-paper')!;
  let openingTimer: ReturnType<typeof setTimeout> | undefined; let index = 0, disposed = false, music: AudioContext | null = null, musicTimer: ReturnType<typeof setInterval> | null = null;
  const sound = root.querySelector<HTMLButtonElement>('.love-sound')!;
  function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; if (music) void music.close(); music = null; sound.setAttribute('aria-pressed', 'false'); }
  sound.onclick = () => {
    if (music) { stopMusic(); return; }
    try {
      music = new AudioContext(); let noteIndex = 0;
      const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
      const play = () => { if (!music || disposed) return; const o = music.createOscillator(), g = music.createGain(); o.type = 'sine'; o.frequency.value = notes[noteIndex++ % notes.length]; g.gain.setValueAtTime(0, music.currentTime); g.gain.linearRampToValueAtTime(.025, music.currentTime + .03); g.gain.exponentialRampToValueAtTime(.001, music.currentTime + 1.8); o.connect(g); g.connect(music.destination); o.start(); o.stop(music.currentTime + 2); }; play(); musicTimer = setInterval(play, 1050); sound.setAttribute('aria-pressed', 'true');
    } catch { sound.textContent = 'Melodía no disponible'; }
  };
  let pageAnimation: Animation | undefined, motionPaused = false;
  function render(focus = true, animate = true) {
    paper.innerHTML = screens[index].html; paper.scrollTop = 0;
    pageAnimation?.cancel();
    if (animate && !motionPaused && !matchMedia('(prefers-reduced-motion: reduce)').matches) pageAnimation = paper.animate([{ opacity: 0, transform: 'translateY(30px) rotate(-3deg)' }, { opacity: 1, transform: 'translateY(0) rotate(0)' }], { duration: 800, easing: 'ease', fill: 'none' });
    const back = root.querySelector<HTMLButtonElement>('.love-back')!, next = root.querySelector<HTMLButtonElement>('.love-next')!;
    back.disabled = index === 0; next.disabled = index === screens.length - 1; next.textContent = index === screens.length - 2 ? 'Mi último detalle →' : 'Siguiente →';
    root.querySelector('.love-story-progress')!.innerHTML = `<span>${String(index + 1).padStart(2, '0')} / ${String(screens.length).padStart(2, '0')}</span><small>${esc(screens[index].name)}</small>`;
    root.querySelector<HTMLButtonElement>('[data-love-replay]')?.addEventListener('click', replay);
    if (focus) paper.focus({ preventScroll: true });
  }
  function open() { if (stage.classList.contains('love-opening-now')) return; stage.classList.add('love-opening-now'); const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; openingTimer = setTimeout(() => { if (disposed) return; stage.classList.add('love-opened'); intro.hidden = true; panel.hidden = false; index = 0; render(); }, reduced ? 0 : 800); }
  function replay() { panel.hidden = true; intro.hidden = false; stage.classList.remove('love-opened', 'love-opening-now'); root.querySelector<HTMLButtonElement>('.love-opening')!.focus(); }
  root.querySelector<HTMLButtonElement>('.love-opening')!.onclick = open; root.querySelector<HTMLButtonElement>('.love-open-text')!.onclick = open;
  root.querySelector<HTMLButtonElement>('.love-back')!.onclick = () => { if (index > 0) { index--; render(); } };
  root.querySelector<HTMLButtonElement>('.love-next')!.onclick = () => { if (index < screens.length - 1) { index++; render(); } };
  let visible = true;
  const updateMotion = () => { const inactive = document.hidden || !visible; stage.classList.toggle('love-motion-paused', inactive || motionPaused); if (inactive) stopMusic(); };
  const motionButton = root.querySelector<HTMLButtonElement>('.love-motion-toggle')!;
  motionButton.onclick = () => { motionPaused = !motionPaused; motionButton.setAttribute('aria-pressed', String(motionPaused)); motionButton.textContent = motionPaused ? 'Volver a animar' : 'Pausar movimiento'; if (motionPaused) pageAnimation?.cancel(); updateMotion(); };
  const onKey = (event: KeyboardEvent) => {
    if (panel.hidden || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.target as Element).closest('input,textarea,select,[contenteditable],video,audio')) return;
    const nextIndex = event.key === 'ArrowRight' ? Math.min(index + 1, screens.length - 1) : event.key === 'ArrowLeft' ? Math.max(index - 1, 0) : index;
    if (nextIndex !== index) { event.preventDefault(); index = nextIndex; render(); }
  };
  root.addEventListener('keydown', onKey);
  const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; updateMotion(); }); observer.observe(stage);
  document.addEventListener('visibilitychange', updateMotion); updateMotion();
  const dispose = (() => { disposed = true; clearTimeout(openingTimer); pageAnimation?.cancel(); observer.disconnect(); root.removeEventListener('keydown', onKey); stopMusic(); document.removeEventListener('visibilitychange', updateMotion); root.innerHTML = ''; }) as LoveExperience;
  const visualKey = (content: LoveContent) => JSON.stringify([content.theme, content.palette, content.opening, content.flower, content.details, content.intensity, content.textStyle]);
  dispose.update = (content, nextAssets) => {
    if (disposed || visualKey(content) !== visualKey(c)) return false;
    c = content; assets = nextAssets; screens = buildScreens(); index = Math.min(index, screens.length - 1);
    intro.querySelector('h2')!.textContent = c.recipient ? 'Para ' + c.recipient + '.' : 'Para alguien muy especial.';
    intro.querySelectorAll('p')[1].textContent = c.subtitle;
    root.querySelector('.love-envelope-paper')!.textContent = c.recipient;
    if (!panel.hidden) render(false, false);
    return true;
  };
  return dispose;
}
