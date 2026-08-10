import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a125 — Hyperbolic Paraboloid Saddle. The surface z = x^2/a^2 -
// y^2/b^2 is sampled on a grid; colour encodes the sign and rough magnitude
// of the analytically exact Gaussian curvature, K = -4/(a^2*b^2) / (1 +
// (2x/a^2)^2 + (2y/b^2)^2)^2, which is negative everywhere on this surface —
// a real differential-geometry quantity, not merely a decorative gradient.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040408);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, 2.4, 3.6);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const grid = coarsePointer ? 60 : 100;
  const a = 1.1, b = 1.1;
  const particleCount = grid * grid;

  const positions = new Float32Array(particleCount * 3);
  const curvature = new Float32Array(particleCount);
  let cursor = 0;
  let minK = Infinity, maxK = -Infinity;
  const kVals = new Float32Array(particleCount);
  for (let ix = 0; ix < grid; ix++) {
    const x = ((ix / (grid - 1)) - 0.5) * 2.2;
    for (let iy = 0; iy < grid; iy++) {
      const y = ((iy / (grid - 1)) - 0.5) * 2.2;
      const z = (x * x) / (a * a) - (y * y) / (b * b);
      const denom = Math.pow(1 + Math.pow(2 * x / (a * a), 2) + Math.pow(2 * y / (b * b), 2), 2);
      const K = (-4 / (a * a * b * b)) / denom;
      positions[cursor * 3] = x; positions[cursor * 3 + 1] = z * 0.5; positions[cursor * 3 + 2] = y;
      kVals[cursor] = K;
      if (K < minK) minK = K;
      if (K > maxK) maxK = K;
      cursor++;
    }
  }
  for (let i = 0; i < particleCount; i++) curvature[i] = (kVals[i] - minK) / (maxK - minK + 1e-6);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aCurvature', new THREE.BufferAttribute(curvature, 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.1 : 1.0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    update({ time, audio }) {
      uniforms.uTime.value = time;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
