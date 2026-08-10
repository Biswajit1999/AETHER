precision highp float;
attribute float aDensity;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vDensity;
void main() {
  vec3 p = position;
  float drift = uTime * 0.03 * uMotion;
  p.x += sin(drift + aDensity * 10.0) * 0.05 * (0.5 + uMid);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, (2.0 + aDensity * 4.0 + uHigh * 1.5) * (2.0 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vDensity = aDensity;
}
