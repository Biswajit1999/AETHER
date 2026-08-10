import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a106 — Recursive Sphere Fractal. A sphere-of-spheres constructed by
// recursively placing N child spheres (radius scaled by a fixed ratio) around
// the surface of each parent sphere, self-similar across generations.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040509);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.2;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const generations = coarsePointer ? 3 : 4;
  const childrenPerNode = 6;
  const pointsPerSphere = coarsePointer ? 100 : 220;
  const ratio = 0.42;

  const centres = [{ x: 0, y: 0, z: 0, r: 1.0, gen: 0 }];
  let frontier = centres;
  for (let g = 1; g <= generations; g++) {
    const next = [];
    for (const node of frontier) {
      for (let i = 0; i < childrenPerNode; i++) {
        const theta = Math.acos(1 - 2 * ((i + 0.5) / childrenPerNode));
        const phi = i * 2.399963;
        const childR = node.r * ratio;
        const offset = node.r + childR;
        next.push({
          x: node.x + offset * Math.sin(theta) * Math.cos(phi),
          y: node.y + offset * Math.cos(theta),
          z: node.z + offset * Math.sin(theta) * Math.sin(phi),
          r: childR,
          gen: g
        });
      }
    }
    centres.push(...next);
    frontier = next;
  }

  const particleCount = centres.length * pointsPerSphere;
  const positions = new Float32Array(particleCount * 3);
  const genPhase = new Float32Array(particleCount);
  let cursor = 0;
  for (const node of centres) {
    for (let i = 0; i < pointsPerSphere; i++) {
      const theta = Math.acos(2 * random() - 1);
      const phi = random() * Math.PI * 2;
      positions[cursor * 3] = node.x + node.r * Math.sin(theta) * Math.cos(phi);
      positions[cursor * 3 + 1] = node.y + node.r * Math.cos(theta);
      positions[cursor * 3 + 2] = node.z + node.r * Math.sin(theta) * Math.sin(phi);
      genPhase[cursor] = node.gen / generations;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aGenPhase', new THREE.BufferAttribute(genPhase, 1));

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
      camera.position.x = Math.sin(time * 0.15) * 0.9 * uniforms.uMotion.value;
      camera.position.y = Math.cos(time * 0.11) * 0.6 * uniforms.uMotion.value;
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
