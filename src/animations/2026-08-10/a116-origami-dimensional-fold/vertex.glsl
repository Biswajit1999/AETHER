precision highp float;
attribute float aPanelId;
attribute float aHingeOffset;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vPanel;
void main() {
  float foldAngle = (sin(uTime * (0.25 + uMid * 0.4) * uMotion) * 0.5 + 0.5) * 3.0 * (0.4 + uBass * 0.6);
  float panelAngle = foldAngle * (mod(aPanelId, 2.0) < 0.5 ? 1.0 : -1.0);
  vec3 p = position;
  float local = p.x - aHingeOffset;
  float c = cos(panelAngle), s = sin(panelAngle);
  p.x = aHingeOffset + local * c;
  p.z = local * s;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(0.7, (1.3 + uHigh * 1.6) * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vPanel = aPanelId;
}
