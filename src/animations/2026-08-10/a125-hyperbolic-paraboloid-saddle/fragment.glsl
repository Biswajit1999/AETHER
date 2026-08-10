precision highp float;
varying float vCurvature;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.9, 0.35, 0.3), vec3(0.3, 0.55, 0.95), vCurvature * 0.5 + 0.5);
  gl_FragColor = vec4(colour, alpha * 0.65);
}
