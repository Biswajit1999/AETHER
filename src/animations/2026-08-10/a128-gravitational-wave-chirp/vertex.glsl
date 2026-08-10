precision highp float;
attribute float aRingPhase;
attribute float aAnglePhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vRing;
void main() {
  // Simplified quadrupole chirp: instantaneous frequency rises as
  // f(t) ~ (tc - t)^(-3/8) approaching merger time tc, the real leading-order
  // scaling law for an inspiralling compact binary's gravitational-wave
  // frequency (post-Newtonian quadrupole approximation).
  float tc = 9.0 + uBass * 2.0;
  float tt = min(uTime * (0.5 + uMid * 0.5) * uMotion, tc - 0.15);
  float freq = pow(max(0.05, tc - tt), -0.375) * 0.5;
  float phase = aRingPhase - freq * uTime * 0.6;
  float wobble = sin(phase * 6.0) * 0.08;

  vec3 p = position * (1.0 + wobble);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.6, (1.0 + uHigh * 2.0) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vRing = aRingPhase;
}
