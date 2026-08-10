import test from 'node:test';
import assert from 'node:assert/strict';
import { equationStudies } from '../src/animations/shared/equation-catalog.js';
import { rk4Step } from '../src/math/rk4.js';

test('all equation studies remain finite and produce three-dimensional variation', () => {
  assert.equal(Object.keys(equationStudies).length, 10);
  for (const [id, config] of Object.entries(equationStudies)) {
    let state = [...config.initial], time = 0;
    const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < 6000; i += 1) {
      state = config.kind === 'map' ? config.iterate(state) : rk4Step(state, time, config.dt, config.derivative);
      time += config.dt;
      assert.ok(state.every(Number.isFinite), `${id} diverged at step ${i}`);
      if (i > 500) {
        const point = (config.project ? config.project(state) : state).slice(0, 3);
        point.forEach((value, axis) => { minimum[axis] = Math.min(minimum[axis], value); maximum[axis] = Math.max(maximum[axis], value); });
      }
    }
    const movingAxes = maximum.filter((value, axis) => value - minimum[axis] > 1e-5).length;
    assert.ok(movingAxes >= 2, `${id} did not form a meaningful trajectory`);
    assert.ok(config.equation.length > 10, `${id} has no displayed equation`);
  }
});
