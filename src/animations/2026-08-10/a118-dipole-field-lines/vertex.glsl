precision highp float;
attribute float aLinePhase;
attribute float aFlowPhase;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vFlow;
varying float vLine;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float flow = fract(aFlowPhase - uTime * (0.15 + uMid * 0.5) * uMotion);
  float glow = 1.0 - smoothstep(0.0, 0.1, abs(flow - 0.5));
  gl_PointSize = max(0.6, (0.9 + glow * 3.5 + uHigh * 1.2) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vFlow = glow;
  vLine = aLinePhase;
}
