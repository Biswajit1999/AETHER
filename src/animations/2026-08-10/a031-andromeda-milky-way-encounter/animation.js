import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { centreSeparation, integrateCentres, TWO_GALAXY_UNITS } from '../../../physics/two-galaxy-model.js';

const GYR_PER_UNIT = TWO_GALAXY_UNITS.timeGyr;
const KPC_PER_UNIT = TWO_GALAXY_UNITS.lengthKpc;
const FIXED_STEP = 0.006;
const RESET_AFTER_GYR = 8.8;
const TAU = Math.PI * 2;

const vertexShader = `
precision highp float;
attribute float aGalaxy;
attribute float aLuminosity;
uniform float uScale;
uniform float uHigh;
varying float vGalaxy;
varying float vLuminosity;
void main() {
  vec4 mv = modelViewMatrix * vec4(position * uScale, 1.0);
  float size = mix(2.6, 6.4, aLuminosity) + uHigh * 1.8;
  gl_PointSize = clamp(size * (5.0 / max(0.35, -mv.z)), 1.0, 11.0);
  gl_Position = projectionMatrix * mv;
  vGalaxy = aGalaxy;
  vLuminosity = aLuminosity;
}`;

const fragmentShader = `
precision highp float;
uniform vec3 uMilkyWay;
uniform vec3 uAndromeda;
uniform float uEnergy;
varying float vGalaxy;
varying float vLuminosity;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  if (d > 0.5) discard;
  float halo = exp(-13.0 * d * d);
  float core = exp(-72.0 * d * d);
  vec3 colour = mix(uMilkyWay, uAndromeda, vGalaxy);
  colour *= 0.58 + vLuminosity * 0.78 + uEnergy * 0.16;
  colour += core * (0.45 + vLuminosity * 0.4);
  gl_FragColor = vec4(colour, halo * (0.075 + vLuminosity * 0.16));
}`;

function rotateVector(x, y, z, tilt, yaw) {
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const y1 = y * ct - z * st;
  const z1 = y * st + z * ct;
  return [x * cy + z1 * sy, y1, -x * sy + z1 * cy];
}

