precision highp float;

attribute vec3 aCell;
attribute float aHashPhase;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;

varying float vActivation;
varying float vHashPhase;

void main() {
  float speed = (0.5 + uMid * 1.6) * uMotion;

  float wave1 = sin(dot(aCell, vec3(1.3, 0.7, -0.9)) * 2.0 - uTime * 0.6 * speed);
  float wave2 = sin(dot(aCell, vec3(-0.6, 1.4, 1.1)) * 2.6 + uTime * 0.45 * speed);
  float raw = wave1 * 0.5 + wave2 * 0.5 + (aHashPhase - 0.5) * 0.6;

  float threshold = 0.15 - uBass * 0.4;
  float activation = smoothstep(threshold - 0.16, threshold + 0.16, raw);

  vec3 p = position;
  float jitter = uHigh * 0.05 * sin(aHashPhase * 60.0 + uTime * 5.0);
  p += normalize(p + vec3(0.0001)) * jitter;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

  float size = 1.0 + activation * (5.5 + uHigh * 3.0);
  gl_PointSize = max(0.4, size * (2.0 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vActivation = activation;
  vHashPhase = aHashPhase;
}
