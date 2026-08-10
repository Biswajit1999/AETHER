precision highp float;

varying float vTrailPhase;
varying float vBodyPhase;

vec3 bodyPalette(float t) {
  vec3 a = vec3(0.5, 0.4, 0.3);
  vec3 b = vec3(0.5, 0.4, 0.4);
  vec3 c = vec3(1.0, 1.0, 0.6);
  vec3 d = vec3(0.2, 0.5, 0.8);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.28, 0.5, r);
  if (alpha <= 0.001) discard;

  vec3 colour = bodyPalette(vBodyPhase) * (0.3 + vTrailPhase * 0.9);
  gl_FragColor = vec4(colour, alpha * (0.15 + vTrailPhase * 0.55));
}
