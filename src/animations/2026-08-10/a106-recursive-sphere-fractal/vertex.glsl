precision highp float;
attribute float aGenPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vGen;
void main() {
  vec3 p = position * (1.0 + uBass * 0.15 * sin(aGenPhase * 12.0 + uTime));
  float spin = uTime * 0.1 * uMotion + uMid * 0.4;
  float c = cos(spin), s = sin(spin);
  p.xz = mat2(c, -s, s, c) * p.xz;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.8, (1.2 + uHigh * 2.5 + (1.0 - aGenPhase) * 2.0) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vGen = aGenPhase;
}
