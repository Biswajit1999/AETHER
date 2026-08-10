precision highp float;
attribute float aLevel;
attribute float aRingPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vLevel;
void main() {
  // Continuous logarithmic zoom: each level's world-space scale is
  // multiplied by exp(zoomRate * time), and levels cycle via mod so the
  // "camera" appears to fall forever through self-similar nested frames —
  // the classic Droste-effect illusion.
  float zoomRate = (0.12 + uMid * 0.15) * uMotion;
  float scale = exp(zoomRate * uTime);
  vec3 p = position * scale;
  float spin = uTime * 0.08 * uMotion + aLevel * 0.6;
  float c = cos(spin), s = sin(spin);
  p.xy = mat2(c, -s, s, c) * p.xy;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float fade = 1.0 - smoothstep(0.0, 40.0, length(mvPosition.xyz));
  gl_PointSize = max(0.5, (1.0 + uHigh * 2.0) * fade * (2.2 / max(0.01, -mvPosition.z)));
  gl_Position = projectionMatrix * mvPosition;
  vLevel = mod(aLevel + uBass * 2.0, 8.0) / 8.0;
}
