import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a123 — Elastic Mass-Spring Lattice. A cubic lattice of point masses
// connected to their axis-aligned neighbours by damped Hookean springs
// (F = -k*(|d|-restLength)*dhat - damping*v), integrated with semi-implicit
// Euler every frame. Onset events inject an impulse at a random lattice node,
// producing genuine propagating elastic waves. PHYSICALLY_MODELLED.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040308);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(2.6, 2.0, 2.6);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const n = coarsePointer ? 9 : 13;
  const spacing = 2.6 / (n - 1);
  const count = n * n * n;

  const pos = new Float32Array(count * 3);
  const rest = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const idx = (x, y, z) => (x * n + y) * n + z;

  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
    const i = idx(x, y, z);
    const px = (x - (n - 1) / 2) * spacing;
    const py = (y - (n - 1) / 2) * spacing;
    const pz = (z - (n - 1) / 2) * spacing;
    pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;
    rest[i * 3] = px; rest[i * 3 + 1] = py; rest[i * 3 + 2] = pz;
  }

  const positions = new Float32Array(count * 3);
  const strain = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aStrain', new THREE.BufferAttribute(strain, 1));

  const uniforms = { uHigh: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const k = 40, damping = 3.0;
  const motion = reducedMotion ? 0.2 : 1.0;
  let sinceImpulse = 0;

  function applyImpulse() {
    const i = Math.floor(random() * count);
    vel[i * 3] += (random() - 0.5) * 3;
    vel[i * 3 + 1] += (random() - 0.5) * 3;
    vel[i * 3 + 2] += (random() - 0.5) * 3;
  }

  return {
    update({ delta, audio }) {
      uniforms.uHigh.value = audio.high;
      sinceImpulse += delta;
      if (audio.onset > 0.6 && sinceImpulse > 0.2) { applyImpulse(); sinceImpulse = 0; }

      const dt = Math.min(delta, 0.03) * motion;
      const kNow = k * (0.6 + audio.mid * 1.2);
      const neighbours = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
        const i = idx(x, y, z);
        let fx = -pos[i * 3] * 0.5 * (rest[i * 3] === 0 ? 0 : 0);
        let fy = 0, fz = 0;
        let maxStretch = 0;
        for (const [dx, dy, dz] of neighbours) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (nx < 0 || ny < 0 || nz < 0 || nx >= n || ny >= n || nz >= n) continue;
          const j = idx(nx, ny, nz);
          const ddx = pos[j * 3] - pos[i * 3], ddy = pos[j * 3 + 1] - pos[i * 3 + 1], ddz = pos[j * 3 + 2] - pos[i * 3 + 2];
          const restDx = rest[j * 3] - rest[i * 3], restDy = rest[j * 3 + 1] - rest[i * 3 + 1], restDz = rest[j * 3 + 2] - rest[i * 3 + 2];
          const restLen = Math.hypot(restDx, restDy, restDz);
          const len = Math.hypot(ddx, ddy, ddz) + 1e-6;
          const stretch = len - restLen;
          maxStretch = Math.max(maxStretch, Math.abs(stretch));
          fx += kNow * stretch * (ddx / len);
          fy += kNow * stretch * (ddy / len);
          fz += kNow * stretch * (ddz / len);
        }
        fx -= damping * vel[i * 3];
        fy -= damping * vel[i * 3 + 1];
        fz -= damping * vel[i * 3 + 2];
        vel[i * 3] += fx * dt; vel[i * 3 + 1] += fy * dt; vel[i * 3 + 2] += fz * dt;
        strain[i] = maxStretch * 4;
      }
      for (let i = 0; i < count; i++) {
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        positions[i * 3] = pos[i * 3]; positions[i * 3 + 1] = pos[i * 3 + 1]; positions[i * 3 + 2] = pos[i * 3 + 2];
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aStrain.needsUpdate = true;

      camera.position.x = 2.6 + Math.sin(performance.now() * 0.00003) * 0.6;
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
