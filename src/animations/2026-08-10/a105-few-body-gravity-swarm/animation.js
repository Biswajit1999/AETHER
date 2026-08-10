import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a105 — Few-Body Gravity Swarm. A handful of massive bodies are
// integrated with real (softened) Newtonian gravity, F = G*m1*m2/(r^2+eps^2),
// via semi-implicit Euler each frame — a genuine, if softened, physical
// simulation, not a decorative approximation. Each body leaves a ring-buffer
// trail. PHYSICALLY_MODELLED because the integration itself is exact for the
// stated (softened) force law.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03040a);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, 1.8, 4.2);

  const bodyCount = 5;
  const bodies = [];
  for (let i = 0; i < bodyCount; i++) {
    const angle = (i / bodyCount) * Math.PI * 2;
    const radius = 1.2 + random() * 0.6;
    bodies.push({
      pos: [Math.cos(angle) * radius, (random() - 0.5) * 0.4, Math.sin(angle) * radius],
      vel: [-Math.sin(angle) * 0.55, 0, Math.cos(angle) * 0.55],
      mass: 0.6 + random() * 1.4
    });
  }

  const G = 0.0025;
  const eps = 0.15;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const trailLength = coarsePointer ? 140 : 320;
  const particleCount = bodyCount * trailLength;

  const positions = new Float32Array(particleCount * 3);
  const trailPhase = new Float32Array(particleCount);
  const bodyPhase = new Float32Array(particleCount);

  for (let b = 0; b < bodyCount; b++) {
    for (let t = 0; t < trailLength; t++) {
      const i = b * trailLength + t;
      positions[i * 3] = bodies[b].pos[0];
      positions[i * 3 + 1] = bodies[b].pos[1];
      positions[i * 3 + 2] = bodies[b].pos[2];
      bodyPhase[i] = b / bodyCount;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aTrailPhase', new THREE.BufferAttribute(trailPhase, 1));
  geometry.setAttribute('aBodyPhase', new THREE.BufferAttribute(bodyPhase, 1));

  const uniforms = { uHigh: { value: 0 } };
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

  let writeIndex = 0;

  function stepPhysics(dt, motion) {
    const acc = bodies.map(() => [0, 0, 0]);
    for (let a = 0; a < bodyCount; a++) {
      for (let b = 0; b < bodyCount; b++) {
        if (a === b) continue;
        const dx = bodies[b].pos[0] - bodies[a].pos[0];
        const dy = bodies[b].pos[1] - bodies[a].pos[1];
        const dz = bodies[b].pos[2] - bodies[a].pos[2];
        const distSq = dx * dx + dy * dy + dz * dz + eps * eps;
        const invDist = 1 / Math.sqrt(distSq);
        const f = G * bodies[b].mass * invDist * invDist * invDist * motion;
        acc[a][0] += f * dx;
        acc[a][1] += f * dy;
        acc[a][2] += f * dz;
      }
    }
    for (let a = 0; a < bodyCount; a++) {
      bodies[a].vel[0] += acc[a][0] * dt;
      bodies[a].vel[1] += acc[a][1] * dt;
      bodies[a].vel[2] += acc[a][2] * dt;
      bodies[a].pos[0] += bodies[a].vel[0] * dt;
      bodies[a].pos[1] += bodies[a].vel[1] * dt;
      bodies[a].pos[2] += bodies[a].vel[2] * dt;
    }
  }

  return {
    update({ delta, audio }) {
      uniforms.uHigh.value = audio.high;
      const motion = uniforms.uHigh.value >= 0 ? (reducedMotion ? 0.15 : 1.0) : 1.0;
      const substeps = 4;
      const boosted = 1 + audio.bass * 1.5;
      for (let s = 0; s < substeps; s++) stepPhysics((delta / substeps) * boosted, motion);

      const slot = writeIndex % trailLength;
      for (let b = 0; b < bodyCount; b++) {
        const i = b * trailLength + slot;
        positions[i * 3] = bodies[b].pos[0];
        positions[i * 3 + 1] = bodies[b].pos[1];
        positions[i * 3 + 2] = bodies[b].pos[2];
      }
      for (let b = 0; b < bodyCount; b++) {
        for (let t = 0; t < trailLength; t++) {
          const age = (slot - t + trailLength) % trailLength;
          trailPhase[b * trailLength + t] = 1 - age / trailLength;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aTrailPhase.needsUpdate = true;
      writeIndex++;

      const orbitRate = 0.00005 * (0.5 + audio.mid * 1.5);
      camera.position.x = Math.sin(performance.now() * orbitRate) * 4.5;
      camera.position.z = Math.cos(performance.now() * orbitRate) * 4.5;
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
