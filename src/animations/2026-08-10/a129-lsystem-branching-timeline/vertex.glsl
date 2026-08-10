precision highp float;
attribute float aBranchPhase;
attribute float aFlickerSeed;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vBranch;
void main() {
  vec3 p = position * (1.0 + uBass * 0.08 * sin(aBranchPhase * 6.0 + uTime));
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float flicker = 0.7 + 0.3 * sin(aFlickerSeed * 30.0 + uTime * (1.5 + uHigh * 3.0));
  float sizeSpread = 1.0 + uMid * 1.2;
  gl_PointSize = max(0.6, (1.0 + (1.0 - aBranchPhase) * 1.6 * sizeSpread) * flicker * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vBranch = aBranchPhase;
}
