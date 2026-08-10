precision highp float;

varying float vBrightness;
varying float vCoreProximity;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float r = length(p);
  float alpha = 1.0 - smoothstep(0.3, 0.5, r);
  if (alpha <= 0.001) discard;

  vec3 starColour = mix(vec3(0.6, 0.7, 1.0), vec3(1.0, 0.95, 0.85), vBrightness);
  vec3 coreColour = vec3(1.0, 0.75, 0.45);
  vec3 colour = mix(starColour, coreColour, vCoreProximity);

  gl_FragColor = vec4(colour, alpha * (0.35 + vBrightness * 0.5 + vCoreProximity * 0.4));
}
