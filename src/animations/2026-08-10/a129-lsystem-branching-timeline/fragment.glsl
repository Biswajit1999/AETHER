precision highp float;
varying float vBranch;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.95, 0.55, 0.2), vec3(0.35, 0.55, 0.95), vBranch);
  gl_FragColor = vec4(colour, alpha * 0.6);
}
