precision highp float;

attribute float aDepthPhase;
attribute float aEdgePhase;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;

varying float vDepthPhase;
varying float vGlow;

void main() {
  float spin = uTime * 0.05 * uMotion + uMid * 0.3;
  float c = cos(spin), s = sin(spin);
  vec3 p = position;
  p.xy = mat2(c, -s, s, c) * p.xy;

  // Bass gently "breathes" the whole disk outward from the centre.
  p.xy *= 1.0 + uBass * 0.06;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float size = 1.2 + (1.0 - aDepthPhase) * 3.0 + uHigh * 1.5;
  gl_PointSize = max(0.6, size * (2.4 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vDepthPhase = aDepthPhase;
  vGlow = fract(aEdgePhase - uTime * 0.05 * uMotion);
}
