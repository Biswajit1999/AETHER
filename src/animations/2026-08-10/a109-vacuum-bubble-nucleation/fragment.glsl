precision highp float;
varying float vAge;
varying float vBubble;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.15, 0.05, 0.35), vec3(1.0, 0.7, 0.9), fract(vBubble * 4.7));
  gl_FragColor = vec4(colour, alpha * vAge * 0.6);
}
