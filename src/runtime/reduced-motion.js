export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function prefersCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches;
}
