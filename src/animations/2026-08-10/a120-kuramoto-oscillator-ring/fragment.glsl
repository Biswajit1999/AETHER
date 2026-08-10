precision highp float;
varying float vPhase;
vec3 phaseColour(float t) {
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0), d = vec3(0.0, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.28, 0.5, length(p));
  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(phaseColour(vPhase), alpha * 0.75);
}
