precision highp float;

uniform float uTime;

varying float vEnergy;
varying float vPhase;

vec3 palette(float t) {
  vec3 a = vec3(0.50);
  vec3 b = vec3(0.50);
  vec3 c = vec3(1.00);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);

  float alpha = 1.0 - smoothstep(0.18, 0.50, r);
  float core = 1.0 - smoothstep(0.00, 0.12, r);

  float phase = fract(vPhase * 0.15915 + uTime * 0.025 + vEnergy * 0.4);
  vec3 colour = palette(phase);
  colour += core * vec3(0.45, 0.35, 0.75) * (0.3 + vEnergy);

  gl_FragColor = vec4(colour, alpha * 0.82);
}
