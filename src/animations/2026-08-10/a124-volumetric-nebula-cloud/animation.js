import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a124 — Volumetric Nebula Cloud. Points are importance-sampled
// (weighted acceptance, not thresholded) from a smooth multi-octave sum of
// seeded sine fields (a cheap FBM stand-in), giving soft billowy density
// gradients rather than a114's sharp filament sheets — a different sampling
// regime over a related but independently seeded field.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05030a);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 100);
  camera.position.z = 4.4;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const targetCount = coarsePointer ? 14000 : 32000;

  const octaves = [
    { f: [0.8, 0.9, 0.7], p: [random() * 6.28, random() * 6.28, random() * 6.28], w: 0.6 },
    { f: [1.7, 1.5, 1.9], p: [random() * 6.28, random() * 6.28, random() * 6.28], w: 0.3 },
    { f: [3.1, 2.7, 3.4], p: [random() * 6.28, random() * 6.28, random() * 6.28], w: 0.1 }
  ];
  function fbm(x, y, z) {
    let v = 0;
    for (const o of octaves) v += o.w * Math.sin(x * o.f[0] + o.p[0]) * Math.sin(y * o.f[1] + o.p[1]) * Math.sin(z * o.f[2] + o.p[2]);
    return v * 0.5 + 0.5;
  }

  const positions = new Float32Array(targetCount * 3);
  const density = new Float32Array(targetCount);
  let accepted = 0, attempts = 0;
  const maxAttempts = targetCount * 12;
  while (accepted < targetCount && attempts < maxAttempts) {
    attempts++;
    const x = (random() - 0.5) * 4.6;
    const y = (random() - 0.5) * 4.6;
    const z = (random() - 0.5) * 4.6;
    const d = fbm(x, y, z);
    if (random() < d * d) {
      positions[accepted * 3] = x; positions[accepted * 3 + 1] = y; positions[accepted * 3 + 2] = z;
      density[accepted] = d;
      accepted++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, accepted * 3), 3));
  geometry.setAttribute('aDensity', new THREE.BufferAttribute(density.subarray(0, accepted), 1));

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
      camera.position.z = 4.4 - audio.bass * 0.7;
      points.rotation.y = time * 0.015 * uniforms.uMotion.value;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
