precision highp float;
attribute float aRPhase;
uniform float uHigh;
varying float vR;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(0.5, (0.8 + uHigh * 1.2) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vR = aRPhase;
}
