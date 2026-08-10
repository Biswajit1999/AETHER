import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a104 — Poincaré Disk Hyperbolic Tree. Points are placed by composing
// genuine Poincaré-disk Möbius translations z' = (z+a)/(1+conj(a)z) along a
// branching Cayley-tree-like generator set, the defining construction behind
// hyperbolic tilings: exponential branch growth crowds toward the unit-disk
// boundary, the classic visual signature of hyperbolic space. It is a tree,
// not a rigorous regular {p,q} tiling — described accordingly.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05040a);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 3.4;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const depth = coarsePointer ? 8 : 10;
  const branchFactor = 3;
  const stepR = 0.55;
  const pointsPerEdge = coarsePointer ? 8 : 14;

  function mobiusTranslate(z, a) {
    const numRe = z[0] + a[0], numIm = z[1] + a[1];
    const conjARe = a[0], conjAIm = -a[1];
    const denRe = 1 + conjARe * z[0] - conjAIm * z[1];
    const denIm = conjARe * z[1] + conjAIm * z[0];
    const denSq = denRe * denRe + denIm * denIm;
    return [(numRe * denRe + numIm * denIm) / denSq, (numIm * denRe - numRe * denIm) / denSq];
  }

  const generators = [];
  for (let i = 0; i < branchFactor; i++) {
    const theta = (i / branchFactor) * Math.PI * 2 + random() * 0.2;
    generators.push([Math.cos(theta) * stepR, Math.sin(theta) * stepR]);
  }

  const edges = [];
  function grow(z, level, cameFrom) {
    if (level >= depth) return;
    for (let g = 0; g < branchFactor; g++) {
      if (g === cameFrom) continue;
      const child = mobiusTranslate(z, generators[g]);
      const mag = Math.hypot(child[0], child[1]);
      if (mag >= 0.985) continue;
      edges.push({ from: z, to: child, level: level + 1 });
      grow(child, level + 1, g);
    }
  }
  grow([0, 0], 0, -1);

  const particleCount = edges.length * pointsPerEdge;
  const positions = new Float32Array(particleCount * 3);
  const depthPhase = new Float32Array(particleCount);
  const edgePhase = new Float32Array(particleCount);
  const scale = 3.0;

  let cursor = 0;
  edges.forEach((edge, ei) => {
    for (let i = 0; i < pointsPerEdge; i++) {
      const t = i / (pointsPerEdge - 1);
      positions[cursor * 3] = (edge.from[0] + (edge.to[0] - edge.from[0]) * t) * scale;
      positions[cursor * 3 + 1] = (edge.from[1] + (edge.to[1] - edge.from[1]) * t) * scale;
      positions[cursor * 3 + 2] = 0;
      depthPhase[cursor] = edge.level / depth;
      edgePhase[cursor] = ei / edges.length;
      cursor++;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, cursor * 3), 3));
  geometry.setAttribute('aDepthPhase', new THREE.BufferAttribute(depthPhase.subarray(0, cursor), 1));
  geometry.setAttribute('aEdgePhase', new THREE.BufferAttribute(edgePhase.subarray(0, cursor), 1));

  const uniforms = {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.12 : 1.0 }
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
      camera.position.z = 3.4 + Math.sin(time * 0.06) * 0.5 * uniforms.uMotion.value;
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
