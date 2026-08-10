import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a129 — L-System Branching Timeline. A genuine Lindenmayer-system
// string is rewritten from an axiom ("F") using the classic fractal-plant
// production rule F -> FF+[+F-F-F]-[-F+F+F], then turtle-interpreted in 3D
// (each branch adds a small seeded roll rotation out of plane), producing a
// deterministic branching tree read here as diverging "timelines".
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040308);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);
  camera.position.set(0, 0.8, 5.2);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const iterations = coarsePointer ? 3 : 4;
  const pointsPerSegment = coarsePointer ? 8 : 14;

  let str = 'F';
  const rule = 'FF+[+F-F-F]-[-F+F+F]';
  for (let i = 0; i < iterations; i++) str = str.split('F').join(rule);

  const angle = 0.45;
  const stepLen = 0.16;
  let pos = new THREE.Vector3(0, -1.6, 0);
  let dir = new THREE.Vector3(0, 1, 0);
  let roll = 0;
  const stack = [];
  const segments = [];
  const up = new THREE.Vector3(0, 0, 1);

  for (const ch of str) {
    if (ch === 'F') {
      const rolled = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), roll * 0.15);
      const next = pos.clone().add(rolled.clone().multiplyScalar(stepLen));
      segments.push({ from: pos.clone(), to: next.clone(), depth: stack.length });
      pos = next;
      dir = rolled;
      roll += random() * 2 - 1;
    } else if (ch === '+') {
      dir.applyAxisAngle(up, angle);
    } else if (ch === '-') {
      dir.applyAxisAngle(up, -angle);
    } else if (ch === '[') {
      stack.push({ pos: pos.clone(), dir: dir.clone(), roll });
    } else if (ch === ']') {
      const s = stack.pop();
      if (s) { pos = s.pos; dir = s.dir; roll = s.roll; }
    }
    if (segments.length > 26000) break;
  }

  const particleCount = segments.length * pointsPerSegment;
  const positions = new Float32Array(particleCount * 3);
  const branchPhase = new Float32Array(particleCount);
  const flickerSeed = new Float32Array(particleCount);

  let maxDepth = 1;
  for (const s of segments) maxDepth = Math.max(maxDepth, s.depth);

  let cursor = 0;
  for (const s of segments) {
    for (let i = 0; i < pointsPerSegment; i++) {
      const t = i / pointsPerSegment;
      positions[cursor * 3] = s.from.x + (s.to.x - s.from.x) * t;
      positions[cursor * 3 + 1] = s.from.y + (s.to.y - s.from.y) * t;
      positions[cursor * 3 + 2] = s.from.z + (s.to.z - s.from.z) * t;
      branchPhase[cursor] = s.depth / maxDepth;
      flickerSeed[cursor] = random();
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, cursor * 3), 3));
  geometry.setAttribute('aBranchPhase', new THREE.BufferAttribute(branchPhase.subarray(0, cursor), 1));
  geometry.setAttribute('aFlickerSeed', new THREE.BufferAttribute(flickerSeed.subarray(0, cursor), 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.1 : 1.0 }
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
      camera.position.x = Math.sin(time * 0.06) * 1.4 * uniforms.uMotion.value;
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
