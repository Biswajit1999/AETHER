precision highp float;
attribute float aVPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vV;
void main() {
  vec3 p = position * (1.0 + uBass * 0.15);
  float spin = uTime * 0.1 * uMotion + uMid * 0.3;
  float c = cos(spin), s = sin(spin);
  p.xz = mat2(c, -s, s, c) * p.xz;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.6, (1.1 + uHigh * 1.5) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vV = aVPhase;
}
