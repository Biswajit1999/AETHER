import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a114 — Cosmic Web Filaments. Points are accepted only near the
// zero-level-set of a sum of seeded, differently-oriented sine fields — a
// cheap but genuine implicit-surface thresholding technique that produces
// sheet/filament structures resembling the large-scale cosmic web. Explicitly
// SPECULATIVE_ARTISTIC: procedural resemblance, not a cosmological simulation.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03030a);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 100);
  camera.position.z = 4.6;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const targetCount = coarsePointer ? 16000 : 38000;

  const freqs = [
    [1.6 + random(), 1.3 + random(), 1.8 + random()],
    [0.7 + random(), 2.1 + random(), 1.1 + random()],
    [2.3 + random(), 0.9 + random(), 1.6 + random()]
  ];
  const phases = freqs.map(() => [random() * 6.28, random() * 6.28, random() * 6.28]);

  function fieldValue(x, y, z) {
    let v = 0;
    for (let i = 0; i < 3; i++) {
      v += Math.sin(x * freqs[i][0] + phases[i][0]) * Math.sin(y * freqs[i][1] + phases[i][1]) * Math.sin(z * freqs[i][2] + phases[i][2]);
    }
    return v;
  }

  const positions = new Float32Array(targetCount * 3);
  const filamentPhase = new Float32Array(targetCount);
  let accepted = 0, attempts = 0;
  const maxAttempts = targetCount * 40;
  const threshold = 0.12;
  while (accepted < targetCount && attempts < maxAttempts) {
    attempts++;
    const x = (random() - 0.5) * 4.4;
    const y = (random() - 0.5) * 4.4;
    const z = (random() - 0.5) * 4.4;
    const v = fieldValue(x, y, z);
    if (Math.abs(v) < threshold) {
      positions[accepted * 3] = x;
      positions[accepted * 3 + 1] = y;
      positions[accepted * 3 + 2] = z;
      filamentPhase[accepted] = 1 - Math.abs(v) / threshold;
      accepted++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, accepted * 3), 3));
  geometry.setAttribute('aFilamentPhase', new THREE.BufferAttribute(filamentPhase.subarray(0, accepted), 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.08 : 1.0 }
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
      camera.position.z = 4.6 - audio.bass * 0.6;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
