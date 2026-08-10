import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a128 — Gravitational Wave Chirp. Concentric point rings ripple with
// a frequency that follows the real leading-order post-Newtonian quadrupole
// chirp scaling law f(t) ~ (tc - t)^(-3/8) as the simulated merger time tc
// approaches — the well-known "chirp" signature of a compact-binary
// inspiral. The visual wobble is a simplified artistic mapping of that
// frequency, not a full gravitational waveform, hence MATHEMATICALLY_INSPIRED.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030312);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.4;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const ringCount = coarsePointer ? 22 : 42;
  const pointsPerRing = coarsePointer ? 160 : 320;
  const particleCount = ringCount * pointsPerRing;

  const positions = new Float32Array(particleCount * 3);
  const ringPhase = new Float32Array(particleCount);
  const anglePhase = new Float32Array(particleCount);

  let cursor = 0;
  for (let r = 0; r < ringCount; r++) {
    const radius = 0.3 + (r / ringCount) * 2.6;
    for (let i = 0; i < pointsPerRing; i++) {
      const a = (i / pointsPerRing) * Math.PI * 2;
      positions[cursor * 3] = Math.cos(a) * radius;
      positions[cursor * 3 + 1] = Math.sin(a) * radius;
      positions[cursor * 3 + 2] = 0;
      ringPhase[cursor] = r / ringCount;
      anglePhase[cursor] = a;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRingPhase', new THREE.BufferAttribute(ringPhase, 1));
  geometry.setAttribute('aAnglePhase', new THREE.BufferAttribute(anglePhase, 1));

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
      uniforms.uTime.value = time % 10;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
