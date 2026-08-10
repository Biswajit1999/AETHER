precision highp float;

uniform float uBass;

varying float vDepth;
varying float vEdgePhase;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.28, 0.5, r);
  if (alpha <= 0.001) discard;

  // Bass sweeps a 4D-depth clipping threshold across the structure.
  float cut = uBass * 0.9;
  if (vDepth < cut * 0.4) discard;

  vec3 near = vec3(0.35, 0.55, 1.0);
  vec3 far = vec3(1.0, 0.4, 0.65);
  vec3 colour = mix(far, near, vDepth) * (0.6 + 0.4 * sin(vEdgePhase * 30.0));

  gl_FragColor = vec4(colour, alpha * (0.4 + vDepth * 0.5));
}
