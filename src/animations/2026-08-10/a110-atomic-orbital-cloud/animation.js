import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a110 — Atomic Orbital Cloud. Points are drawn by rejection sampling
// from the real (unnormalised) 3d_z2 hydrogen-like orbital probability
// density, (3z^2-r^2)^2 * exp(-2r/3) — a genuine analytic quantum-mechanical
// shape, though displayed as a static cloud rather than full time-dependent
// evolution, hence MATHEMATICALLY_INSPIRED.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030612);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);
  camera.position.z = 5.2;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const targetCount = coarsePointer ? 18000 : 42000;

  function density(x, y, z) {
    const r = Math.sqrt(x * x + y * y + z * z);
    const term = 3 * z * z - r * r;
    return term * term * Math.exp((-2 / 3) * r);
  }
  const densityMax = density(0, 0, 3.6);

  const positions = new Float32Array(targetCount * 3);
  const densityPhase = new Float32Array(targetCount);
  const jitterPhase = new Float32Array(targetCount);

  let accepted = 0;
  let attempts = 0;
  const maxAttempts = targetCount * 60;
  while (accepted < targetCount && attempts < maxAttempts) {
    attempts++;
    const x = (random() - 0.5) * 12;
    const y = (random() - 0.5) * 12;
    const z = (random() - 0.5) * 12;
    const d = density(x, y, z) / densityMax;
    if (random() < d) {
      positions[accepted * 3] = x * 0.42;
      positions[accepted * 3 + 1] = y * 0.42;
      positions[accepted * 3 + 2] = z * 0.42;
      densityPhase[accepted] = Math.min(1, d * 1.4);
      jitterPhase[accepted] = random();
      accepted++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, accepted * 3), 3));
  geometry.setAttribute('aDensityPhase', new THREE.BufferAttribute(densityPhase.subarray(0, accepted), 1));
  geometry.setAttribute('aJitterPhase', new THREE.BufferAttribute(jitterPhase.subarray(0, accepted), 1));

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
      const drift = time * 0.05 * uniforms.uMotion.value;
      camera.position.set(Math.sin(drift) * 5.2, Math.sin(drift * 0.7) * 1.5, Math.cos(drift) * 5.2);
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
