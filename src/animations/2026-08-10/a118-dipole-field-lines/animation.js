import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a118 — Dipole Field Lines. Uses the exact closed-form magnetic-
// dipole field-line equation r = r0 * sin^2(theta) in spherical coordinates:
// for each field line (fixed r0, fixed azimuth), theta is swept and r
// computed directly from the equation, then converted to Cartesian. This is
// PHYSICALLY_MODELLED — the field lines are exact for an ideal dipole.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030409);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.z = 4.6;

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const lineCount = coarsePointer ? 18 : 36;
  const pointsPerLine = coarsePointer ? 90 : 160;
  const particleCount = lineCount * pointsPerLine * 2;

  const positions = new Float32Array(particleCount * 3);
  const linePhase = new Float32Array(particleCount);
  const flowPhase = new Float32Array(particleCount);

  let cursor = 0;
  for (let l = 0; l < lineCount; l++) {
    const azimuth = (l / lineCount) * Math.PI * 2;
    const r0 = 0.5 + (l % 4) * 0.28;
    for (let pole = 0; pole < 2; pole++) {
      for (let i = 0; i < pointsPerLine; i++) {
        const theta = 0.06 + (i / (pointsPerLine - 1)) * (Math.PI - 0.12);
        const r = r0 * Math.sin(theta) * Math.sin(theta);
        const thetaSigned = pole === 0 ? theta : Math.PI - theta;
        const x = r * Math.sin(thetaSigned) * Math.cos(azimuth);
        const y = r * Math.cos(thetaSigned);
        const z = r * Math.sin(thetaSigned) * Math.sin(azimuth);
        positions[cursor * 3] = x;
        positions[cursor * 3 + 1] = y;
        positions[cursor * 3 + 2] = z;
        linePhase[cursor] = l / lineCount;
        flowPhase[cursor] = i / pointsPerLine;
        cursor++;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLinePhase', new THREE.BufferAttribute(linePhase, 1));
  geometry.setAttribute('aFlowPhase', new THREE.BufferAttribute(flowPhase, 1));

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
      points.rotation.y = time * (0.05 + audio.bass * 0.08) * uniforms.uMotion.value;
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
