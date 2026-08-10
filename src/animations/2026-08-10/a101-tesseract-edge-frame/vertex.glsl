precision highp float;

attribute vec4 aPoint4;
attribute float aEdgePhase;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;

varying float vDepth;
varying float vEdgePhase;

void main() {
  float angleXW = (uTime * 0.25 + uMid * 0.8) * uMotion;
  float angleYZ = (uTime * 0.17 + uBass * 0.6) * uMotion;

  float cxw = cos(angleXW), sxw = sin(angleXW);
  float x = aPoint4.x * cxw - aPoint4.w * sxw;
  float w = aPoint4.x * sxw + aPoint4.w * cxw;

  float cyz = cos(angleYZ), syz = sin(angleYZ);
  float y = aPoint4.y * cyz - aPoint4.z * syz;
  float z = aPoint4.y * syz + aPoint4.z * cyz;

  float perspectiveW = 2.6 - w * 0.55;
  vec3 p3 = vec3(x, y, z) / max(0.7, perspectiveW) * 1.7;

  vec4 mvPosition = modelViewMatrix * vec4(p3, 1.0);
  float size = 1.6 + uHigh * 4.0;
  gl_PointSize = max(1.0, size * (2.3 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vDepth = clamp((perspectiveW - 1.5) / 1.8, 0.0, 1.0);
  vEdgePhase = aEdgePhase;
}
