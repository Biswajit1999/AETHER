precision highp float;
attribute float aSheetId;
attribute vec2 aUV;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vSheet;
varying float vRipple;
void main() {
  vec3 p = position;
  float sign = aSheetId < 0.5 ? 1.0 : -1.0;
  float approach = sin(uTime * 0.12 * uMotion) * (1.2 + uBass * 0.6);
  float ripple = sin(aUV.x * 10.0 + uTime * (1.2 + uMid * 1.5)) * cos(aUV.y * 8.0 - uTime * 0.9);
  p.z = sign * (approach + ripple * 0.25);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.8, (1.4 + uHigh * 2.0) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vSheet = aSheetId;
  vRipple = ripple;
}
