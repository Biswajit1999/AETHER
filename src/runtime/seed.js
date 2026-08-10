// Deterministic pseudo-random number generator (xorshift32) seeded from a string.
// Never use Math.random() for canonical animation content.

export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makePRNG(seedText) {
  let x = hashSeed(seedText) || 1;
  return function random() {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
