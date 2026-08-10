// Iterative radix-2 Cooley-Tukey FFT. `real`/`imag` are mutated in place and
// must have a power-of-two length.

export function fft(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angleStep = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < halfLen; k++) {
        const angle = angleStep * k;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const ur = real[i + k];
        const ui = imag[i + k];
        const vr = real[i + k + halfLen] * wr - imag[i + k + halfLen] * wi;
        const vi = real[i + k + halfLen] * wi + imag[i + k + halfLen] * wr;
        real[i + k] = ur + vr;
        imag[i + k] = ui + vi;
        real[i + k + halfLen] = ur - vr;
        imag[i + k + halfLen] = ui - vi;
      }
    }
  }
}

export function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
