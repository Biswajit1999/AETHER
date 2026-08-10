import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a109 — Vacuum Bubble Nucleation. Many spherical "bubbles" nucleate
// at seeded random moments and locations, each expanding as a thin shell of
// points from its birth point before fading — a speculative-artistic nod to
// false-vacuum bubble nucleation imagery, not a physical field simulation.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05020a);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 100);
  camera.position.z = 4.2;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const bubbleCount = coarsePointer ? 10 : 22;
  const pointsPerBubble = coarsePointer ? 260 : 520;
  const particleCount = bubbleCount * pointsPerBubble;

  const positions = new Float32Array(particleCount * 3);
  const bubbleId = new Float32Array(particleCount);
  const birthTime = new Float32Array(particleCount);
  const direction = new Float32Array(particleCount * 3);

  let cursor = 0;
  for (let b = 0; b < bubbleCount; b++) {
    const centre = [(random() - 0.5) * 3.0, (random() - 0.5) * 2.0, (random() - 0.5) * 2.5];
    const birth = random() * 9.0;
    for (let i = 0; i < pointsPerBubble; i++) {
      const theta = Math.acos(2 * random() - 1);
      const phi = random() * Math.PI * 2;
      const dir = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
      positions[cursor * 3] = centre[0];
      positions[cursor * 3 + 1] = centre[1];
      positions[cursor * 3 + 2] = centre[2];
      direction[cursor * 3] = dir[0]; direction[cursor * 3 + 1] = dir[1]; direction[cursor * 3 + 2] = dir[2];
      bubbleId[cursor] = b / bubbleCount;
      birthTime[cursor] = birth;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBubbleId', new THREE.BufferAttribute(bubbleId, 1));
  geometry.setAttribute('aBirthTime', new THREE.BufferAttribute(birthTime, 1));
  geometry.setAttribute('aDirection', new THREE.BufferAttribute(direction, 3));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.15 : 1.0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  return {
    update({ time, audio }) {
      uniforms.uTime.value = time;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
      camera.position.x = Math.sin(time * 0.04) * 0.8;
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
