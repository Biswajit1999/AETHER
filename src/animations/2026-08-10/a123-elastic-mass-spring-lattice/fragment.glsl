precision highp float;
varying float vStrain;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.2, 0.35, 0.6), vec3(1.0, 0.6, 0.3), min(1.0, vStrain));
  gl_FragColor = vec4(colour, alpha * 0.6);
}
