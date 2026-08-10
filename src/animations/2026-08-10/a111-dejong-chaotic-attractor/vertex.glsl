precision highp float;
attribute float aAge;
uniform float uHigh;
varying float vAge;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(0.6, (0.8 + aAge * 1.6 + uHigh * 1.2) * (2.4 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAge = aAge;
}
