precision highp float;
varying float vBorn;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001 || vBorn < 0.02) discard;
  vec3 colour = mix(vec3(0.1, 0.15, 0.3), vec3(1.0, 0.75, 0.3), vBorn);
  gl_FragColor = vec4(colour, alpha * vBorn * 0.8);
}
