precision highp float;
varying float vBit;
varying float vFlicker;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.05, 0.15, 0.1), vec3(0.3, 1.0, 0.55), vBit);
  gl_FragColor = vec4(colour, alpha * (0.25 + vFlicker * 0.5));
}
