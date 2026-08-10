precision highp float;
varying float vFilament;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.15, 0.2, 0.4), vec3(0.9, 0.6, 0.95), vFilament);
  gl_FragColor = vec4(colour, alpha * (0.2 + vFilament * 0.4));
}
