import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a122 — Kelvin-Helmholtz Shear Layer. Two counter-flowing particle
// layers share an interface that develops a growing sinusoidal perturbation
// (amplitude increasing with time, as in the real KH instability's early
// exponential growth) which begins to roll up into small vortical spirals
// once the amplitude passes a threshold.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03060a);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, 1.2, 3.6);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const stripCount = coarsePointer ? 46 : 90;
  const depthCount = coarsePointer ? 10 : 18;
  const particleCount = stripCount * depthCount * 2;

  const positions = new Float32Array(particleCount * 3);
  const xAttr = new Float32Array(particleCount);
  const layerAttr = new Float32Array(particleCount);

  let cursor = 0;
  for (let layer = 0; layer < 2; layer++) {
    for (let ix = 0; ix < stripCount; ix++) {
      const x = ((ix / stripCount) - 0.5) * 4.4;
      for (let iz = 0; iz < depthCount; iz++) {
        const z = ((iz / depthCount) - 0.5) * 1.6;
        positions[cursor * 3] = x;
        positions[cursor * 3 + 1] = layer === 0 ? 0.05 : -0.05;
        positions[cursor * 3 + 2] = z;
        xAttr[cursor] = x;
        layerAttr[cursor] = layer;
        cursor++;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aX', new THREE.BufferAttribute(xAttr, 1));
  geometry.setAttribute('aLayer', new THREE.BufferAttribute(layerAttr, 1));

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
      uniforms.uTime.value = time % 26;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
