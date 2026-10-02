import { defaultLoveContent, type LoveContent } from '../shared/romance.js';
import { esc } from './ui.js';
import { loveArt, loveParticles } from './love-art.js';
import { isLoveBook } from '../shared/book.js';
import { buildLoveBook, bookCover } from './love-book.js';
function safeLink(link: string) { try { const u = new URL(link); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }
export interface LoveAsset { id: string; mime: string }
export type LoveExperience = (() => void) & { update: (content: LoveContent, assets: LoveAsset[]) => boolean };
export function mountLoveExperience(root: HTMLElement, c: LoveContent, assets: LoveAsset[] = []): LoveExperience {
  c = { ...defaultLoveContent(), ...c };
  const book = isLoveBook(c);
  let singleBook = root.clientWidth < 640;
  const memories = () => assets.filter(a => !a.mime.startsWith('audio/'));
  function buildScreens() {
  if (book) return buildLoveBook(c, assets, singleBook);
  const date = c.specialDate ? new Date(`${c.specialDate}T12:00:00Z`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }) : '';
  return [
    { name: 'Tu carta', html: `<span class="love-overline">${esc(c.occasion)}${date ? ` · ${esc(date)}` : ''}</span><h2>${esc(c.title)}</h2><p class="love-to">Para ${esc(c.recipient)}</p><div class="love-letter-text">${esc(c.message)}</div>${c.sender ? `<p class="love-signature">Con amor, ${esc(c.sender)}</p>` : ''}` },
    ...c.chapters.map((ch, i) => ({ name: `Recuerdo ${i + 1}`, html: `<span class="love-overline">UN PEDACITO DE NUESTRA HISTORIA</span><span class="love-chapter-number">${String(i + 1).padStart(2, '0')}</span><h2>${esc(ch.title)}</h2><div class="love-letter-text">${esc(ch.text)}</div><span class="love-flourish" aria-hidden="true">❦</span>` })),
    ...(c.promises.length ? [{ name: 'Mis promesas', html: `<span class="love-overline">LOS PEQUEÑOS DETALLES</span><h2>Lo que quiero<br>vivir contigo.</h2><ol class="love-promises">${c.promises.map((p, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span>${esc(p)}</li>`).join('')}</ol>` }] : []),
    ...(memories().length ? [{ name: 'Nuestros momentos', html: `<span class="love-overline">MOMENTOS QUE SE QUEDAN</span><h2>Una vida en<br>pequeños recuerdos.</h2><div class="love-photo-grid photo-${c.photoStyle}">${memories().map(a => a.mime.startsWith('video/') ? `<video src="/api/assets/${esc(a.id)}" controls playsinline preload="none" aria-label="Video de esta sorpresa"></video>` : `<figure><img src="/api/assets/${esc(a.id)}" alt="Un momento elegido para esta carta" loading="lazy" decoding="async"><figcaption>Un recuerdo para siempre ♡</figcaption></figure>`).join('')}</div>` }] : []),
    ...(c.secretMessage ? [{ name: 'Un secreto para ti', html: `<span class="love-overline">UN DETALLE SOLO NUESTRO</span><h2>Hay algo más<br>para tu corazón.</h2><div class="love-scratch"><p class="love-secret" hidden>${esc(c.secretMessage)}</p><canvas width="640" height="280" aria-label="Raspa con tu dedo para descubrir el mensaje"></canvas></div><p class="fine-print">Raspa el corazón con tu dedo o usa este botón.</p><button type="button" class="love-soft-button" data-love-secret>Descubrir mi mensaje ♡</button>` }] : []),
    { name: 'Siempre contigo' , html: `<span class="love-overline">Y SIEMPRE QUE QUIERAS, VUELVE AQUÍ</span><div class="love-final-heart" aria-hidden="true">♡</div><h2>${esc(c.closing || 'Qué bonito coincidir contigo.')}</h2>${c.sender ? `<p class="love-signature">${esc(c.sender)}</p>` : ''}<div class="love-extra-links">${safeLink(c.songUrl) ? `<a class="love-soft-button" href="${esc(c.songUrl)}" target="_blank" rel="noopener noreferrer">♫ Nuestra canción</a>` : ''}${safeLink(c.videoUrl) ? `<a class="love-soft-button" href="${esc(c.videoUrl)}" target="_blank" rel="noopener noreferrer">▷ Nuestro video</a>` : ''}</div><button class="love-soft-button" data-love-replay>Volver a sentirlo ↻</button>` }
  ];
  }
  let screens = buildScreens();
  root.innerHTML = `<div class="love-stage palette-${c.palette} theme-${c.theme} ${c.details.includes('sparkle') ? 'has-opening-sparkle' : ''} text-${c.textStyle} intensity-${c.intensity}">${loveArt(c)}${loveParticles(c)}${['scrapbook','vinyl'].includes(c.theme)?'<div class="love-vinyl" aria-hidden="true"><span>KUYARI<br>♫</span></div>':''}<div class="love-stage-vignette"></div><button type="button" class="love-motion-toggle" aria-pressed="false">Pausar movimiento</button><button type="button" class="love-sound" aria-pressed="false" aria-label="Activar melodía de la sorpresa">♫ <span>Melodía</span></button><div class="love-music-panel" hidden></div><div class="love-intro"><p class="love-overline">KUYARI · UNA HISTORIA SOLO PARA TI</p><h2>${esc(c.recipient ? `Para ${c.recipient}.` : 'Para alguien muy especial.')}</h2><p>${esc(c.subtitle)}</p><button type="button" class="love-opening opening-${c.opening}" aria-label="Abrir esta sorpresa"><span class="love-envelope-flap"></span><span class="love-envelope-paper">${esc(c.recipient)}</span><span class="love-seal">♡</span><span class="love-book-mark">❦</span></button><p class="love-invitation">${c.opening === 'gates' ? 'Abre las puertas de nuestra historia' : c.opening === 'heart' ? 'Toca el corazón. Hay algo para ti.' : c.opening === 'book' ? 'Abre el primer capítulo de nuestra historia' : 'Toca el sobre. Lo escribí pensando en ti.'}</p><button class="love-open-text" type="button">Abrir mi sorpresa <span>↗</span></button></div><div class="love-content-panel" hidden><article class="love-paper" tabindex="-1"></article><nav class="love-story-nav" aria-label="Capítulos de la sorpresa"><button class="love-back" type="button" aria-label="Capítulo anterior">←</button><div class="love-story-progress" aria-live="polite"></div><button class="love-next" type="button">Siguiente →</button></nav></div><div class="love-stage-brand">Hecho con cariño · KUYARI</div></div>`;
  const stage = root.querySelector<HTMLElement>('.love-stage')!, intro = root.querySelector<HTMLElement>('.love-intro')!, panel = root.querySelector<HTMLElement>('.love-content-panel')!, paper = root.querySelector<HTMLElement>('.love-paper')!;
  if (book) {
    stage.classList.add('book-experience', `book-style-${c.bookStyle}`, `book-photos-${c.photoStyle}`);
    root.querySelector('.love-opening')!.insertAdjacentHTML('beforeend', bookCover(c, assets));
    root.querySelector('.love-story-nav')!.insertAdjacentHTML('afterbegin', '<button type="button" class="book-contents-button" aria-label="Ir al índice del libro">Índice</button>');
    root.querySelector('.love-invitation')!.textContent = 'Abre el primer capítulo de nuestra historia';
  }
  let openingTimer: ReturnType<typeof setTimeout> | undefined; let index = 0, disposed = false, music: AudioContext | null = null, musicTimer: ReturnType<typeof setInterval> | null = null;
  let audio: HTMLAudioElement | null = null;
  const musicPanel = root.querySelector<HTMLElement>('.love-music-panel')!;
  const sound = root.querySelector<HTMLButtonElement>('.love-sound')!;
  function stopMusic() { audio?.pause(); stage.classList.remove('love-music-playing'); if (musicTimer) clearInterval(musicTimer); musicTimer = null; if (music) void music.close(); music = null; sound.setAttribute('aria-pressed', 'false'); }
  const favoriteSource = () => { const upload = assets.find(a => a.mime.startsWith('audio/')); if (upload) return '/api/assets/' + upload.id; return safeLink(c.songUrl) && /\.mp3(?:$|[?#])/i.test(c.songUrl) ? c.songUrl : ''; };
  sound.hidden = c.musicMode === 'off';
  sound.setAttribute('aria-label', c.musicMode === 'favorite' ? 'Escuchar nuestra canción' : 'Activar melodía de la sorpresa');
  sound.querySelector('span')!.textContent = c.musicMode === 'favorite' ? 'Nuestra canción' : 'Melodía';
  sound.onclick = () => {
    if (c.musicMode === 'off') return;
    if (c.musicMode === 'favorite') {
      if (audio && !audio.paused) { stopMusic(); return; }
      musicPanel.hidden = false;
      const src = favoriteSource();
      if (!src) { musicPanel.innerHTML = safeLink(c.songUrl) ? `<p>La canción que elegí para nosotros.</p><a class="love-soft-button" href="${esc(c.songUrl)}" target="_blank" rel="noopener noreferrer">♫ Abrir nuestra canción</a><button type="button" data-close-music aria-label="Cerrar música">✕</button>` : '<p>Añade un MP3 o un enlace en Los detalles para elegir tu canción.</p><button type="button" data-close-music aria-label="Cerrar música">✕</button>'; }
      else {
        if (!audio) { musicPanel.innerHTML = '<p>Nuestra canción ♫</p><audio controls loop preload="none" aria-label="Nuestra canción favorita"></audio><p class="love-audio-status" role="status"></p><button type="button" data-close-music aria-label="Cerrar música">✕</button>'; audio = musicPanel.querySelector('audio')!; audio.src = src; audio.onplay = () => { sound.setAttribute('aria-pressed','true'); stage.classList.add('love-music-playing'); }; audio.onpause = () => { sound.setAttribute('aria-pressed','false'); stage.classList.remove('love-music-playing'); }; audio.onerror = () => { musicPanel.querySelector('.love-audio-status')!.textContent = 'No pudimos reproducir esta canción. Comprueba el MP3 o su enlace.'; }; }
        void audio.play().catch(() => { musicPanel.querySelector('.love-audio-status')!.textContent = 'Toca reproducir en el control de música.'; });
      }
      musicPanel.querySelector<HTMLButtonElement>('[data-close-music]')!.onclick = () => { stopMusic(); musicPanel.hidden = true; };
      return;
    }
    if (music) { stopMusic(); return; }
    try {
      music = new AudioContext(); let noteIndex = 0;
      const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
      const play = () => { if (!music || disposed) return; const o = music.createOscillator(), g = music.createGain(); o.type = 'sine'; o.frequency.value = notes[noteIndex++ % notes.length]; g.gain.setValueAtTime(0, music.currentTime); g.gain.linearRampToValueAtTime(.025, music.currentTime + .03); g.gain.exponentialRampToValueAtTime(.001, music.currentTime + 1.8); o.connect(g); g.connect(music.destination); o.start(); o.stop(music.currentTime + 2); }; play(); musicTimer = setInterval(play, 1050); sound.setAttribute('aria-pressed', 'true'); stage.classList.add('love-music-playing');
    } catch { sound.textContent = 'Melodía no disponible'; }
  };
  let pageAnimation: Animation | undefined, motionPaused = false;
  let previousIndex = 0;
  let turningSheet: HTMLElement | undefined;
  function render(focus = true, animate = true) {
    pageAnimation?.cancel(); turningSheet?.remove(); turningSheet = undefined;
    paper.querySelectorAll<HTMLVideoElement>('video').forEach(v=>v.pause());
    const forward = index >= previousIndex;
    const oldPage = book && c.transition === 'page' && animate && index !== previousIndex ? paper.querySelector<HTMLElement>(singleBook || !forward ? '.book-page' : '.book-page:last-child')?.cloneNode(true) as HTMLElement | undefined : undefined;
    paper.innerHTML = screens[index].html; paper.scrollTop = 0;
    if (animate && !motionPaused && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (oldPage) {
        turningSheet=oldPage; oldPage.classList.add('book-turning-sheet'); oldPage.classList.toggle('turn-back',!forward);oldPage.classList.toggle('turn-single',singleBook);oldPage.setAttribute('aria-hidden','true');oldPage.inert=true;paper.append(oldPage);
        pageAnimation=oldPage.animate([{transform:'perspective(1600px) rotateY(0deg)',opacity:1},{transform:`perspective(1600px) rotateY(${forward?-110:110}deg)`,opacity:0}],{duration:650,easing:'cubic-bezier(.25,.65,.25,1)',fill:'forwards'});
        pageAnimation.onfinish=()=>{oldPage.remove();if(turningSheet===oldPage)turningSheet=undefined;};
      } else {
        const transform = c.transition === 'fade' ? 'none' : c.transition === 'zoom' ? 'scale(.92)' : c.transition === 'float' ? 'translateY(24px)' : book ? 'none' : 'translateY(25px) rotate(-2deg)';
        pageAnimation = paper.animate([{opacity:.4,transform},{opacity:1,transform:'none'}],{duration:book?350:c.transition==='fade'?420:600,easing:'ease-out',fill:'none'});
      }
    }
    previousIndex = index;
    paper.querySelectorAll<HTMLButtonElement>('[data-book-jump]').forEach(button => { button.onclick = () => { index = Math.min(Number(button.dataset.bookJump), screens.length - 1); render(); }; });
    paper.querySelector<HTMLButtonElement>('[data-book-music]')?.addEventListener('click', () => sound.click());
    root.querySelectorAll<HTMLVideoElement>('video').forEach(video => { if (!paper.contains(video)) video.pause(); });
    const canvas = paper.querySelector<HTMLCanvasElement>('.love-scratch canvas'), secret = paper.querySelector<HTMLElement>('.love-secret');
    const reveal = () => { if (canvas && secret) { canvas.hidden = true; secret.hidden = false; paper.querySelector<HTMLButtonElement>('[data-love-secret]')!.disabled = true; } };
    paper.querySelector<HTMLButtonElement>('[data-love-secret]')?.addEventListener('click',reveal);
    if (canvas && secret) {
      const ctx = canvas.getContext('2d')!; const gradient = ctx.createLinearGradient(0,0,640,280); gradient.addColorStop(0,'#edbecf'); gradient.addColorStop(1,'#b87d9b'); ctx.fillStyle=gradient; ctx.fillRect(0,0,640,280); ctx.fillStyle='#fff8ee'; ctx.font='54px Georgia'; ctx.textAlign='center'; ctx.fillText('♡',320,115); ctx.font='26px Georgia'; ctx.fillText('Raspa y descubre',320,180); let down=false;
      canvas.onpointerdown = event => { down=true; canvas.setPointerCapture(event.pointerId); secret.hidden=false; erase(event); };
      function erase(event: PointerEvent) { if (!down || !ctx || !canvas) return; const rect=canvas.getBoundingClientRect(); ctx.globalCompositeOperation='destination-out'; ctx.beginPath(); ctx.arc((event.clientX-rect.left)/rect.width*640,(event.clientY-rect.top)/rect.height*280,42,0,Math.PI*2); ctx.fill(); }
      canvas.onpointermove=erase; canvas.onpointercancel=()=>{down=false;}; canvas.onpointerup=()=>{down=false; const pixels=ctx.getImageData(0,0,640,280).data;let clear=0,total=0;for(let i=3;i<pixels.length;i+=128){total++;if(pixels[i]<50)clear++;}if(clear/total>.35)reveal();};
    }
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
  root.querySelector<HTMLButtonElement>('.book-contents-button')?.addEventListener('click', () => { index = singleBook ? 2 : 1; render(); });
  let swipeStart: {x:number;y:number} | undefined;
  const onPointerDown = (event: PointerEvent) => { if (!book || event.pointerType === 'mouse' || (event.target as Element).closest('button,a,canvas,video,audio')) return; swipeStart = {x:event.clientX,y:event.clientY}; };
  const onPointerUp = (event: PointerEvent) => { if (!swipeStart) return; const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=undefined;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.4)return;const next=Math.max(0,Math.min(screens.length-1,index+(dx<0?1:-1)));if(next!==index){index=next;render();} };
  const onPointerCancel = () => { swipeStart=undefined; };
  paper.addEventListener('pointerdown',onPointerDown);paper.addEventListener('pointerup',onPointerUp);paper.addEventListener('pointercancel',onPointerCancel);
  const resize = new ResizeObserver(() => { if (!book) return; const next = root.clientWidth < 640; if (next === singleBook) return; index = next ? index*2 : Math.floor(index/2); singleBook=next; screens=buildScreens(); index=Math.min(index,screens.length-1); if(!panel.hidden)render(false,false); });resize.observe(root);
  let visible = true;
  const updateMotion = () => { const inactive = document.hidden || !visible; stage.classList.toggle('love-motion-paused', inactive || motionPaused); if (inactive) { stopMusic(); paper.querySelectorAll<HTMLVideoElement>('video').forEach(v=>v.pause()); } };
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
  const dispose = (() => { disposed = true; clearTimeout(openingTimer); pageAnimation?.cancel(); observer.disconnect(); resize.disconnect(); paper.removeEventListener('pointerdown',onPointerDown);paper.removeEventListener('pointerup',onPointerUp);paper.removeEventListener('pointercancel',onPointerCancel);root.removeEventListener('keydown', onKey); stopMusic(); if (audio) { audio.removeAttribute('src'); audio.load(); } paper.querySelectorAll<HTMLVideoElement>('video').forEach(v=>v.pause()); document.removeEventListener('visibilitychange', updateMotion); root.innerHTML = ''; }) as LoveExperience;
  const visualKey = (content: LoveContent) => JSON.stringify([content.theme, content.palette, content.opening, content.flower, content.details, content.intensity, content.textStyle, content.transition, content.photoStyle, content.musicMode, content.songUrl, content.assets, content.bookStyle]);
  dispose.update = (content, nextAssets) => {
    content = {...defaultLoveContent(), ...content};
    if (disposed || visualKey(content) !== visualKey(c)) return false;
    c = content; assets = nextAssets; screens = buildScreens(); index = Math.min(index, screens.length - 1);
    intro.querySelector('h2')!.textContent = c.recipient ? 'Para ' + c.recipient + '.' : 'Para alguien muy especial.';
    intro.querySelectorAll('p')[1].textContent = c.subtitle;
    root.querySelector('.love-envelope-paper')!.textContent = c.recipient;
    if(book)root.querySelector('.book-cover')!.outerHTML=bookCover(c,assets);
    if (!panel.hidden) render(false, false);
    return true;
  };
  return dispose;
}
