import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a119 — Simplicial Persistence Shell. Points are seeded on a sphere;
// each point's true nearest-neighbour distance is precomputed once. A single
// growing radius epsilon(t) sweeps over time (a simplified Vietoris-Rips
// filtration, the core idea behind persistent homology), and a point becomes
// visible exactly when epsilon exceeds its nearest-neighbour distance.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03040a);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 3.8;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const particleCount = coarsePointer ? 1400 : 3200;

  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.acos(2 * random() - 1);
    const phi = random() * Math.PI * 2;
    const r = 1.5;
    positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
    positions[i * 3 + 1] = r * Math.cos(theta);
    positions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
  }

  const nearestDist = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    let best = Infinity;
    const ix = positions[i * 3], iy = positions[i * 3 + 1], iz = positions[i * 3 + 2];
    for (let j = 0; j < particleCount; j++) {
      if (i === j) continue;
      const dx = positions[j * 3] - ix, dy = positions[j * 3 + 1] - iy, dz = positions[j * 3 + 2] - iz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < best) best = d;
    }
    nearestDist[i] = Math.sqrt(best);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aNearestDist', new THREE.BufferAttribute(nearestDist, 1));

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
      points.rotation.y = time * 0.05 * uniforms.uMotion.value;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
