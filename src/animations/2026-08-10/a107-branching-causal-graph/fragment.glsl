precision highp float;
varying float vDepth;
varying float vPulse;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.28, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.25, 0.9, 0.6), vec3(0.9, 0.3, 0.7), vDepth);
  colour += vPulse * vec3(0.5);
  gl_FragColor = vec4(colour, alpha * (0.3 + vPulse * 0.5));
}
