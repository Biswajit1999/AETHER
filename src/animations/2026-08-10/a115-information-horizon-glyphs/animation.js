import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a115 — Information Horizon Glyphs. A spherical shell of points, each
// carrying a seeded random bit and a per-point flicker driven by a hashed,
// time-quantised pseudo-random function — an "information horizon" reading of
// a boundary encoding discrete data, explicitly artistic rather than physical.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020604);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.2;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const particleCount = coarsePointer ? 20000 : 46000;

  const positions = new Float32Array(particleCount * 3);
  const bit = new Float32Array(particleCount);
  const columnPhase = new Float32Array(particleCount);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < particleCount; i++) {
    const yFrac = 1 - ((i + 0.5) / particleCount) * 2;
    const theta = Math.acos(Math.max(-1, Math.min(1, yFrac)));
    const phi = (i * goldenAngle) % (Math.PI * 2);
    const r = 1.6;
    positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
    positions[i * 3 + 1] = r * Math.cos(theta);
    positions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
    bit[i] = random() < 0.5 ? 0 : 1;
    columnPhase[i] = random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBit', new THREE.BufferAttribute(bit, 1));
  geometry.setAttribute('aColumnPhase', new THREE.BufferAttribute(columnPhase, 1));

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
      points.rotation.y = time * (0.04 + audio.bass * 0.1) * uniforms.uMotion.value;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
