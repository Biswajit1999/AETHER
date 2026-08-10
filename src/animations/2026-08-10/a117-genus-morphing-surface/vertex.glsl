precision highp float;
attribute vec3 aSpherePos;
attribute vec3 aTorusPos;
attribute float aSurfacePhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vBlend;
void main() {
  float blend = sin(uTime * 0.18 * uMotion + uBass * 1.5) * 0.5 + 0.5;
  vec3 p = mix(aSpherePos, aTorusPos, blend);
  float spin = uTime * 0.1 * uMotion + uMid * 0.3;
  float c = cos(spin), s = sin(spin);
  p.xz = mat2(c, -s, s, c) * p.xz;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.6, (1.2 + uHigh * 2.0) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vBlend = blend;
}
