import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerformanceGovernor } from '../src/runtime/quality.js';

function feed(governor, delta, count) {
  let state;
  for (let index = 0; index < count; index += 1) state = governor.sample(delta);
  return state;
}

test('manual quality profiles cap device pixel ratio', () => {
  const governor = createPerformanceGovernor({ mode: 'studio', devicePixelRatio: 3 });
  assert.equal(governor.snapshot().pixelRatio, 2);
  assert.equal(governor.setMode('eco').pixelRatio, 1);
});

test('auto quality degrades only after sustained slow windows', () => {
  const governor = createPerformanceGovernor({ devicePixelRatio: 2, windowSize: 20, evaluationInterval: 10 });
  assert.equal(governor.snapshot().profileName, 'balanced');
  feed(governor, 35, 29);
  assert.equal(governor.snapshot().profileName, 'balanced');
  assert.equal(feed(governor, 35, 1).profileName, 'eco');
});

test('auto quality promotes only after sustained fast windows', () => {
  const governor = createPerformanceGovernor({ devicePixelRatio: 2, windowSize: 20, evaluationInterval: 10 });
  assert.equal(feed(governor, 12, 49).profileName, 'balanced');
  assert.equal(feed(governor, 12, 1).profileName, 'studio');
});
