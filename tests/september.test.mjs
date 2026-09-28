import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { seedSeptember } from '../scripts/seed-september.mjs';
import { products, saveProduct } from '../dist/server/catalog.js';
import { quote } from '../dist/server/commerce.js';

test('colección: seis propuestas sin importes ficticios, sembrado idempotente y catálogo anterior intacto', t => {
  const f = fixture(); t.after(() => f.db.close());
  assert.equal(seedSeptember(f.db), 6); assert.equal(seedSeptember(f.db), 0);
  const list = products(f.db), ideas = list.filter(p => p.options.occasions.includes('30 de septiembre'));
  assert.equal(ideas.length, 6); assert.equal(list.find(p => p.id === 'rosas').price, 9000);
  for (const idea of ideas) { assert.equal(idea.inquiryOnly, true); assert.equal(idea.price, 0); assert.equal(idea.stock, 0); assert.equal(idea.promo, null); }
  f.db.run("UPDATE products SET name='Nombre editado por la dueña' WHERE id='box-ruta-azul'");
  seedSeptember(f.db); assert.equal(products(f.db).find(p => p.id === 'box-ruta-azul').name, 'Nombre editado por la dueña');
});

test('una propuesta no puede cobrarse ni reservar stock; publicar exige un precio real', t => {
  const f = fixture(); t.after(() => f.db.close()); seedSeptember(f.db);
  f.input.items[0].productId = 'box-ruta-azul';
  f.db.run("UPDATE products SET stock=99 WHERE id='box-ruta-azul'");
  assert.throws(() => quote(f.db, f.input, f.config), /confirmar precio/);
  const p = products(f.db).find(p => p.id === 'box-ruta-azul');
  const input = { ...p, active: true, featured: true, customizable: true, inquiryOnly: false, price: 0, stock: 4 };
  assert.throws(() => saveProduct(f.db, input, p.id), /precio/);
  saveProduct(f.db, { ...input, price: 12900 }, p.id);
  assert.equal(quote(f.db, f.input, f.config).total, 13900);
});
