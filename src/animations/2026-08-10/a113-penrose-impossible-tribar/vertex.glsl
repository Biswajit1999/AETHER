precision highp float;
attribute float aBeamPhase;
attribute float aBeamId;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vBeam;
void main() {
  vec3 p = position;
  float jitterFreq = 40.0 + uMid * 60.0;
  p += normalize(p + vec3(0.0001)) * uBass * 0.03 * sin(aBeamPhase * jitterFreq + uTime * 2.0);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, (2.0 + uHigh * 2.0) * (2.4 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vBeam = aBeamId;
}
