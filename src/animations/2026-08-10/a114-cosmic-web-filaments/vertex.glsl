precision highp float;
attribute float aFilamentPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vFilament;
void main() {
  vec3 p = position;
  float spin = uTime * 0.03 * uMotion + uMid * 0.15;
  float c = cos(spin), s = sin(spin);
  p.xz = mat2(c, -s, s, c) * p.xz;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.5, (0.7 + uHigh * 1.8) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vFilament = aFilamentPhase;
}
