precision highp float;
attribute float aDepthPhase;
attribute float aPulsePhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vDepth;
varying float vPulse;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float pulse = fract(aPulsePhase - uTime * (0.15 + uMid * 0.5) * uMotion);
  float glow = 1.0 - smoothstep(0.0, 0.1, abs(pulse - 0.5));
  gl_PointSize = max(0.7, (1.0 + glow * 4.0 + uHigh * 1.5) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vDepth = aDepthPhase;
  vPulse = glow;
}
