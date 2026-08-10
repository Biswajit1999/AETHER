import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a004 — Cellular Emergence Lattice.
//
// A fixed cubic voxel lattice where each cell's on/off "activation" comes
// from a closed-form combination of travelling plane waves plus a per-cell
// hash, evaluated per-frame in the shader. This produces rule-like emergent
// ripples across the lattice without a true multi-generation cellular-
// automaton simulation — labelled SPECULATIVE_ARTISTIC, not a claim of an
// actual CA implementation.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02060a);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const gridSize = coarsePointer ? 22 : 34;
  const particleCount = gridSize * gridSize * gridSize;
  const spacing = 3.2 / gridSize;
  const half = (gridSize - 1) / 2;

  const positions = new Float32Array(particleCount * 3);
  const cellCoords = new Float32Array(particleCount * 3);
  const hashPhase = new Float32Array(particleCount);

  let cursor = 0;
  for (let ix = 0; ix < gridSize; ix++) {
    for (let iy = 0; iy < gridSize; iy++) {
      for (let iz = 0; iz < gridSize; iz++) {
        positions[cursor * 3] = (ix - half) * spacing;
        positions[cursor * 3 + 1] = (iy - half) * spacing;
        positions[cursor * 3 + 2] = (iz - half) * spacing;
        cellCoords[cursor * 3] = ix;
        cellCoords[cursor * 3 + 1] = iy;
        cellCoords[cursor * 3 + 2] = iz;
        hashPhase[cursor] = random();
        cursor++;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aCell', new THREE.BufferAttribute(cellCoords, 3));
  geometry.setAttribute('aHashPhase', new THREE.BufferAttribute(hashPhase, 1));

  const uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.15 : 1.0 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    update({ time, audio }) {
      uniforms.uTime.value = time;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;

      // Breathing dolly + gentle tilt rather than an orbit or static frame.
      const breathe = 4.6 + Math.sin(time * 0.09) * 0.7;
      camera.position.set(Math.sin(time * 0.04) * 0.5, 0.3, breathe * uniforms.uMotion.value + (1 - uniforms.uMotion.value) * 4.6);
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    render() {
      runtime.renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(points);
    }
  };
}
