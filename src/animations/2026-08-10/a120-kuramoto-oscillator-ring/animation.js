import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a120 — Kuramoto Oscillator Ring. N phase oscillators with seeded
// natural frequencies are coupled via the real Kuramoto model,
// dtheta_i/dt = omega_i + (K/N) * sum_j sin(theta_j - theta_i), integrated
// every frame. As coupling K rises (bass-driven) the ring visibly
// synchronises — a genuine, well-known nonlinear dynamics phenomenon.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030308);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, 2.6, 3.0);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const n = coarsePointer ? 140 : 320;

  const theta = new Float32Array(n);
  const omega = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    theta[i] = random() * Math.PI * 2;
    omega[i] = (random() - 0.5) * 1.4;
  }

  const positions = new Float32Array(n * 3);
  const oscPhase = new Float32Array(n);
  const radius = 1.6;
  for (let i = 0; i < n; i++) {
    const ringAngle = (i / n) * Math.PI * 2;
    positions[i * 3] = Math.cos(ringAngle) * radius;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(ringAngle) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aOscPhase', new THREE.BufferAttribute(oscPhase, 1));

  const uniforms = { uHigh: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const motion = reducedMotion ? 0.15 : 1.0;

  return {
    update({ delta, audio }) {
      uniforms.uHigh.value = audio.high;
      const K = 0.4 + audio.bass * 3.0;
      const dt = Math.min(delta, 0.05) * motion;

      let sumSin = 0, sumCos = 0;
      for (let i = 0; i < n; i++) { sumSin += Math.sin(theta[i]); sumCos += Math.cos(theta[i]); }
      const meanPhase = Math.atan2(sumSin, sumCos);
      const orderR = Math.hypot(sumSin, sumCos) / n;

      for (let i = 0; i < n; i++) {
        const coupling = K * orderR * Math.sin(meanPhase - theta[i]);
        theta[i] += (omega[i] * (0.6 + audio.mid) + coupling) * dt;
      }

      for (let i = 0; i < n; i++) {
        const height = Math.sin(theta[i]) * 0.5;
        positions[i * 3 + 1] = height;
        oscPhase[i] = (theta[i] % (Math.PI * 2)) / (Math.PI * 2);
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aOscPhase.needsUpdate = true;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
