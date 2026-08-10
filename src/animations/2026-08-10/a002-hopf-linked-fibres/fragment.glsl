precision highp float;

uniform float uTime;

varying float vEnergy;
varying float vFiberPhase;

// Fresnel-flavoured iridescent palette — each fibre gets its own hue band.
vec3 iridescence(float t) {
  vec3 a = vec3(0.35, 0.30, 0.55);
  vec3 b = vec3(0.65, 0.55, 0.45);
  vec3 c = vec3(1.0, 0.9, 1.2);
  vec3 d = vec3(0.10, 0.45, 0.75);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.16, 0.5, r);
  float rim = smoothstep(0.32, 0.5, r) * (1.0 - smoothstep(0.46, 0.5, r));

  float hue = fract(vFiberPhase * 0.15915 + uTime * 0.02);
  vec3 colour = iridescence(hue);
  colour += rim * vec3(0.8, 0.9, 1.0) * (0.4 + vEnergy);

  gl_FragColor = vec4(colour, alpha * (0.55 + vEnergy * 0.35));
}
