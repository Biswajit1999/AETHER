import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a032 — Turing Reaction-Diffusion. A real Gray-Scott simulation
// (du = Du*Laplacian(u) - u*v^2 + F*(1-u), dv = Dv*Laplacian(v) + u*v^2 -
// (F+k)*v) is integrated on a toroidal grid at start-up, seeded with a few
// perturbed patches, until it settles into a Turing pattern. The pattern is
// then displayed as a static height/colour field with an audio-driven scan.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040608);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const gridSize = coarsePointer ? 72 : 108;

  let u = new Float32Array(gridSize * gridSize).fill(1);
  let v = new Float32Array(gridSize * gridSize).fill(0);

  const patches = 5;
  for (let p = 0; p < patches; p++) {
    const cx = Math.floor(random() * gridSize);
    const cy = Math.floor(random() * gridSize);
    const r = 3 + Math.floor(random() * 4);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = (cx + dx + gridSize) % gridSize;
        const y = (cy + dy + gridSize) % gridSize;
        u[y * gridSize + x] = 0.5;
        v[y * gridSize + x] = 0.25;
      }
    }
  }

  const Du = 0.16, Dv = 0.08;
  const F = 0.030 + random() * 0.02;
  const k = 0.058 + random() * 0.012;
  const dt = 1.0;

  function idx(x, y) {
    return ((y + gridSize) % gridSize) * gridSize + ((x + gridSize) % gridSize);
  }

  let uNext = new Float32Array(gridSize * gridSize);
  let vNext = new Float32Array(gridSize * gridSize);
  const steps = coarsePointer ? 1800 : 3200;

  for (let step = 0; step < steps; step++) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const i = idx(x, y);
        const lapU = u[idx(x - 1, y)] + u[idx(x + 1, y)] + u[idx(x, y - 1)] + u[idx(x, y + 1)] - 4 * u[i];
        const lapV = v[idx(x - 1, y)] + v[idx(x + 1, y)] + v[idx(x, y - 1)] + v[idx(x, y + 1)] - 4 * v[i];
        const uvv = u[i] * v[i] * v[i];
        uNext[i] = u[i] + (Du * lapU - uvv + F * (1 - u[i])) * dt;
        vNext[i] = v[i] + (Dv * lapV + uvv - (F + k) * v[i]) * dt;
      }
    }
    [u, uNext] = [uNext, u];
    [v, vNext] = [vNext, v];
  }

  const particleCount = gridSize * gridSize;
  const positions = new Float32Array(particleCount * 3);
  const concentration = new Float32Array(particleCount);
  const gridPhase = new Float32Array(particleCount);
  const spacing = 3.0 / gridSize;
  const half = (gridSize - 1) / 2;

  let cursor = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      positions[cursor * 3] = (x - half) * spacing;
      positions[cursor * 3 + 1] = (y - half) * spacing;
      positions[cursor * 3 + 2] = 0;
      concentration[cursor] = Math.min(1, Math.max(0, v[y * gridSize + x] * 2.2));
      gridPhase[cursor] = (x + y) / (gridSize * 2);
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aConcentration', new THREE.BufferAttribute(concentration, 1));
  geometry.setAttribute('aGridPhase', new THREE.BufferAttribute(gridPhase, 1));

  const uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.15 : 1.0 }
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

  return {
    update({ time, audio }) {
      uniforms.uTime.value = time;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;

      const orbitRadius = 3.4;
      const drift = time * 0.05 * uniforms.uMotion.value;
      camera.position.set(Math.cos(drift) * orbitRadius, 1.6 + Math.sin(drift * 0.5) * 0.4, Math.sin(drift) * orbitRadius);
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