export function createAnimation(runtime) {
  const { THREE, renderer, canvas, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01030b);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 80);
  camera.position.set(0.15, 2.55, 7.1);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.055;
  orbit.enablePan = false;
  orbit.minDistance = 2.1;
  orbit.maxDistance = 12;
  orbit.zoomToCursor = true;
  orbit.autoRotate = true;
  orbit.autoRotateSpeed = 0.13;
  orbit.saveState();

  const mobile = window.matchMedia('(pointer: coarse)').matches;
  const count = mobile ? 6200 : 14800;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const galaxies = new Float32Array(count);
  const luminosity = new Float32Array(count);

  const relativePosition = [3.55, 0.32, 0.26];
  const relativeVelocity = [-0.49, 0.32, -0.025];
  const totalMass = 2.5;
  const centres = [
    {
      name: 'Milky Way',
      mass: 1.1,
      position: new Float64Array(relativePosition.map((value) => -value * 1.4 / totalMass)),
      velocity: new Float64Array(relativeVelocity.map((value) => -value * 1.4 / totalMass))
    },
    {
      name: 'Andromeda',
      mass: 1.4,
      position: new Float64Array(relativePosition.map((value) => value * 1.1 / totalMass)),
      velocity: new Float64Array(relativeVelocity.map((value) => value * 1.1 / totalMass))
    }
  ];

  function seedDisk(index, galaxyIndex) {
    const centre = centres[galaxyIndex];
    const base = index * 3;
    const isBulge = random() < 0.13;
    const radialScale = galaxyIndex ? 0.17 : 0.15;
    const radius = isBulge
      ? 0.025 + Math.pow(random(), 1.9) * 0.14
      : Math.min(0.49, 0.035 - Math.log(Math.max(1e-5, 1 - random())) * radialScale);
    const arm = index % (galaxyIndex ? 3 : 4);
    const arms = galaxyIndex ? 3 : 4;
    const angle = arm / arms * TAU + radius * (galaxyIndex ? 12.5 : -13.5) + (random() - 0.5) * (isBulge ? 2.2 : 0.42);
    const height = (random() + random() + random() - 1.5) * (isBulge ? 0.1 : 0.026 + radius * 0.025);
    const tilt = galaxyIndex ? 0.58 : -0.24;
    const yaw = galaxyIndex ? -0.42 : 0.18;
    const local = rotateVector(radius * Math.cos(angle), height, radius * Math.sin(angle), tilt, yaw);
    const softening = 0.055;
    const circularSpeed = Math.sqrt(centre.mass * radius * radius / Math.pow(radius * radius + softening * softening, 1.5));
    const tangent = rotateVector(-Math.sin(angle) * circularSpeed, 0, Math.cos(angle) * circularSpeed, tilt, yaw);

    positions[base] = centre.position[0] + local[0];
    positions[base + 1] = centre.position[1] + local[1];
    positions[base + 2] = centre.position[2] + local[2];
    velocities[base] = centre.velocity[0] + tangent[0] + (random() - 0.5) * 0.018;
    velocities[base + 1] = centre.velocity[1] + tangent[1] + (random() - 0.5) * 0.018;
    velocities[base + 2] = centre.velocity[2] + tangent[2] + (random() - 0.5) * 0.018;
    galaxies[index] = galaxyIndex;
    luminosity[index] = Math.min(1, (isBulge ? 0.7 : 0.18) + random() * 0.55);
  }

  for (let index = 0; index < count; index += 1) seedDisk(index, index % 2);

  const initialPositions = positions.slice();
  const initialVelocities = velocities.slice();
  const initialCentres = centres.map((centre) => ({ position: centre.position.slice(), velocity: centre.velocity.slice() }));

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('aGalaxy', new THREE.BufferAttribute(galaxies, 1));
  geometry.setAttribute('aLuminosity', new THREE.BufferAttribute(luminosity, 1));

  const controls = { speed: 0.08, scale: 1, glow: 1.15, paletteA: '#69bfff', paletteB: '#ff936b' };
  const uniforms = {
    uScale: { value: controls.scale },
    uHigh: { value: 0 },
    uEnergy: { value: 0 },
    uMilkyWay: { value: new THREE.Color(controls.paletteA) },
    uAndromeda: { value: new THREE.Color(controls.paletteB) }
  };
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  scene.add(stars);

  const coreGeometry = new THREE.SphereGeometry(0.016, 14, 10);
  const coreMaterials = [new THREE.MeshBasicMaterial({ color: 0xbde7ff }), new THREE.MeshBasicMaterial({ color: 0xffd1ad })];
  const coreMeshes = centres.map((centre, index) => {
    const core = new THREE.Mesh(coreGeometry, coreMaterials[index]);
    core.position.fromArray(centre.position);
    scene.add(core);
    return core;
  });

  const backgroundCount = mobile ? 500 : 1300;
  const backgroundPositions = new Float32Array(backgroundCount * 3);
  for (let index = 0; index < backgroundCount; index += 1) {
    const radius = 9 + random() * 14;
    const phi = Math.acos(random() * 2 - 1);
    const theta = random() * TAU;
    backgroundPositions.set([radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)], index * 3);
  }
  const backgroundGeometry = new THREE.BufferGeometry();
  backgroundGeometry.setAttribute('position', new THREE.BufferAttribute(backgroundPositions, 3));
  const backgroundMaterial = new THREE.PointsMaterial({ color: 0x91a9d8, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false });
  scene.add(new THREE.Points(backgroundGeometry, backgroundMaterial));

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), controls.glow * 0.42, 0.38, 0.28);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const readout = document.createElement('div');
  readout.className = 'physics-readout';
  readout.setAttribute('aria-live', 'off');
  canvas.parentElement?.appendChild(readout);

  let elapsedUnits = 0;
  let accumulator = 0;
  let mergedAt = null;

  function resetSimulation() {
    positions.set(initialPositions);
    velocities.set(initialVelocities);
    centres.forEach((centre, index) => {
      centre.position.set(initialCentres[index].position);
      centre.velocity.set(initialCentres[index].velocity);
    });
    positionAttribute.needsUpdate = true;
    elapsedUnits = 0;
    accumulator = 0;
    mergedAt = null;
  }

  function integrate(dt) {
    integrateCentres(centres, dt);

    const tracerSoftening2 = 0.052 * 0.052;
    for (let index = 0; index < count; index += 1) {
      const base = index * 3;
      let ax = 0;
      let ay = 0;
      let az = 0;
      for (let galaxyIndex = 0; galaxyIndex < 2; galaxyIndex += 1) {
        const centre = centres[galaxyIndex];
        const dx = centre.position[0] - positions[base];
        const dy = centre.position[1] - positions[base + 1];
        const dz = centre.position[2] - positions[base + 2];
        const invR3 = 1 / Math.pow(dx * dx + dy * dy + dz * dz + tracerSoftening2, 1.5);
        ax += centre.mass * dx * invR3;
        ay += centre.mass * dy * invR3;
        az += centre.mass * dz * invR3;
      }
      velocities[base] += ax * dt;
      velocities[base + 1] += ay * dt;
      velocities[base + 2] += az * dt;
      positions[base] += velocities[base] * dt;
      positions[base + 1] += velocities[base + 1] * dt;
      positions[base + 2] += velocities[base + 2] * dt;
    }

    elapsedUnits += dt;
    const distance = centreSeparation(centres[0], centres[1]);
    if (distance < 0.16 && mergedAt === null) mergedAt = elapsedUnits;
    if (distance < 0.08) {
      const centreOfMassPosition = [0, 1, 2].map((axis) => (centres[0].position[axis] * centres[0].mass + centres[1].position[axis] * centres[1].mass) / totalMass);
      const centreOfMassVelocity = [0, 1, 2].map((axis) => (centres[0].velocity[axis] * centres[0].mass + centres[1].velocity[axis] * centres[1].mass) / totalMass);
      centres.forEach((centre, index) => {
        for (let axis = 0; axis < 3; axis += 1) {
          centre.position[axis] = centreOfMassPosition[axis] + (index ? 0.018 : -0.018) * (axis === 0 ? 1 : 0);
          centre.velocity[axis] = centreOfMassVelocity[axis];
        }
      });
    }
  }

  return {
    update({ delta, audio }) {
      const rate = controls.speed / 0.08;
      accumulator += Math.min(delta, 0.05) * rate * (reducedMotion ? 0.18 : 0.72);
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < 14) {
        integrate(FIXED_STEP);
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      if (elapsedUnits * GYR_PER_UNIT > RESET_AFTER_GYR) resetSimulation();

      positionAttribute.needsUpdate = steps > 0;
      centres.forEach((centre, index) => coreMeshes[index].position.fromArray(centre.position));
      uniforms.uHigh.value = audio.high || 0;
      uniforms.uEnergy.value = audio.rms || 0;
      bloom.strength = controls.glow * (0.36 + (audio.rms || 0) * 0.12);
      orbit.update();

      const distanceKpc = Math.max(0, centreSeparation(centres[0], centres[1]) * KPC_PER_UNIT);
      const phase = mergedAt === null ? (distanceKpc < 80 ? 'close passage' : 'orbital decay') : 'merged remnant';
      readout.innerHTML = `<strong>MERGER-COMPATIBLE REALISATION</strong><span>t + ${(elapsedUnits * GYR_PER_UNIT).toFixed(2)} Gyr</span><span>${distanceKpc.toFixed(0)} kpc separation</span><span>${phase}</span>`;
    },
    resize({ width, height }) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      composer.setSize(width, height);
    },
    render() { composer.render(); },
    getControls() { return { ...controls }; },
    setControls(next) {
      if (Number.isFinite(next.speed)) controls.speed = Math.max(0, Math.min(0.3, next.speed));
      if (Number.isFinite(next.scale)) {
        controls.scale = Math.max(0.4, Math.min(1.8, next.scale));
        uniforms.uScale.value = controls.scale;
      }
      if (Number.isFinite(next.glow)) controls.glow = Math.max(0.4, Math.min(1.8, next.glow));
      if (next.paletteA) {
        controls.paletteA = next.paletteA;
        uniforms.uMilkyWay.value.set(next.paletteA);
      }
    },
    resetView() {
      orbit.reset();
      resetSimulation();
    },
    dispose() {
      readout.remove();
      orbit.dispose();
      composer.dispose();
      geometry.dispose();
      material.dispose();
      coreGeometry.dispose();
      coreMaterials.forEach((item) => item.dispose());
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      scene.clear();
    }
  };
}
