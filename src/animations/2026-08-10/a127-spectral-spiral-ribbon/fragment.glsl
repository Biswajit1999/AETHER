precision highp float;
varying float vBand;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 palette[3];
  palette[0] = vec3(0.95, 0.35, 0.3);
  palette[1] = vec3(0.35, 0.9, 0.55);
  palette[2] = vec3(0.4, 0.55, 1.0);
  gl_FragColor = vec4(palette[int(vBand)], alpha * 0.6);
}
