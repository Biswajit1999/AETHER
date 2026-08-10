precision highp float;

attribute vec2 aSourceA;
attribute vec2 aSourceB;
attribute vec2 aSourceC;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;

varying float vAmplitude;

void main() {
  vec3 p = position;
  float k = 8.0 + uMid * 6.0;
  float speed = (1.4 + uBass * 1.2) * uMotion;

  float dA = length(p.xy - aSourceA);
  float dB = length(p.xy - aSourceB);
  float dC = length(p.xy - aSourceC);

  float wave = sin(dA * k - uTime * speed)
             + sin(dB * k - uTime * speed * 1.05)
             + sin(dC * k - uTime * speed * 0.92);
  wave /= 3.0;

  p.z += wave * (0.22 + uBass * 0.25);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float size = 1.6 + abs(wave) * 3.0 + uHigh * 1.5;
  gl_PointSize = max(1.0, size * (2.2 / -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;

  vAmplitude = wave;
}
