import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { maintenanceEnabled, maintenanceResponse } from '../dist/server/maintenance.js';

test('reopened pages and static entrypoints pass through without a maintenance response', () => {
  assert.equal(maintenanceEnabled, false);
  for (const path of ['/', '/index.html', '/regalos', '/crear-qr', '/admin', '/sorpresa/example', '/src/app.js', '/assets/world/jardin-m.mp4']) {
    assert.equal(maintenanceResponse(path), undefined, path);
  }
});

test('reopened APIs and mutations reach the normal authentication and commerce handlers', () => {
  for (const [method, path] of [['POST', '/api/orders'], ['POST', '/api/admin/products'], ['PUT', '/api/admin/yape'], ['GET', '/api/products'], ['GET', '/api/session']]) {
    assert.equal(maintenanceResponse(path, method), undefined);
  }
  assert.equal(maintenanceResponse('/', 'HEAD'), undefined);
});

test('reopened hosting restores normal static serving and the application fallback', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.routes, undefined);
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/api/index' }]);
  const adapter = readFileSync('api/index.ts', 'utf8');
  assert.ok(adapter.indexOf('const closure = maintenanceResponse') < adapter.indexOf('for await(const chunk of req)'));
});
