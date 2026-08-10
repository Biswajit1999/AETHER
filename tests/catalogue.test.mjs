import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('published catalogue contains at least 40 ordered unique studies', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.count >= 40);
  assert.equal(manifest.animations.length, manifest.count);
  const orders = manifest.animations.map(({ order }) => order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.equal(new Set(orders).size, manifest.count);
  assert.equal(new Set(manifest.animations.map(({ slug }) => slug)).size, manifest.count);
  assert.equal(new Set(manifest.animations.map(({ seed }) => seed)).size, manifest.count);
});
