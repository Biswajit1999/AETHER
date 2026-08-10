precision highp float;
varying float vDensity;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.1, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.55, 0.15, 0.45), vec3(0.35, 0.55, 0.95), vDensity);
  gl_FragColor = vec4(colour, alpha * vDensity * 0.35);
}
