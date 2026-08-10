import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a031 — Tesseract Edge Frame. A genuine 4D hypercube (16 vertices in
// {-1,1}^4, edges between vertices differing in exactly one coordinate) is
// rotated in two independent 4D planes (xw, yz) directly in the vertex
// shader, then perspective-projected to 3D. MATHEMATICALLY_INSPIRED: the
// rotation and projection are exact, but nothing here claims physical reality.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030308);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.0;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const pointsPerEdge = coarsePointer ? 90 : 240;

  const vertices4 = [];
  for (let i = 0; i < 16; i++) {
    vertices4.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1
    ]);
  }
  const edges = [];
  for (let a = 0; a < 16; a++) {
    for (let b = a + 1; b < 16; b++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) if (vertices4[a][k] !== vertices4[b][k]) diff++;
      if (diff === 1) edges.push([a, b]);
    }
  }

  const particleCount = edges.length * pointsPerEdge;
  const point4 = new Float32Array(particleCount * 4);
  const edgePhase = new Float32Array(particleCount);

  let cursor = 0;
  edges.forEach(([a, b], edgeIndex) => {
    const va = vertices4[a];
    const vb = vertices4[b];
    const jitter = (random() - 0.5) * 0.02;
    for (let i = 0; i < pointsPerEdge; i++) {
      const t = i / (pointsPerEdge - 1);
      for (let k = 0; k < 4; k++) {
        point4[cursor * 4 + k] = va[k] + (vb[k] - va[k]) * t + jitter;
      }
      edgePhase[cursor] = edgeIndex / edges.length;
      cursor++;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('aPoint4', new THREE.BufferAttribute(point4, 4));
  geometry.setAttribute('aEdgePhase', new THREE.BufferAttribute(edgePhase, 1));
  // Three.js needs a `position` attribute for bounding computations; itemSize 3 dummy.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));

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
  points.frustumCulled = false;
  scene.add(points);

  return {
    update({ time, audio }) {
      uniforms.uTime.value = time;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
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
