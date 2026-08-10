precision highp float;
attribute float aOscPhase;
uniform float uHigh;
varying float vPhase;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.0, (2.0 + uHigh * 2.5) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vPhase = aOscPhase;
}
