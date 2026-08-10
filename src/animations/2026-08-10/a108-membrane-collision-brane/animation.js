import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a108 — Membrane Collision. Two undulating particle sheets ("branes")
// oscillate toward and through one another along z, each carrying its own
// travelling ripple field — a speculative-artistic nod to brane-collision
// cosmology, not a claim of physical accuracy.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(2.6, 1.4, 2.6);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const gridSize = coarsePointer ? 46 : 70;
  const particleCount = gridSize * gridSize * 2;

  const positions = new Float32Array(particleCount * 3);
  const sheetId = new Float32Array(particleCount);
  const uv = new Float32Array(particleCount * 2);

  let cursor = 0;
  for (let sheet = 0; sheet < 2; sheet++) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const u = x / (gridSize - 1);
        const v = y / (gridSize - 1);
        positions[cursor * 3] = (u - 0.5) * 3.4;
        positions[cursor * 3 + 1] = (v - 0.5) * 3.4;
        positions[cursor * 3 + 2] = 0;
        sheetId[cursor] = sheet;
        uv[cursor * 2] = u; uv[cursor * 2 + 1] = v;
        cursor++;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSheetId', new THREE.BufferAttribute(sheetId, 1));
  geometry.setAttribute('aUV', new THREE.BufferAttribute(uv, 2));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.12 : 1.0 }
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
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
