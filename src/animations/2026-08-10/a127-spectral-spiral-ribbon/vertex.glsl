precision highp float;
attribute float aBandId;
attribute float aArcPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vBand;
void main() {
  vec3 p = position;
  float energy = aBandId < 0.5 ? uBass : (aBandId < 1.5 ? uMid : uHigh);
  p += normalize(p + vec3(0.0001)) * energy * 0.12 * sin(aArcPhase * 20.0 + uTime * 2.0);
  float spin = uTime * 0.06 * uMotion;
  float c = cos(spin), s = sin(spin);
  p.xz = mat2(c, -s, s, c) * p.xz;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.7, (1.2 + energy * 2.0) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vBand = aBandId;
}
