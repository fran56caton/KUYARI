import { randomUUID } from 'node:crypto';
import { readConfig } from '../dist/server/config.js';
import { DB } from '../dist/server/db.js';
import { saveProduct, saveZone } from '../dist/server/catalog.js';
import { hashPassword } from '../dist/server/security.js';
import { PRODUCTS } from '../src/catalog.mjs';
const config = readConfig(), db = new DB(config.DB_PATH), command = process.argv[2];
const policies = [
  ['privacidad', 'Política de privacidad', 'Define la identidad y contacto del responsable, los datos necesarios para compra y entrega, los proveedores que reciben información, los plazos de conservación y el canal para ejercer derechos. Los recuerdos deben explicar claramente el acceso por enlace, PIN o cuenta y cómo solicitar su eliminación.'],
  ['terminos', 'Términos y condiciones', 'Describe el proceso de compra, moneda, confirmación del pago, alcance de las personalizaciones, disponibilidad, atención al cliente y resolución de incidencias. Confirma los datos de la empresa y revisa el texto con asesoría local antes de publicarlo.'],
  ['cambios', 'Cambios y cancelaciones', 'Define plazos para solicitar cambios y cancelaciones, condiciones de productos personalizados, tratamiento de incidencias y procedimiento de devolución del dinero mediante el proveedor de pago. Evita promesas no confirmadas por la operación.'],
  ['entregas', 'Política de entregas', 'Publica zonas y horarios atendidos, tiempos de preparación, tarifas, coordinación con destinatarios, regalos anónimos, ausencias, direcciones incorrectas y canales de contacto ante retrasos. Confirma estos datos con el equipo operativo.'],
  ['datos', 'Tratamiento de datos', 'Explica las finalidades de los datos de compradores y destinatarios y de las fotografías, videos y dedicatorias. Distingue lo necesario para cumplir el pedido de cualquier uso opcional. Establece conservación, eliminación y contacto para solicitudes.']
];
for (const [slug, title, body] of policies) db.run('INSERT OR IGNORE INTO policies VALUES (?,?,?,0,?)', slug, title, `BORRADOR PARA REVISIÓN.\n\n${body}`, new Date().toISOString());
if (command === 'seed') {
  if (config.NODE_ENV === 'production' || config.PAYMENT_MODE === 'production' || config.STORE_LIVE === 'true') throw new Error('El seed demo está prohibido en producción');
  for (const [id, name] of [['flores', 'Flores'], ['cajas', 'Cajas'], ['recuerdos', 'Recuerdos']]) db.run('INSERT OR IGNORE INTO categories VALUES (?,?,?,1)', id, id, name);
  for (const p of PRODUCTS) if (!db.get('SELECT id FROM products WHERE id=?', p.id)) saveProduct(db, { slug: p.id, name: p.name, summary: p.description, description: `${p.description} Selecciona los detalles y escribe una dedicatoria en KUYARI Studio. Producto de desarrollo: confirma composición, precio e inventario antes de vender.`, price: Math.round(p.price * 100), promo: null, stock: 12, categoryId: p.category, active: true, featured: true, customizable: true, memoryPrice: 1000, options: { styles: ['Clásico', 'Romántico', 'Natural'], colors: ['Ciruela', 'Coral', 'Marfil'], occasions: ['Cumpleaños', 'Gracias', 'Porque sí', 'Aniversario'] }, images: [{ url: `/${p.image}`, alt: p.alt }], variants: [] }, p.id, true);
  if (!db.get('SELECT id FROM delivery_zones LIMIT 1')) saveZone(db, { district: 'Huánuco (desarrollo)', province: 'Huánuco', department: 'Huánuco', fee: 1000, minDays: 1, slots: ['09:00–12:00', '12:00–15:00', '15:00–18:00'], active: true }, 'huanuco-demo');
  process.stdout.write('Datos de desarrollo creados sin sobrescribir registros existentes.\n');
} else if (command === 'admin') {
  const email = config.ADMIN_EMAIL.trim().toLowerCase(), password = config.ADMIN_PASSWORD;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16 || password.length > 128) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD (16 a 128 caracteres) en el entorno');
  if (db.get('SELECT id FROM users WHERE email=?', email)) throw new Error('La cuenta ya existe; usa la administración de accesos. No se sobrescribió su contraseña');
  const id = randomUUID(); db.run('INSERT INTO users (id,email,password_hash,name,role,created_at) VALUES (?,?,?,?,?,?)', id, email, await hashPassword(password), 'Administración KUYARI', 'admin', new Date().toISOString()); db.audit(id, 'admin.created', id);
  process.stdout.write('Cuenta administrativa creada. Retira ADMIN_PASSWORD del entorno tras usarla.\n');
} else if (command === 'migrate') process.stdout.write('Migraciones aplicadas y políticas inicializadas sin borrar datos.\n');
else throw new Error('Comando válido: migrate, seed o admin');
db.close();
