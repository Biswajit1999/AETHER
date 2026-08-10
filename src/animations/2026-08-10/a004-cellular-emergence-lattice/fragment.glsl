precision highp float;

varying float vActivation;
varying float vHashPhase;

void main() {
  if (vActivation < 0.02) discard;

  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;

  vec3 dim = vec3(0.15, 0.85, 0.65);
  vec3 bright = vec3(0.75, 1.0, 0.95);
  vec3 colour = mix(dim, bright, vActivation) * mix(0.7, 1.3, vHashPhase);

  gl_FragColor = vec4(colour, alpha * vActivation);
}
