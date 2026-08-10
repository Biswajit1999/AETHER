precision highp float;
varying float vGen;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.28, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.9, 0.5, 0.2), vec3(0.2, 0.6, 0.9), vGen);
  gl_FragColor = vec4(colour, alpha * (0.3 + (1.0 - vGen) * 0.5));
}
