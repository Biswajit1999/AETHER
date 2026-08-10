precision highp float;
varying float vFlow;
varying float vLine;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  vec3 base = mix(vec3(0.15, 0.3, 0.6), vec3(0.9, 0.4, 0.2), vLine);
  gl_FragColor = vec4(base + vFlow * 0.5, alpha * (0.25 + vFlow * 0.55));
}
