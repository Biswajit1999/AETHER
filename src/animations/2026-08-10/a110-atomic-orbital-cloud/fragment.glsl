precision highp float;
varying float vDensity;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.15, 0.25, 0.55), vec3(0.65, 0.85, 1.0), vDensity);
  gl_FragColor = vec4(colour, alpha * (0.25 + vDensity * 0.4));
}
