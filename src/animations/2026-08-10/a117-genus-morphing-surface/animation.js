import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a117 — Genus-Morphing Surface. Every point holds two parametric
// positions sharing the same (u,v) domain — one on a sphere, one on a torus —
// and the shader linearly blends between them over time (bass-modulated).
// This is a parametric homotopy, not literal topological surgery, so it is
// described as "surface blend" rather than a claim of genus-changing geometry.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040409);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.0;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const uSteps = coarsePointer ? 90 : 160;
  const vSteps = coarsePointer ? 60 : 110;
  const particleCount = uSteps * vSteps;

  const spherePos = new Float32Array(particleCount * 3);
  const torusPos = new Float32Array(particleCount * 3);
  const surfacePhase = new Float32Array(particleCount);

  const R = 1.1, r = 0.42;
  let cursor = 0;
  for (let iu = 0; iu < uSteps; iu++) {
    const u = (iu / uSteps) * Math.PI * 2;
    for (let iv = 0; iv < vSteps; iv++) {
      const v = (iv / vSteps) * Math.PI;

      spherePos[cursor * 3] = 1.4 * Math.sin(v) * Math.cos(u);
      spherePos[cursor * 3 + 1] = 1.4 * Math.cos(v);
      spherePos[cursor * 3 + 2] = 1.4 * Math.sin(v) * Math.sin(u);

      const v2 = v * 2;
      torusPos[cursor * 3] = (R + r * Math.cos(v2)) * Math.cos(u);
      torusPos[cursor * 3 + 1] = r * Math.sin(v2);
      torusPos[cursor * 3 + 2] = (R + r * Math.cos(v2)) * Math.sin(u);

      surfacePhase[cursor] = iu / uSteps;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
  geometry.setAttribute('aSpherePos', new THREE.BufferAttribute(spherePos, 3));
  geometry.setAttribute('aTorusPos', new THREE.BufferAttribute(torusPos, 3));
  geometry.setAttribute('aSurfacePhase', new THREE.BufferAttribute(surfacePhase, 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.1 : 1.0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
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
