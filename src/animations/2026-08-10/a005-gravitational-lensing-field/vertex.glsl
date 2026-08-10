precision highp float;

attribute float aBrightness;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;

varying float vBrightness;
varying float vCoreProximity;

void main() {
  vec3 p = position;
  float dist = length(p);
  float safeDist = max(dist, 0.35);

  // Differential ("Keplerian-flavoured") swirl: points closer to the central
  // mass rotate faster, a loose visual analogue of frame-dragging rather than
  // a literal general-relativistic light-bending calculation.
  float swirlRate = (0.25 + uMid * 1.1) * uMotion / safeDist;
  float angle = uTime * swirlRate;
  float c = cos(angle);
  float s = sin(angle);
  vec3 swirled = vec3(
    p.x * c - p.z * s,
    p.y,
    p.x * s + p.z * c
  );

  // Bass briefly deepens the well, pulling nearby stars further inward.
  float pull = uBass * 0.35 / (safeDist * safeDist);
  swirled -= normalize(swirled + vec3(0.0001)) * pull;

  vec4 mvPosition = modelViewMatrix * vec4(swirled, 1.0);

  float coreProximity = clamp(1.0 - safeDist / 1.4, 0.0, 1.0);
  float twinkle = 1.0 + uHigh * 0.6 * sin(aBrightness * 80.0 + uTime * 6.0);
  float size = (0.8 + aBrightness * 2.2 + coreProximity * 6.0) * twinkle;

  gl_PointSize = max(0.4, size * (2.0 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vBrightness = aBrightness;
  vCoreProximity = coreProximity;
}
