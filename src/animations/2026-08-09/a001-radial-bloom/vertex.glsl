precision highp float;

attribute float aPhase;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;

varying float vEnergy;
varying float vPhase;

void main() {
  vec3 p = position;

  float waveA = sin(p.y * 5.0 + uTime * 0.8 + aPhase);
  float waveB = cos(length(p.xz) * 8.0 - uTime * 1.2);

  float displacement = (waveA * (0.05 + uBass * 0.22) + waveB * (0.03 + uMid * 0.14)) * uMotion;

  vec3 dir = normalize(p + vec3(0.0001));
  p += dir * displacement;

  float spin = uTime * 0.08 * uMotion;
  float c = cos(spin);
  float s = sin(spin);
  p.xz = mat2(c, -s, s, c) * p.xz;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

  float size = 2.5 + 8.0 * uHigh + 3.0 * sin(aPhase + uTime);
  gl_PointSize = max(1.0, size * (2.0 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vEnergy = clamp(uBass * 0.5 + uMid * 0.3 + uHigh * 0.2, 0.0, 1.0);
  vPhase = aPhase;
}
