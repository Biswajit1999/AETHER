precision highp float;

attribute float aFiberPhase;
attribute float aPointPhase;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;
uniform float uEnvelope;

varying float vEnergy;
varying float vFiberPhase;

// Rotate v by the unit quaternion (w, axis*sin) using the standard
// quaternion-vector rotation identity — a real per-vertex quaternion
// rotation, not a 2D mat2 approximation.
vec3 rotateByQuaternion(vec3 v, vec4 q) {
  vec3 qv = q.xyz;
  return v + 2.0 * cross(qv, cross(qv, v) + q.w * v);
}

void main() {
  float angle = (uTime * 0.16 + uMid * 0.9) * uMotion;
  vec3 axis = normalize(vec3(0.35, 1.0, 0.18));
  vec4 q = vec4(axis * sin(angle * 0.5), cos(angle * 0.5));

  vec3 p = position * (0.75 + uEnvelope * 0.5);
  p = rotateByQuaternion(p, q);

  // Bass pulses each fiber outward along its own radius; high adds fine jitter.
  float radialPulse = 1.0 + uBass * 0.35 * sin(aFiberPhase * 6.0 + uTime * 1.4);
  p *= radialPulse;
  p += rotateByQuaternion(vec3(0.0, 0.0, uHigh * 0.02 * sin(aPointPhase * 40.0 + uTime * 6.0)), q);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

  float size = 2.0 + 5.5 * uHigh + 1.5 * sin(aPointPhase * 20.0 + uTime * 2.0);
  gl_PointSize = max(1.0, size * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vEnergy = clamp(uBass * 0.4 + uMid * 0.35 + uHigh * 0.25, 0.0, 1.0);
  vFiberPhase = aFiberPhase;
}
