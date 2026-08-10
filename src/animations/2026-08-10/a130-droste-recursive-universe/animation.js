import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a130 — Droste Recursive Universe. A handful of ring "frames" are
// placed at exponentially increasing base radii (level k at radius^k); the
// vertex shader multiplies every point's scale by exp(zoomRate*time), so all
// levels continuously grow at the same relative rate. Because a new level is
// always crossing into visible range as an old one grows past it, the effect
// reads as an infinite self-similar zoom — the classic Droste-effect
// construction, here built from genuine per-level exponential scaling rather
// than a recursively re-rendered texture.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020208);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 200);
  camera.position.z = 6.0;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const levels = 8;
  const pointsPerRing = coarsePointer ? 200 : 420;
  const ringsPerLevel = 3;
  const particleCount = levels * ringsPerLevel * pointsPerRing;

  const positions = new Float32Array(particleCount * 3);
  const levelAttr = new Float32Array(particleCount);
  const ringPhase = new Float32Array(particleCount);

  let cursor = 0;
  for (let level = 0; level < levels; level++) {
    const baseRadius = Math.pow(1.6, level - levels) * 40;
    for (let ring = 0; ring < ringsPerLevel; ring++) {
      const radius = baseRadius * (0.7 + ring * 0.3);
      for (let i = 0; i < pointsPerRing; i++) {
        const a = (i / pointsPerRing) * Math.PI * 2;
        positions[cursor * 3] = Math.cos(a) * radius;
        positions[cursor * 3 + 1] = Math.sin(a) * radius;
        positions[cursor * 3 + 2] = -level * 0.02;
        levelAttr[cursor] = level;
        ringPhase[cursor] = i / pointsPerRing;
        cursor++;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLevel', new THREE.BufferAttribute(levelAttr, 1));
  geometry.setAttribute('aRingPhase', new THREE.BufferAttribute(ringPhase, 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.08 : 1.0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  const zoomPeriod = 22;
  return {
    update({ time, audio }) {
      uniforms.uTime.value = time % zoomPeriod;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
