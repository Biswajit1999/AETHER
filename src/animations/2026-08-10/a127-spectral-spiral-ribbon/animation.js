import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a127 — Spectral Spiral Ribbon. Points lie along a logarithmic
// spiral, r = a*e^(b*theta), split into three interleaved bands, each band
// wired to a different audio frequency range (bass/mid/high) so the ribbon's
// three colour-coded strands pulse independently along its own length.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030209);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.2;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const turns = 5;
  const pointsPerBand = coarsePointer ? 3000 : 7000;
  const particleCount = pointsPerBand * 3;
  const a = 0.05, b = 0.18;

  const positions = new Float32Array(particleCount * 3);
  const bandId = new Float32Array(particleCount);
  const arcPhase = new Float32Array(particleCount);

  let cursor = 0;
  for (let band = 0; band < 3; band++) {
    for (let i = 0; i < pointsPerBand; i++) {
      const t = i / pointsPerBand;
      const theta = t * turns * Math.PI * 2;
      const r = a * Math.exp(b * theta);
      const bandOffset = (band - 1) * 0.15;
      positions[cursor * 3] = r * Math.cos(theta);
      positions[cursor * 3 + 1] = bandOffset + (random() - 0.5) * 0.03;
      positions[cursor * 3 + 2] = r * Math.sin(theta);
      bandId[cursor] = band;
      arcPhase[cursor] = t;
      cursor++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBandId', new THREE.BufferAttribute(bandId, 1));
  geometry.setAttribute('aArcPhase', new THREE.BufferAttribute(arcPhase, 1));

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
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
