import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a121 — Bifurcation Diagram Volume. The real logistic-map
// bifurcation diagram (x_{n+1} = r*x_n*(1-x_n), r swept from 2.4 to 4.0) is
// computed exactly: for each r, the map is iterated past its transient and
// the surviving long-term values plotted, extruded into a thin volume for
// depth. The period-doubling route to chaos is genuinely visible.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040409);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);
  camera.position.z = 3.4;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const rSamples = coarsePointer ? 420 : 900;
  const keepIterations = coarsePointer ? 40 : 70;
  const transient = 300;

  const particleCount = rSamples * keepIterations;
  const positions = new Float32Array(particleCount * 3);
  const rPhase = new Float32Array(particleCount);

  let cursor = 0;
  for (let ri = 0; ri < rSamples; ri++) {
    const r = 2.4 + (ri / rSamples) * 1.6;
    let x = 0.5;
    for (let i = 0; i < transient; i++) x = r * x * (1 - x);
    for (let i = 0; i < keepIterations; i++) {
      x = r * x * (1 - x);
      positions[cursor * 3] = (ri / rSamples - 0.5) * 3.6;
      positions[cursor * 3 + 1] = (x - 0.5) * 2.6;
      positions[cursor * 3 + 2] = (random() - 0.5) * 0.15;
      rPhase[cursor] = ri / rSamples;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRPhase', new THREE.BufferAttribute(rPhase, 1));

  const uniforms = { uHigh: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const motion = reducedMotion ? 0.1 : 1.0;
  return {
    update({ time, audio }) {
      uniforms.uHigh.value = audio.high;
      camera.position.z = 3.4 - audio.bass * 0.6;
      camera.position.y = Math.sin(time * (0.03 + audio.mid * 0.12)) * 0.3 * motion;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
