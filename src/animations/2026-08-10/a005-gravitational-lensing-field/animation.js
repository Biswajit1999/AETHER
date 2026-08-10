import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a005 — Gravitational-Lensing-Inspired Field.
//
// A fibonacci-sphere starfield swirls around a central mass point with a
// differential ("closer orbits faster") rotation rate and a bass-driven
// inward pull — a loose visual analogue of gravitational lensing / frame-
// dragging, not a general-relativistic light-bending calculation. Labelled
// SPECULATIVE_ARTISTIC accordingly.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05030a);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 100);
  camera.position.set(0, 0.2, 4.4);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const particleCount = coarsePointer ? 26000 : 60000;

  const positions = new Float32Array(particleCount * 3);
  const brightness = new Float32Array(particleCount);

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < particleCount; i++) {
    // Fibonacci-sphere shell, radius jittered per-point for depth.
    const yFrac = 1 - ((i + 0.5) / particleCount) * 2;
    const theta = Math.acos(Math.max(-1, Math.min(1, yFrac)));
    const phi = (i * goldenAngle) % (Math.PI * 2);
    const radius = 1.1 + Math.pow(random(), 0.6) * 2.6;

    positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
    positions[i * 3 + 1] = radius * Math.cos(theta);
    positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
    brightness[i] = random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));

  const uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.1 : 1.0 }
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

      // Fixed vantage point with a slow roll, deliberately without orbit or
      // dolly motion, so the lensing swirl itself reads as the only motion.
      camera.up.set(Math.sin(time * 0.03), Math.cos(time * 0.03), 0);
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
