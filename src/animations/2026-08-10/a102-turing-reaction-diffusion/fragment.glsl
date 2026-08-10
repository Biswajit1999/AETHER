precision highp float;

varying float vConcentration;
varying float vScan;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;

  float scanGlow = 1.0 - smoothstep(0.0, 0.12, abs(vScan - 0.5));
  vec3 base = mix(vec3(0.05, 0.08, 0.12), vec3(0.85, 0.65, 0.25), vConcentration);
  vec3 colour = base + scanGlow * vec3(0.4, 0.5, 0.6);

  gl_FragColor = vec4(colour, alpha * (0.35 + vConcentration * 0.5 + scanGlow * 0.25));
}
