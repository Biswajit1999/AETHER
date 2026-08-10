// The contract every animation module must satisfy.
//
// export function createAnimation(runtime) {
//   return {
//     update({ time, delta, audio }),
//     resize({ width, height, pixelRatio }),
//     render(),
//     dispose()
//   };
// }

export function assertImplementsContract(animation) {
  const required = ['update', 'resize', 'render', 'dispose'];
  for (const key of required) {
    if (typeof animation[key] !== 'function') {
      throw new Error(`Animation is missing required method: ${key}()`);
    }
  }
  return animation;
}
