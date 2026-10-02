export const loveThemes = [
  { id: 'roses', name: 'Jardín de rosas', line: 'Pétalos, una carta y todo lo que sientes.', symbol: '✿' },
  { id: 'castle', name: 'Nuestro castillo', line: 'Una historia de cuento escrita para ustedes.', symbol: '♜' },
  { id: 'stars', name: 'Bajo las estrellas', line: 'Tu persona favorita, tu constelación.', symbol: '✧' },
  { id: 'blue', name: 'Un cielo de flores', line: 'Flores azules, luz suave y promesas.', symbol: '❋' },
  { id: 'cherry', name: 'Primavera contigo', line: 'Cerezos, mariposas y un nuevo comienzo.', symbol: '❀' },
  { id: 'moon', name: 'La luna sabe', line: 'Para quererse incluso a la distancia.', symbol: '☾' },
  { id: 'lavender', name: 'Siempre en calma', line: 'Lavanda, ternura y pequeños recuerdos.', symbol: '❦' },
  { id: 'birthday', name: 'Celebro tu vida', line: 'Velas, confeti dorado y buenos deseos.', symbol: '✺' },
  { id: 'ocean', name: 'Hasta el infinito', line: 'Un mar tranquilo, un amor inmenso.', symbol: '≈' },
  { id: 'enchanted', name: 'Bosque encantado', line: 'Luces diminutas, flores y magia.', symbol: '♧' },
  { id: 'royal', name: 'Un amor de leyenda', line: 'Un palacio entre rosas y oro.', symbol: '♛' },
  { id: 'letters', name: 'Cartas que se quedan', line: 'Papel, tinta y palabras que abrazan.', symbol: '♡' }
] as const;
export const lovePalettes = [
  { id: 'rose', name: 'Rosa antiguo' }, { id: 'wine', name: 'Vino y oro' },
  { id: 'sky', name: 'Azul cielo' }, { id: 'lilac', name: 'Lavanda' }, { id: 'ivory', name: 'Marfil y oro' }
] as const;
export const loveOccasions = ['Porque te amo', 'Aniversario', 'Cumpleaños', 'San Valentín', 'Gracias', 'Una disculpa', 'Amor a distancia', '¿Te casas conmigo?', 'Para mamá', 'Amistad', 'Un logro especial', 'Porque sí'];
export const loveDetails = [
  { id: 'petals', name: 'Lluvia de pétalos' }, { id: 'hearts', name: 'Corazones flotantes' },
  { id: 'stars', name: 'Destellos dorados' }, { id: 'butterflies', name: 'Mariposas' },
  { id: 'fireflies', name: 'Luciérnagas' }, { id: 'ribbons', name: 'Lazos de seda' },
  { id: 'pearls', name: 'Perlas y joyas' }, { id: 'confetti', name: 'Confeti de celebración' },
  { id: 'vines', name: 'Enredaderas florales' }, { id: 'moon', name: 'Luna luminosa' },
  { id: 'sparkle', name: 'Brillo al abrir' }, { id: 'bouquet', name: 'Ramo ilustrado' }
] as const;
export interface LoveContent {
  theme: typeof loveThemes[number]['id']; palette: typeof lovePalettes[number]['id']; occasion: string;
  opening: 'envelope' | 'heart' | 'gates' | 'book'; flower: 'roses' | 'daisies' | 'blue' | 'peonies';
  recipient: string; sender: string; title: string; subtitle: string; message: string; closing: string; specialDate: string;
  details: string[]; intensity: 'gentle' | 'full'; textStyle: 'serif' | 'handwritten';
  chapters: { title: string; text: string }[]; promises: string[];
  songUrl: string; videoUrl: string; assets: string[]; giftId: string; giftNote: string;
}
export interface LoveRecord { token: string; content: LoveContent; privacy: 'link' | 'pin'; active: boolean; owner: boolean; assets: { id: string; mime: string }[]; createdAt: string; gift: { id: string; name: string; image: string } | null }
export function defaultLoveContent(): LoveContent {
  return { theme: 'roses', palette: 'rose', occasion: 'Porque te amo', opening: 'envelope', flower: 'roses',
    recipient: '', sender: '', title: 'Hay un mundo bonito contigo.', subtitle: 'Una pequeña sorpresa, hecha solo para ti.',
    message: '', closing: 'Con todo mi cariño, hoy y siempre.', specialDate: '', details: ['petals', 'hearts', 'stars', 'vines', 'sparkle', 'bouquet'],
    intensity: 'full', textStyle: 'serif', chapters: [], promises: [], songUrl: '', videoUrl: '', assets: [], giftId: '', giftNote: '' };
}
