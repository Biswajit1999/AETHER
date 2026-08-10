precision highp float;
attribute float aAgentPhase;
uniform float uHigh;
varying float vAgent;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(0.8, (1.6 + uHigh * 2.0) * (2.4 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAgent = aAgentPhase;
}
