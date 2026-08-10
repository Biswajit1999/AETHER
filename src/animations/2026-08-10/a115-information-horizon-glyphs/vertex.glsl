precision highp float;
attribute float aBit;
attribute float aColumnPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vBit;
varying float vFlicker;
void main() {
  vec3 p = position;
  float fall = mod(uTime * (0.3 + uMid * 0.6) * uMotion + aColumnPhase * 8.0, 3.4) - 1.7;
  p.y -= fall * 0.0;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float flicker = fract(sin(aColumnPhase * 999.0 + floor(uTime * (2.0 + uHigh * 6.0))) * 43758.5);
  gl_PointSize = max(0.6, (1.0 + aBit * 1.6 + uHigh * 1.0) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vBit = aBit;
  vFlicker = flicker;
}
