export function addScaled(state, derivative, factor = 1) {
  return state.map((value, index) => value + derivative[index] * factor);
}

export function rk4Step(state, time, step, derivative) {
  const k1 = derivative(state, time);
  const k2 = derivative(addScaled(state, k1, step / 2), time + step / 2);
  const k3 = derivative(addScaled(state, k2, step / 2), time + step / 2);
  const k4 = derivative(addScaled(state, k3, step), time + step);
  return state.map((value, index) => value + step * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]) / 6);
}
