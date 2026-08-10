import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a103 — Ripple Tank Interference. Three seeded point sources emit
// circular waves across a flat particle grid; the superposition (simple sum,
// as in a real ripple tank / Huygens construction) produces genuine
// interference fringes, height-displaced and coloured by local amplitude.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02050a);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const gridSize = coarsePointer ? 90 : 140;
  const particleCount = gridSize * gridSize;
  const spacing = 3.4 / gridSize;
  const half = (gridSize - 1) / 2;

  const positions = new Float32Array(particleCount * 3);
  const sourceA = new Float32Array(particleCount * 2);
  const sourceB = new Float32Array(particleCount * 2);
  const sourceC = new Float32Array(particleCount * 2);

  const sa = [(random() - 0.5) * 2.2, (random() - 0.5) * 2.2];
  const sb = [(random() - 0.5) * 2.2, (random() - 0.5) * 2.2];
  const sc = [(random() - 0.5) * 2.2, (random() - 0.5) * 2.2];

  let cursor = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      positions[cursor * 3] = (x - half) * spacing;
      positions[cursor * 3 + 1] = (y - half) * spacing;
      positions[cursor * 3 + 2] = 0;
      sourceA[cursor * 2] = sa[0]; sourceA[cursor * 2 + 1] = sa[1];
      sourceB[cursor * 2] = sb[0]; sourceB[cursor * 2 + 1] = sb[1];
      sourceC[cursor * 2] = sc[0]; sourceC[cursor * 2 + 1] = sc[1];
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSourceA', new THREE.BufferAttribute(sourceA, 2));
  geometry.setAttribute('aSourceB', new THREE.BufferAttribute(sourceB, 2));
  geometry.setAttribute('aSourceC', new THREE.BufferAttribute(sourceC, 2));

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

      camera.position.x = Math.sin(time * 0.07) * 1.1;
      camera.position.set(Math.sin(time * 0.07) * 1.1, 2.6, 2.2 + Math.cos(time * 0.05) * 0.4);
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
