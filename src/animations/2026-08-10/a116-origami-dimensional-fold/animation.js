import vertexShader from './vertex.glsl?raw';
import fragmentShader from './fragment.glsl?raw';

// AETHER a116 — Origami Dimensional Fold. A flat grid is split into vertical
// panels at seeded crease lines; each panel rotates rigidly about its own
// hinge (a genuine per-panel rotation transform, alternating direction like
// an accordion fold), driven by a shared audio-modulated fold angle.
export function createAnimation(runtime) {
  const { THREE, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050308);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);
  camera.position.set(0, 1.5, 4.4);

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const panelCount = 7;
  const rows = coarsePointer ? 40 : 70;
  const colsPerPanel = coarsePointer ? 16 : 26;
  const panelWidth = 0.5;

  const particleCount = panelCount * colsPerPanel * rows;
  const positions = new Float32Array(particleCount * 3);
  const panelId = new Float32Array(particleCount);
  const hingeOffset = new Float32Array(particleCount);

  let cursor = 0;
  for (let panel = 0; panel < panelCount; panel++) {
    const hinge = (panel - panelCount / 2) * panelWidth;
    for (let cx = 0; cx < colsPerPanel; cx++) {
      for (let ry = 0; ry < rows; ry++) {
        const localX = (cx / colsPerPanel) * panelWidth;
        const y = ((ry / rows) - 0.5) * 3.0;
        positions[cursor * 3] = hinge + localX;
        positions[cursor * 3 + 1] = y;
        positions[cursor * 3 + 2] = 0;
        panelId[cursor] = panel;
        hingeOffset[cursor] = hinge;
        cursor++;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPanelId', new THREE.BufferAttribute(panelId, 1));
  geometry.setAttribute('aHingeOffset', new THREE.BufferAttribute(hingeOffset, 1));

  const uniforms = {
    uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uMotion: { value: reducedMotion ? 0.1 : 1.0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.NormalBlending
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    update({ time, audio }) {
      uniforms.uTime.value = time;
      uniforms.uBass.value = audio.bass;
      uniforms.uMid.value = audio.mid;
      uniforms.uHigh.value = audio.high;
      camera.position.x = Math.sin(time * 0.08) * 1.2 * uniforms.uMotion.value;
      camera.lookAt(0, 0, 0);
    },
    resize({ width, height }) { camera.aspect = width / height; camera.updateProjectionMatrix(); },
    render() { runtime.renderer.render(scene, camera); },
    dispose() { geometry.dispose(); material.dispose(); scene.remove(points); }
  };
}
