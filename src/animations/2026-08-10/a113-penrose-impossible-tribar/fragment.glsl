precision highp float;
varying float vBeam;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.32, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 palette[3];
  palette[0] = vec3(0.95, 0.35, 0.25);
  palette[1] = vec3(0.3, 0.75, 0.95);
  palette[2] = vec3(0.95, 0.8, 0.3);
  vec3 colour = palette[int(mod(vBeam, 3.0))];
  gl_FragColor = vec4(colour, alpha * 0.85);
}
