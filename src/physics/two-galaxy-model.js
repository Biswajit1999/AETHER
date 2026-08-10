export const TWO_GALAXY_UNITS = Object.freeze({
  lengthKpc: 100,
  massSolar: 1e12,
  timeGyr: 0.471
});

export function centreSeparation(a, b) {
  return Math.hypot(
    b.position[0] - a.position[0],
    b.position[1] - a.position[1],
    b.position[2] - a.position[2]
  );
}

export function computeCentreAccelerations(centres, options = {}) {
  const [a, b] = centres;
  const totalMass = a.mass + b.mass;
  const softening = options.softening ?? 0.18;
  const dragFloor = options.dragFloor ?? 0.004;
  const dragPeak = options.dragPeak ?? 0.052;
  const dragScale = options.dragScale ?? 0.75;
  const dx = b.position[0] - a.position[0];
  const dy = b.position[1] - a.position[1];
  const dz = b.position[2] - a.position[2];
  const r2 = dx * dx + dy * dy + dz * dz + softening * softening;
  const invR3 = 1 / Math.pow(r2, 1.5);
  const accA = [b.mass * dx * invR3, b.mass * dy * invR3, b.mass * dz * invR3];
  const accB = [-a.mass * dx * invR3, -a.mass * dy * invR3, -a.mass * dz * invR3];
  const dragRate = dragFloor + dragPeak * Math.exp(-Math.sqrt(r2) / dragScale);

  for (let axis = 0; axis < 3; axis += 1) {
    const relativeVelocity = b.velocity[axis] - a.velocity[axis];
    accA[axis] += dragRate * relativeVelocity * b.mass / totalMass;
    accB[axis] -= dragRate * relativeVelocity * a.mass / totalMass;
  }

  return [accA, accB];
}

export function integrateCentres(centres, dt, options) {
  const accelerations = computeCentreAccelerations(centres, options);
  centres.forEach((centre, index) => {
    for (let axis = 0; axis < 3; axis += 1) {
      centre.velocity[axis] += accelerations[index][axis] * dt;
      centre.position[axis] += centre.velocity[axis] * dt;
    }
  });
}
