precision highp float;
attribute float aDensityPhase;
attribute float aJitterPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vDensity;
void main() {
  float spin = uTime * 0.12 * uMotion + uMid * 0.4;
  float c = cos(spin), s = sin(spin);
  vec3 p = position;
  p.xz = mat2(c, -s, s, c) * p.xz;
  p += normalize(p + vec3(0.0001)) * uBass * 0.06 * sin(aJitterPhase * 50.0 + uTime * 3.0);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.6, (0.9 + aDensityPhase * 2.5 + uHigh * 1.5) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vDensity = aDensityPhase;
}
