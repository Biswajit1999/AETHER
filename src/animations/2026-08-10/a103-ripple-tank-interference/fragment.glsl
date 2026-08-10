precision highp float;

varying float vAmplitude;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.28, 0.5, r);
  if (alpha <= 0.001) discard;

  vec3 trough = vec3(0.10, 0.20, 0.45);
  vec3 crest = vec3(0.55, 0.85, 1.0);
  vec3 colour = mix(trough, crest, clamp(vAmplitude * 0.5 + 0.5, 0.0, 1.0));

  gl_FragColor = vec4(colour, alpha * (0.4 + abs(vAmplitude) * 0.45));
}
