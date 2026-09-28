import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { DB } from '../dist/server/db.js';
import { readConfig } from '../dist/server/config.js';
import { saveProduct } from '../dist/server/catalog.js';
export function seedSeptember(db) {
const categories = [['septiembre-flores', 'Flores azules'], ['septiembre-carritos', 'Carritos para regalar'], ['septiembre-combos', 'Flores y carritos']];
for (const [id, name] of categories) db.run('INSERT OR IGNORE INTO categories VALUES (?,?,?,1)', id, id, name);
const ideas = [
  ['ramo-azul-infinito', 'Ramo Azul Infinito', 'Flores azules para decirlo sin palabras.', 'Un ramo protagonista en tonos azules, envoltura cuidada y una dedicatoria que lo hace tuyo. Cuéntanos el tamaño y el estilo que imaginas; confirmaremos el tipo de flores y su disponibilidad contigo.', 'septiembre-flores', 'septiembre-ramo', ['Clásico', 'Romántico', 'Abundante']],
  ['mini-ramo-cielo', 'Mini ramo Cielo', 'Pequeño en tamaño. Enorme en intención.', 'Una propuesta delicada de flores azules y detalles blancos, con una tarjeta personal. Ideal si buscas un gesto sencillo. El tamaño y la composición final se acuerdan por WhatsApp.', 'septiembre-flores', 'septiembre-mini', ['Minimalista', 'Con tarjeta', 'Con lazo']],
  ['ramo-a-toda-velocidad', 'Ramo A toda velocidad', 'Su pasión por los carritos, hecha sorpresa.', 'Un ramo de carritos a escala con envoltura azul y mensaje personalizado. Puedes indicar los modelos que le gustan; marcas, cantidad y modelos están sujetos a confirmación.', 'septiembre-carritos', 'septiembre-carritos', ['Ramo de carritos', 'Con flores azules', 'Con dedicatoria']],
  ['tu-carrito-favorito', 'Tu carrito favorito', 'Ese detalle que conecta con su niño interior.', 'Un carrito a escala presentado para regalo, con lazo azul y tu dedicatoria. Dinos su color o modelo favorito. Te mostraremos las opciones disponibles antes de confirmar.', 'septiembre-carritos', 'septiembre-carrito', ['Presentación sencilla', 'En cajita', 'Con tarjeta']],
  ['box-ruta-azul', 'Box Ruta Azul', 'Flores y carritos en una misma historia.', 'Una caja que reúne flores azules, un carrito a escala y una dedicatoria personal. Podemos explorar complementos según tu presupuesto. La composición y el precio se confirman contigo.', 'septiembre-combos', 'septiembre-box', ['Caja con flores', 'Caja con dedicatoria', 'Con complemento a coordinar']],
  ['duo-flores-y-motor', 'Dúo Flores & Motor', 'Un ramo para emocionar. Un carrito para recordar.', 'Combina un ramo de flores azules con un carrito a escala presentado por separado. Elige el estilo y cuéntanos qué le gusta a esa persona para armar una propuesta a su medida.', 'septiembre-combos', 'septiembre-duo', ['Azul y blanco', 'Azul intenso', 'Sorpresa personalizada']]
];
let count = 0;
for (const [slug, name, summary, description, categoryId, image, styles] of ideas) {
  if (db.get('SELECT id FROM products WHERE slug=?', slug)) continue;
  saveProduct(db, { slug, name, summary, description, categoryId, price: 0, promo: null, stock: 0, memoryPrice: 0, inquiryOnly: true, active: true, featured: true, customizable: true, options: { styles, colors: ['Azul rey', 'Celeste', 'Azul y blanco'], occasions: ['30 de septiembre', 'Porque sí', 'Aniversario'] }, images: [{ url: `/assets/web/${image}.webp`, alt: `Propuesta referencial: ${name}` }], variants: [] }, slug);
  count++;
}
return count;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const db = new DB(readConfig().DB_PATH); const count = seedSeptember(db); db.close();
 process.stdout.write(`${count} propuestas añadidas; precios y stock pendientes de confirmación. No se sobrescribieron productos existentes.\n`);
}
