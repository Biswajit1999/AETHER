precision highp float;
varying float vAge;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;
  vec3 colour = mix(vec3(0.9, 0.2, 0.5), vec3(0.2, 0.9, 0.8), vAge);
  gl_FragColor = vec4(colour, alpha * 0.5);
}
