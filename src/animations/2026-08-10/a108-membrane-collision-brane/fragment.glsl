precision highp float;
varying float vSheet;
varying float vRipple;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 colourA = vec3(0.3, 0.55, 1.0);
  vec3 colourB = vec3(1.0, 0.45, 0.35);
  vec3 colour = mix(colourA, colourB, vSheet) * (0.6 + vRipple * 0.4);
  gl_FragColor = vec4(colour, alpha * 0.5);
}
