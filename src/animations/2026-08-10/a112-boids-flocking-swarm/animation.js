import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a112 — Boids Flocking Swarm. A genuine Reynolds boids simulation
// (separation + alignment + cohesion, each with its own radius and weight)
// integrated every frame in JS, seeded initial positions/velocities.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020508);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 5.0;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const agentCount = coarsePointer ? 260 : 620;

  const pos = new Float32Array(agentCount * 3);
  const vel = new Float32Array(agentCount * 3);
  for (let i = 0; i < agentCount; i++) {
    pos[i * 3] = (random() - 0.5) * 3;
    pos[i * 3 + 1] = (random() - 0.5) * 3;
    pos[i * 3 + 2] = (random() - 0.5) * 3;
    vel[i * 3] = (random() - 0.5) * 0.4;
    vel[i * 3 + 1] = (random() - 0.5) * 0.4;
    vel[i * 3 + 2] = (random() - 0.5) * 0.4;
  }

  const positions = new Float32Array(agentCount * 3);
  const agentPhase = new Float32Array(agentCount);
  for (let i = 0; i < agentCount; i++) agentPhase[i] = i / agentCount;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAgentPhase', new THREE.BufferAttribute(agentPhase, 1));

  const uniforms = { uHigh: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const motion = reducedMotion ? 0.2 : 1.0;

  function step(dt, cohesionPull, alignWeight) {
    const sepR = 0.28, aliR = 0.6, cohR = 0.9;
    for (let i = 0; i < agentCount; i++) {
      let sepX = 0, sepY = 0, sepZ = 0;
      let aliX = 0, aliY = 0, aliZ = 0, aliN = 0;
      let cohX = 0, cohY = 0, cohZ = 0, cohN = 0;
      const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
      for (let j = 0; j < agentCount; j++) {
        if (i === j) continue;
        const dx = pos[j * 3] - ix, dy = pos[j * 3 + 1] - iy, dz = pos[j * 3 + 2] - iz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-5;
        if (d < sepR) { sepX -= dx / d; sepY -= dy / d; sepZ -= dz / d; }
        if (d < aliR) { aliX += vel[j * 3]; aliY += vel[j * 3 + 1]; aliZ += vel[j * 3 + 2]; aliN++; }
        if (d < cohR) { cohX += pos[j * 3]; cohY += pos[j * 3 + 1]; cohZ += pos[j * 3 + 2]; cohN++; }
      }
      let ax = sepX * 1.6, ay = sepY * 1.6, az = sepZ * 1.6;
      if (aliN > 0) { ax += (aliX / aliN - vel[i * 3]) * alignWeight; ay += (aliY / aliN - vel[i * 3 + 1]) * alignWeight; az += (aliZ / aliN - vel[i * 3 + 2]) * alignWeight; }
      if (cohN > 0) { ax += (cohX / cohN - ix) * cohesionPull; ay += (cohY / cohN - iy) * cohesionPull; az += (cohZ / cohN - iz) * cohesionPull; }
      // Mild pull toward origin so the flock stays on screen.
      ax += -ix * 0.05; ay += -iy * 0.05; az += -iz * 0.05;

      vel[i * 3] += ax * dt; vel[i * 3 + 1] += ay * dt; vel[i * 3 + 2] += az * dt;
      const speed = Math.hypot(vel[i * 3], vel[i * 3 + 1], vel[i * 3 + 2]);
      const maxSpeed = 1.4;
      if (speed > maxSpeed) { vel[i * 3] *= maxSpeed / speed; vel[i * 3 + 1] *= maxSpeed / speed; vel[i * 3 + 2] *= maxSpeed / speed; }
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      positions[i * 3] = pos[i * 3]; positions[i * 3 + 1] = pos[i * 3 + 1]; positions[i * 3 + 2] = pos[i * 3 + 2];
    }
  }

  return {
    update({ delta, audio }) {
      uniforms.uHigh.value = audio.high;
      step(Math.min(delta, 0.05) * motion, 0.3 + audio.bass * 0.6, 0.3 + audio.mid * 0.9);
      geometry.attributes.position.needsUpdate = true;
      camera.position.x = Math.sin(performance.now() * 0.00004) * 5.5;
      camera.position.z = Math.cos(performance.now() * 0.00004) * 5.5;
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
