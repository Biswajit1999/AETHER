precision highp float;
attribute float aCurvature;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vCurvature;
void main() {
  vec3 p = position;
  p.z *= 1.0 + uBass * 0.4;
  float spin = uTime * 0.08 * uMotion + uMid * 0.2;
  float c = cos(spin), s = sin(spin);
  p.xy = mat2(c, -s, s, c) * p.xy;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.6, (1.2 + uHigh * 1.6) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vCurvature = aCurvature;
}
