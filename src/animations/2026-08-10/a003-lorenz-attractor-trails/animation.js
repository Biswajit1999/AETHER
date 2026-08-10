import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a003 — Lorenz Attractor Trails.
//
// Several independent Lorenz-system trajectories (dx/dt = sigma(y-x),
// dy/dt = x(rho-z)-y, dz/dt = xy-beta*z) are integrated once at start-up
// with seeded initial conditions and per-strand parameter jitter, then
// rendered as static point trails with a shader-driven travelling glow.
// This is a real chaotic dynamical system, not a physical air-convection
// simulation — hence MATHEMATICALLY_INSPIRED rather than PHYSICALLY_MODELLED.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040305);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, 0.4, 5.4);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const strandCount = coarsePointer ? 3 : 6;
  const pointsPerStrand = coarsePointer ? 2600 : 7000;
  const particleCount = strandCount * pointsPerStrand;

  const positions = new Float32Array(particleCount * 3);
  const trailPhase = new Float32Array(particleCount);
  const strandPhaseAttr = new Float32Array(particleCount);

  let minV = new THREE.Vector3(Infinity, Infinity, Infinity);
  let maxV = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  let cursor = 0;

  for (let s = 0; s < strandCount; s++) {
    const sigma = 10;
    const rho = 26 + random() * 6;
    const beta = 8 / 3;
    let x = 0.1 + (random() - 0.5) * 2;
    let y = (random() - 0.5) * 2;
    let z = 20 + (random() - 0.5) * 4;
    const dt = 0.006;
    const strandPhase = strandCount === 1 ? 0 : s / (strandCount - 1);

    // Burn in a few hundred steps so every strand starts on the attractor
    // rather than on its transient approach.
    for (let i = 0; i < 400; i++) {
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      x += dx * dt;
      y += dy * dt;
      z += dz * dt;
    }

    for (let i = 0; i < pointsPerStrand; i++) {
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      x += dx * dt;
      y += dy * dt;
      z += dz * dt;

      positions[cursor * 3] = x;
      positions[cursor * 3 + 1] = y;
      positions[cursor * 3 + 2] = z;
      trailPhase[cursor] = i / pointsPerStrand;
      strandPhaseAttr[cursor] = strandPhase;

      minV.x = Math.min(minV.x, x); maxV.x = Math.max(maxV.x, x);
      minV.y = Math.min(minV.y, y); maxV.y = Math.max(maxV.y, y);
      minV.z = Math.min(minV.z, z); maxV.z = Math.max(maxV.z, z);
      cursor++;
    }
  }

  // Normalise the whole ensemble into a stable, roughly [-1.6, 1.6] frame.
  const center = new THREE.Vector3().addVectors(minV, maxV).multiplyScalar(0.5);
  const extent = Math.max(maxV.x - minV.x, maxV.y - minV.y, maxV.z - minV.z) || 1;
  const scale = 3.0 / extent;
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (positions[i * 3] - center.x) * scale;
    positions[i * 3 + 1] = (positions[i * 3 + 1] - center.y) * scale;
    positions[i * 3 + 2] = (positions[i * 3 + 2] - center.z) * scale;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aTrailPhase', new THREE.BufferAttribute(trailPhase, 1));
  geometry.setAttribute('aStrandPhase', new THREE.BufferAttribute(strandPhaseAttr, 1));

  const uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.1 : 1.0 },
    uFlow: { value: 0 }
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

  let flowAccumulator = 0;

  return {
    update({ delta, audio }) {
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;

      flowAccumulator += delta * (0.08 + audio.mid * 0.35) * uniforms.uMotion.value;
      uniforms.uFlow.value = flowAccumulator % 1;
      uniforms.uTime.value += delta;

      // Lateral parallax sway rather than a full orbit or a static frame.
      camera.position.x = Math.sin(uniforms.uTime.value * 0.12) * 0.6;
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
