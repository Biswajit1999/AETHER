precision highp float;

varying float vGlow;
varying float vStrandPhase;

vec3 emberPalette(float t) {
  vec3 a = vec3(0.55, 0.35, 0.30);
  vec3 b = vec3(0.45, 0.45, 0.40);
  vec3 c = vec3(1.0, 0.8, 0.6);
  vec3 d = vec3(0.15, 0.30, 0.55);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.2, 0.5, r);
  if (alpha <= 0.001) discard;

  vec3 colour = emberPalette(vStrandPhase);
  colour *= 0.35 + vGlow * 1.4;

  gl_FragColor = vec4(colour, alpha * (0.25 + vGlow * 0.6));
}
