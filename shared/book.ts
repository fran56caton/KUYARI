import type { LoveContent } from './romance.js';
export const bookThemes = ['boyfriend-book','love-magazine','keepsake-book'];
export const isLoveBook = (c: Pick<LoveContent,'theme'|'opening'>) => c.opening === 'book' || bookThemes.includes(c.theme);
export const bookStyles = [{id:'editorial',name:'Revista de amor'}, {id:'classic',name:'Libro de colección'}, {id:'romantic',name:'Álbum romántico'}] as const;
export type RomanticTone = 'tender'|'passionate'|'playful';
export function romanticBookIdea(tone: RomanticTone, recipient = '', trait = '', memory = '') {
  const name = recipient.trim() ? `, ${recipient.trim()}` : '';
  const admired = trait.trim() ? `Hay algo tuyo que me enamora: ${trait.trim()}.` : 'Me enamora esa forma tan tuya de hacer que los días tengan algo especial.';
  const remembered = memory.trim() ? `Quiero guardar aquí este recuerdo: ${memory.trim()}. Cada vez que vuelva a estas páginas, quiero volver también a lo que sentí contigo.` : 'Quiero que estas páginas se llenen de pequeños momentos nuestros, de esos que no necesitan ser perfectos para quedarse para siempre.';
  const choices = {
    tender:{title:'Mi lugar bonito eres tú.',first:`Qué bonito coincidir contigo${name}. Este libro es mi manera de detener el mundo un ratito y recordarte lo importante que eres para mí.`,last:'No necesito palabras perfectas. Me basta con que sepas esto: te quiero, te admiro y me hace feliz elegirte.',closing:'Contigo, hasta en los días más sencillos.'},
    passionate:{title:'Te elegiría en cada capítulo.',first:`Si mi corazón escribiera un libro${name}, tú aparecerías en todas sus páginas. En lo que sueño, en lo que deseo y en esa manera de sonreír cuando pienso en nosotros.`,last:'Quiero seguir conociéndote, cuidándonos y escribiendo una historia que se parezca a nosotros. Te elijo con todo lo que soy.',closing:'Una y mil veces, mi elección eres tú.'},
    playful:{title:'Mi coincidencia favorita.',first:`Entre tantas personas, apareciste tú${name}. Y ahora tengo una excusa perfecta para hacerte protagonista de una revista: mi novio favorito merece su propia portada.`,last:'Advertencia: este libro contiene cariño en exceso, ganas de verte y planes pendientes contigo. Y sí, volvería a elegir al mismo protagonista.',closing:'Mi plan favorito siempre tiene algo de ti.'}
  };
  const idea=choices[tone] ?? choices.tender;
  return {...idea,message:[idea.first,admired,remembered,idea.last].join('\n\n'),subtitle:'Edición única · Para mi persona favorita.',quote:'De todas las historias, la nuestra.',reasons:[trait.trim()?`Por ${trait.trim()}.`:'Por tu forma única de ser.','Por lo que siento cuando pienso en nosotros.','Por los pequeños detalles que compartimos.','Por cada conversación que nos acerca.','Por las ganas de seguir construyendo juntos.','Porque volvería a elegirte.'],messages:['Hoy quería recordarte algo: me importas muchísimo.','Qué bonito tener una historia que sea nuestra.','Tengo muchas ganas de seguir escribiéndola contigo.'],chapters:[{title:'Lo que admiro de ti',text:admired},{title:memory.trim()?'Un recuerdo nuestro':'Los momentos que quiero guardar',text:remembered},{title:'Nuestro siguiente capítulo',text:'Quiero hacer espacio para nuevos planes, conversaciones sin prisa y recuerdos que todavía no existen. Quiero que cuidemos lo que sentimos, cada uno siendo quien es.'}]};
}
