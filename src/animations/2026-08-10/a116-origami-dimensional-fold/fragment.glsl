precision highp float;
varying float vPanel;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.95, 0.9, 0.8), vec3(0.5, 0.65, 0.95), mod(vPanel, 2.0));
  gl_FragColor = vec4(colour, alpha * 0.65);
}
