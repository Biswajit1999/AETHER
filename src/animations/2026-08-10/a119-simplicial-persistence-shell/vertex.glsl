precision highp float;
attribute float aNearestDist;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vBorn;
void main() {
  float epsilon = 0.05 + (sin(uTime * (0.1 + uMid * 0.2) * uMotion) * 0.5 + 0.5) * (0.5 + uBass * 0.3);
  float born = 1.0 - smoothstep(epsilon - 0.02, epsilon + 0.02, aNearestDist);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(0.6, (0.8 + born * 3.0 + uHigh * 1.0) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vBorn = born;
}
