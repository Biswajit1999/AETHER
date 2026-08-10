precision highp float;

attribute float aTrailPhase;
attribute float aBodyPhase;

uniform float uHigh;

varying float vTrailPhase;
varying float vBodyPhase;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float size = 1.0 + aTrailPhase * 2.5 + uHigh * 1.5;
  gl_PointSize = max(0.6, size * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vTrailPhase = aTrailPhase;
  vBodyPhase = aBodyPhase;
}
