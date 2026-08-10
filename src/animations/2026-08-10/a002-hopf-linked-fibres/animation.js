import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a002 — Hopf-Linked Fibres.
//
// Topology: each "fibre" is a circle in R3 obtained by stereographically
// projecting a genuine Hopf fibre of S3 (unit quaternions (a,b,c,d) with
// a=sin(theta/2)cos(phi), b=sin(theta/2)sin(phi), c=cos(theta/2)cos(t),
// d=cos(theta/2)sin(t), projected as (a,b,c)/(1-d)). Different base points
// (theta, phi) on S2 give fibres that are mutually linked, the defining
// visual signature of the Hopf fibration. This is a genuine mathematical
// construction, simplified for performance — it is not a physical simulation,
// hence MATHEMATICALLY_INSPIRED rather than PHYSICALLY_MODELLED.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030309);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const fiberCount = coarsePointer ? 160 : 420;
  const pointsPerFiber = coarsePointer ? 48 : 96;
  const particleCount = fiberCount * pointsPerFiber;

  const positions = new Float32Array(particleCount * 3);
  const fiberPhase = new Float32Array(particleCount);
  const pointPhase = new Float32Array(particleCount);

  let cursor = 0;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let f = 0; f < fiberCount; f++) {
    // Fibonacci-sphere stratified base points on S2, avoiding the exact poles
    // where the stereographic denominator (1 - d) can approach zero.
    const yFrac = 1 - ((f + 0.5) / fiberCount) * 2;
    const theta = Math.acos(Math.max(-0.999, Math.min(0.999, yFrac)));
    const phi = (f * goldenAngle + random() * 0.05) % (Math.PI * 2);

    const sinHalfTheta = Math.sin(theta / 2);
    const cosHalfTheta = Math.cos(theta / 2);
    const a = sinHalfTheta * Math.cos(phi);
    const b = sinHalfTheta * Math.sin(phi);

    const fPhase = f / fiberCount;

    for (let i = 0; i < pointsPerFiber; i++) {
      const t = (i / pointsPerFiber) * Math.PI * 2;
      const c = cosHalfTheta * Math.cos(t);
      const d = cosHalfTheta * Math.sin(t);
      const denom = Math.max(0.08, 1 - d);

      positions[cursor * 3] = (a / denom) * 0.9;
      positions[cursor * 3 + 1] = (b / denom) * 0.9;
      positions[cursor * 3 + 2] = (c / denom) * 0.9;
      fiberPhase[cursor] = fPhase;
      pointPhase[cursor] = i / pointsPerFiber;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aFiberPhase', new THREE.BufferAttribute(fiberPhase, 1));
  geometry.setAttribute('aPointPhase', new THREE.BufferAttribute(pointPhase, 1));

  const uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.12 : 1.0 },
    uEnvelope: { value: 0.5 }
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
      // Slow birth -> entangle -> collapse -> rebirth breathing cycle (~63s).
      uniforms.uEnvelope.value = 0.5 + 0.5 * Math.sin(time * 0.1);

      // Slow orbiting camera drift instead of a fixed frame with a spinning object.
      const orbitRadius = 3.1;
      const drift = time * 0.05 * uniforms.uMotion.value;
      camera.position.set(
        Math.cos(drift) * orbitRadius,
        Math.sin(drift * 0.6) * 0.9,
        Math.sin(drift) * orbitRadius
      );
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
