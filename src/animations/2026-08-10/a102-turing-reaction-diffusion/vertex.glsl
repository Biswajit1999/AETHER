precision highp float;

attribute float aConcentration;
attribute float aGridPhase;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;

varying float vConcentration;
varying float vScan;

void main() {
  vec3 p = position;
  p.z += (aConcentration - 0.5) * (0.35 + uBass * 0.5);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

  float size = 1.6 + aConcentration * 3.0 + uHigh * 2.0;
  gl_PointSize = max(1.0, size * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vConcentration = aConcentration;
  // A scanning band of brightness sweeps across the grid, speed set by mid.
  vScan = fract(aGridPhase - uTime * (0.06 + uMid * 0.3) * uMotion);
}
