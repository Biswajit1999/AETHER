function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
  return number;
}

export function vectorMagnitude(vector) {
  return Math.hypot(...vector.map((value) => finiteNumber(value, 'vector component')));
}

export function relativeDrift(initialValue, finalValue, scaleFloor = 1e-12) {
  const initial = finiteNumber(initialValue, 'initial value');
  const final = finiteNumber(finalValue, 'final value');
  return Math.abs(final - initial) / Math.max(Math.abs(initial), Math.abs(scaleFloor));
}

export function totalMomentum(bodies) {
  if (!Array.isArray(bodies) || !bodies.length) throw new TypeError('bodies must be a non-empty array');
  const dimensions = bodies[0].velocity.length;
  const result = new Array(dimensions).fill(0);
  for (const body of bodies) {
    const mass = finiteNumber(body.mass, 'mass');
    if (body.velocity.length !== dimensions) throw new RangeError('all velocity vectors must have the same dimensions');
    for (let axis = 0; axis < dimensions; axis += 1) result[axis] += mass * finiteNumber(body.velocity[axis], 'velocity');
  }
  return result;
}

export function convergenceRatio(coarse, medium, fine) {
  if (coarse.length !== medium.length || medium.length !== fine.length) throw new RangeError('solution vectors must have equal lengths');
  const coarseError = vectorMagnitude(coarse.map((value, index) => value - medium[index]));
  const fineError = vectorMagnitude(medium.map((value, index) => value - fine[index]));
  return fineError > 0 ? coarseError / fineError : Number.POSITIVE_INFINITY;
}

export function createValidationSummary({ invariants = {}, convergence = null, tolerances = {} }) {
  const checks = Object.entries(invariants).map(([name, drift]) => {
    const tolerance = Number(tolerances[name] ?? 1e-6);
    return { name, drift: Number(drift), tolerance, pass: Number(drift) <= tolerance };
  });
  if (convergence) {
    const minimumRatio = Number(convergence.minimumRatio ?? 1.5);
    checks.push({ name: 'step refinement', ratio: Number(convergence.ratio), minimumRatio, pass: Number(convergence.ratio) >= minimumRatio });
  }
  return Object.freeze({ pass: checks.every((check) => check.pass), checks: Object.freeze(checks) });
}
