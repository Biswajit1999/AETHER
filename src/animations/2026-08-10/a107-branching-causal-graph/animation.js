import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a107 — Branching Causal Graph. A directed tree of "event" nodes,
// each with a random number of causally-later children offset forward in a
// loose time axis, edges rendered as interpolated point trails carrying a
// travelling pulse of "causal influence" outward from the root event.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030906);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.6;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const maxDepth = coarsePointer ? 7 : 9;
  const pointsPerEdge = coarsePointer ? 10 : 18;

  const nodes = [{ x: 0, y: 0, z: 0, depth: 0 }];
  const edges = [];
  let frontier = [nodes[0]];
  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const parent of frontier) {
      const childCount = 1 + Math.floor(random() * 2.4);
      for (let c = 0; c < childCount; c++) {
        const angle = random() * Math.PI * 2;
        const spread = 0.35 + random() * 0.25;
        const child = {
          x: parent.x + Math.cos(angle) * spread,
          y: parent.y + Math.sin(angle) * spread,
          z: d * 0.42,
          depth: d
        };
        edges.push({ from: parent, to: child });
        next.push(child);
      }
    }
    nodes.push(...next);
    frontier = next;
    if (nodes.length > 2200) break;
  }

  const particleCount = edges.length * pointsPerEdge;
  const positions = new Float32Array(particleCount * 3);
  const depthPhase = new Float32Array(particleCount);
  const pulsePhase = new Float32Array(particleCount);
  let cursor = 0;
  edges.forEach((edge) => {
    for (let i = 0; i < pointsPerEdge; i++) {
      const t = i / (pointsPerEdge - 1);
      positions[cursor * 3] = edge.from.x + (edge.to.x - edge.from.x) * t - 1.2;
      positions[cursor * 3 + 1] = edge.from.y + (edge.to.y - edge.from.y) * t;
      positions[cursor * 3 + 2] = edge.from.z + (edge.to.z - edge.from.z) * t - maxDepth * 0.21;
      depthPhase[cursor] = edge.to.depth / maxDepth;
      pulsePhase[cursor] = edge.from.depth / maxDepth + t * (1 / maxDepth);
      cursor++;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, cursor * 3), 3));
  geometry.setAttribute('aDepthPhase', new THREE.BufferAttribute(depthPhase.subarray(0, cursor), 1));
  geometry.setAttribute('aPulsePhase', new THREE.BufferAttribute(pulsePhase.subarray(0, cursor), 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.12 : 1.0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    update({ time, audio }) {
      uniforms.uTime.value = time;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
      camera.position.x = Math.sin(time * 0.06) * 1.2;
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
