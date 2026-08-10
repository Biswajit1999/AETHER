import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a111 — De Jong Chaotic Attractor. The Peter de Jong 2D chaotic map
// (xn+1 = sin(a*yn) - cos(b*xn), yn+1 = sin(c*xn) - cos(d*yn)) is iterated
// from a seeded start point; a third axis is filled via time-lag embedding
// (z = x at an earlier iterate), a standard technique for turning a 2D
// chaotic map into a 3D attractor cloud.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060209);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 3.6;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const iterations = coarsePointer ? 20000 : 60000;
  const lag = 37;

  const a = -2.0 + random() * 0.4, b = -2.3 + random() * 0.4, c = 2.0 + random() * 0.3, d = 2.1 + random() * 0.3;

  const xs = new Float32Array(iterations);
  const ys = new Float32Array(iterations);
  let x = 0.1, y = 0.1;
  for (let i = 0; i < iterations; i++) {
    const nx = Math.sin(a * y) - Math.cos(b * x);
    const ny = Math.sin(c * x) - Math.cos(d * y);
    x = nx; y = ny;
    xs[i] = x; ys[i] = y;
  }

  const particleCount = iterations - lag;
  const positions = new Float32Array(particleCount * 3);
  const age = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = xs[i + lag] * 1.1;
    positions[i * 3 + 1] = ys[i + lag] * 1.1;
    positions[i * 3 + 2] = xs[i] * 1.1;
    age[i] = i / particleCount;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAge', new THREE.BufferAttribute(age, 1));

  const uniforms = { uHigh: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let motion = reducedMotion ? 0.1 : 1.0;
  return {
    update({ time, audio }) {
      uniforms.uHigh.value = audio.high;
      points.rotation.y = time * (0.05 + audio.mid * 0.15) * motion;
      points.rotation.x = Math.sin(time * 0.03) * 0.2 * motion;
      camera.position.z = 3.6 - audio.bass * 0.5;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
