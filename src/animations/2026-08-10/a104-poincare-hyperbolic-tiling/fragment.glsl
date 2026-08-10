precision highp float;

varying float vDepthPhase;
varying float vGlow;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;

  vec3 centre = vec3(0.95, 0.75, 0.35);
  vec3 rim = vec3(0.35, 0.45, 0.95);
  vec3 colour = mix(centre, rim, vDepthPhase);
  float pulse = 1.0 - smoothstep(0.0, 0.15, abs(vGlow - 0.5));

  gl_FragColor = vec4(colour + pulse * 0.3, alpha * (0.35 + (1.0 - vDepthPhase) * 0.35));
}
