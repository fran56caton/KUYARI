import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { maintenanceEnabled, maintenanceResponse } from '../dist/server/maintenance.js';

test('temporary closure blocks every page including static entrypoints without loading the shop', async () => {
  assert.equal(maintenanceEnabled, true);
  for (const path of ['/', '/index.html', '/regalos', '/crear-qr', '/admin', '/sorpresa/example', '/src/app.js', '/assets/world/jardin-m.mp4']) {
    const response = maintenanceResponse(path);
    assert.equal(response.status, 503, path);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    const body = await response.text();
    assert.match(body, /pausa temporal/);
    assert.doesNotMatch(body, /<script|<form|<video|href=/);
  }
});

test('existing sessions cannot submit orders, upload products or access APIs while closed', async () => {
  for (const [method, path] of [['POST', '/api/orders'], ['POST', '/api/admin/products'], ['PUT', '/api/admin/yape'], ['GET', '/api/products'], ['GET', '/api/session']]) {
    const response = maintenanceResponse(path, method);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal((await response.json()).code, 'MAINTENANCE');
  }
  const head = maintenanceResponse('/', 'HEAD');
  assert.equal(head.status, 503);
  assert.equal(await head.text(), '');
});

test('hosting routes the homepage and all files through the closure before filesystem serving', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.rewrites, undefined);
  assert.deepEqual(config.routes, [{ src: '/(.*)', dest: '/api/index' }]);
  const adapter = readFileSync('api/index.ts', 'utf8');
  assert.ok(adapter.indexOf('const closure = maintenanceResponse') < adapter.indexOf('for await(const chunk of req)'));
});
