precision highp float;
attribute float aX;
attribute float aLayer;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vLayer;
void main() {
  float growth = min(1.0, uTime * (0.04 + uMid * 0.08) * uMotion);
  float amp = 0.05 + growth * (0.35 + uBass * 0.3);
  float k = 3.5;
  float wave = sin(aX * k) * amp;
  // Roll-up: near crest, add a small spiral swirl once growth is advanced.
  float crest = cos(aX * k);
  float swirl = growth * growth * 0.18 * crest;
  vec3 p = position;
  p.y += (aLayer < 0.5 ? 1.0 : -1.0) * wave + swirl * sin(uTime * 2.0 + aX * 10.0);
  p.z += swirl * cos(uTime * 2.0 + aX * 10.0);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.6, (1.2 + uHigh * 1.5) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vLayer = aLayer;
}
