import type { Product } from '../shared/models.js';
import { esc, onPageLeave } from './ui.js';
import { mountGardenWorld } from './garden-world.js';

/** Real catalogue imagery stays editable through the existing administrator. */
export function enhanceHome(products: Product[]) {
  const world = document.querySelector<HTMLElement>('#jardin-vivo');
  const cleanupWorld = world ? mountGardenWorld(world) : undefined;
  const photographed = products.filter(p => p.images[0]?.url);
  const floral = photographed.find(p => /rosa pastel/i.test(p.name)) ?? photographed.find(p => /ramo|flor/i.test(p.name));
  const hero = document.querySelector<HTMLImageElement>('[data-home-hero]');
  const heroLink = document.querySelector<HTMLAnchorElement>('[data-home-hero-link]');
  const caption = document.querySelector<HTMLElement>('[data-home-caption]');
  if (floral && hero && heroLink && caption) {
    hero.src = floral.images[0]!.url;
    hero.alt = floral.images[0]!.alt || floral.name;
    heroLink.href = `/regalos/${encodeURIComponent(floral.slug)}`;
    caption.innerHTML = `<span>De nuestra colección</span><strong>${esc(floral.name)}</strong><span>Ver y personalizar ↗</span>`;
  }
  if (floral) document.querySelectorAll<HTMLImageElement>('[data-home-photo="0"]').forEach(image => { image.src = floral.images[0]!.url; image.alt = floral.images[0]!.alt || floral.name; });

  const steps = document.querySelectorAll<HTMLElement>('[data-story-step]');
  const scene = document.querySelector<HTMLElement>('[data-story-scene]');
  if (!steps.length || !scene || !('IntersectionObserver' in window)) { onPageLeave(() => cleanupWorld?.()); return; }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const current = (entry.target as HTMLElement).dataset.storyStep;
      scene.dataset.current = current;
      steps.forEach(step => step.classList.toggle('is-current', step.dataset.storyStep === current));
    }
  }, { rootMargin: '-20% 0px -35% 0px', threshold: 0 });
  steps.forEach(step => observer.observe(step));
  onPageLeave(() => { observer.disconnect(); cleanupWorld?.(); });
}
