import test from 'node:test';
import assert from 'node:assert/strict';
import { studies } from '../src/animations/shared/study-catalog.js';
import { sampleTopology } from '../src/animations/shared/study-engine.js';

function deterministicRandom() {
  let state = 0x1a2b3c4d;
  return () => ((state = Math.imul(state ^ state >>> 15, 1 | state) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
}

test('every shared study topology produces finite non-degenerate points', () => {
  assert.equal(Object.keys(studies).length, 34);
  for (const [id, config] of Object.entries(studies)) {
    const random = deterministicRandom();
    const points = Array.from({ length: 1200 }, (_, index) => sampleTopology(config.topology, random, index, 1200));
    assert.ok(points.flat().every(Number.isFinite), `${id} produced a non-finite point`);
    for (let axis = 0; axis < 3; axis += 1) {
      const values = points.map((point) => point[axis]);
      assert.ok(Math.max(...values) - Math.min(...values) > 1e-4, `${id} collapsed on axis ${axis}`);
    }
  }
});

test('logarithmic shell radius grows exponentially with angle', () => {
  const random = () => .5;
  const count = 1000;
  const radiusAt = (index) => {
    const [x,,z] = sampleTopology('shell', random, index, count);
    return Math.hypot(x, z);
  };
  const r1 = radiusAt(200), r2 = radiusAt(500), r3 = radiusAt(800);
  assert.ok(r1 < r2 && r2 < r3);
  assert.ok(Math.abs((r2 / r1) - (r3 / r2)) < .03, 'equal angular intervals should have near-equal radius ratios');
});
