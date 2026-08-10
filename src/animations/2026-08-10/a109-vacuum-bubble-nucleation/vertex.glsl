precision highp float;
attribute float aBubbleId;
attribute float aBirthTime;
attribute vec3 aDirection;
uniform float uTime, uBass, uMid, uHigh, uMotion;
varying float vAge;
varying float vBubble;
void main() {
  float age = uTime - aBirthTime;
  float life = mod(age, 9.0 + uBass * 3.0);
  float growth = life * (0.5 + uMid * 0.6) * uMotion;
  vec3 p = aDirection * growth;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float fade = 1.0 - clamp(life / 9.0, 0.0, 1.0);
  gl_PointSize = max(0.6, (1.2 + uHigh * 2.0) * fade * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAge = fade;
  vBubble = aBubbleId;
}
