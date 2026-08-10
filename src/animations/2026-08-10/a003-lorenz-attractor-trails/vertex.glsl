precision highp float;

attribute float aTrailPhase;
attribute float aStrandPhase;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;
uniform float uFlow;

varying float vGlow;
varying float vStrandPhase;

void main() {
  vec3 p = position;

  // Bass thickens the trail by pushing points outward along their own
  // normal-ish direction (approximated via position itself, since the
  // attractor is centred near the origin).
  p += normalize(p + vec3(0.0001)) * uBass * 0.08;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

  // A travelling window of brightness flows along each strand's trajectory,
  // its speed driven by mid-frequency energy. High frequencies add sparkle.
  float distanceFromFlow = abs(fract(aTrailPhase - uFlow) - 0.5) * 2.0;
  float glow = 1.0 - smoothstep(0.05, 0.55, distanceFromFlow);
  glow += uHigh * 0.15 * sin(aTrailPhase * 300.0 + uTime * 4.0);
  glow = clamp(glow, 0.0, 1.0);

  float size = (1.4 + glow * 4.5 + uHigh * 2.0);
  gl_PointSize = max(1.0, size * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vGlow = glow;
  vStrandPhase = aStrandPhase;
}
