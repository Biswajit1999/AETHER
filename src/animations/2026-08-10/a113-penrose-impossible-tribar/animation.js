import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a113 — Penrose Impossible Tribar. Three rectangular beams are
// arranged in a triangular loop with deliberately alternating depth offsets
// at each junction (over/under/over), viewed from a fixed, non-orbiting
// camera — the classic Penrose-triangle construction trick. Explicitly
// SPECULATIVE_ARTISTIC: this is an approximate illusion tuned for one
// viewpoint, not a rigorous perspective proof.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040404);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  camera.position.set(0, 0, 9);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const pointsPerBeam = coarsePointer ? 900 : 2000;
  const beamWidth = 0.55;

  const corners = [
    [0, 1.6, 0], [1.4, -0.9, 0.9], [-1.4, -0.9, -0.9]
  ];
  const depthOffsets = [0.5, -0.5, 0.5];

  const positions = [];
  const beamPhase = [];
  const beamId = [];

  for (let b = 0; b < 3; b++) {
    const start = corners[b];
    const end = corners[(b + 1) % 3];
    for (let i = 0; i < pointsPerBeam; i++) {
      const t = i / pointsPerBeam;
      const jx = (random() - 0.5) * beamWidth;
      const jy = (random() - 0.5) * beamWidth;
      const zOffset = depthOffsets[b] * (t < 0.15 || t > 0.85 ? 1 : 0.2);
      positions.push(
        start[0] + (end[0] - start[0]) * t + jx,
        start[1] + (end[1] - start[1]) * t + jy,
        start[2] + (end[2] - start[2]) * t + zOffset
      );
      beamPhase.push(t);
      beamId.push(b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('aBeamPhase', new THREE.BufferAttribute(new Float32Array(beamPhase), 1));
  geometry.setAttribute('aBeamId', new THREE.BufferAttribute(new Float32Array(beamId), 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.1 : 1.0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.NormalBlending
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
