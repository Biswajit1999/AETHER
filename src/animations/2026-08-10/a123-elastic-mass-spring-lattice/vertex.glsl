precision highp float;
attribute float aStrain;
uniform float uHigh;
varying float vStrain;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(0.6, (1.0 + aStrain * 3.0 + uHigh * 1.2) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vStrain = aStrain;
}
