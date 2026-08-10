import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a126 — Roman Surface Immersion. Uses Steiner's Roman surface, the
// standard parametrisation x=cos(u)cos(v)sin(v), y=sin(u)cos(v)sin(v),
// z=cos(u)sin(u)cos^2(v) for u in [0,2pi), v in [0,pi) — an immersion of the
// real projective plane RP^2 in R^3 with the classic self-intersecting,
// non-orientable structure (same topological family as Boy's surface).
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050309);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 3.8;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const uSteps = coarsePointer ? 90 : 150;
  const vSteps = coarsePointer ? 90 : 150;
  const particleCount = uSteps * vSteps;

  const positions = new Float32Array(particleCount * 3);
  const vPhase = new Float32Array(particleCount);
  let cursor = 0;
  const scale = 1.7;
  for (let iu = 0; iu < uSteps; iu++) {
    const u = (iu / uSteps) * Math.PI * 2;
    for (let iv = 0; iv < vSteps; iv++) {
      const v = (iv / vSteps) * Math.PI;
      const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
      positions[cursor * 3] = scale * cu * cv * sv;
      positions[cursor * 3 + 1] = scale * su * cv * sv;
      positions[cursor * 3 + 2] = scale * cu * su * cv * cv;
      vPhase[cursor] = iv / vSteps;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aVPhase', new THREE.BufferAttribute(vPhase, 1));

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
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
