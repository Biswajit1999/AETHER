import test from 'node:test';
import assert from 'node:assert/strict';
import { convergenceRatio, createValidationSummary, relativeDrift, totalMomentum } from '../src/science/numerical-diagnostics.js';

test('relative drift is scale aware', () => {
  assert.ok(Math.abs(relativeDrift(10, 10.01) - 0.001) < 1e-14);
});

test('total momentum handles arbitrary vector dimensions', () => {
  assert.deepEqual(totalMomentum([
    { mass: 2, velocity: [1, -1, 0] },
    { mass: 1, velocity: [-2, 2, 0] }
  ]), [0, 0, 0]);
});

test('convergence and invariant checks produce a release verdict', () => {
  const ratio = convergenceRatio([1.04, 2], [1.01, 2], [1.0025, 2]);
  const result = createValidationSummary({
    invariants: { momentum: 2e-10 },
    tolerances: { momentum: 1e-9 },
    convergence: { ratio, minimumRatio: 3 }
  });
  assert.ok(ratio > 3.9 && ratio < 4.1);
  assert.equal(result.pass, true);
});
