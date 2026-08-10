import test from 'node:test';
import assert from 'node:assert/strict';
import {
  centreSeparation,
  computeCentreAccelerations,
  integrateCentres
} from '../src/physics/two-galaxy-model.js';

function createCentres() {
  return [
    { mass: 1.1, position: new Float64Array([-1.988, -0.1792, -0.1456]), velocity: new Float64Array([0.2744, -0.1792, 0.014]) },
    { mass: 1.4, position: new Float64Array([1.562, 0.1408, 0.1144]), velocity: new Float64Array([-0.2156, 0.1408, -0.011]) }
  ];
}

test('two-galaxy force and drag conserve total momentum', () => {
  const centres = createCentres();
  const acceleration = computeCentreAccelerations(centres);
  for (let axis = 0; axis < 3; axis += 1) {
    const netForce = centres[0].mass * acceleration[0][axis] + centres[1].mass * acceleration[1][axis];
    assert.ok(Math.abs(netForce) < 1e-12, `axis ${axis} net force was ${netForce}`);
  }
});

test('merger-compatible initial condition approaches under mutual gravity', () => {
  const centres = createCentres();
  const initialDistance = centreSeparation(centres[0], centres[1]);
  for (let step = 0; step < 250; step += 1) integrateCentres(centres, 0.004);
  assert.ok(centreSeparation(centres[0], centres[1]) < initialDistance);
});
