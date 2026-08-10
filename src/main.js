import * as THREE from 'three';
import { createAudioAnalyser, createProceduralAudioAnalyser } from './runtime/audio.js';
import { makePRNG } from './runtime/seed.js';
import { prefersReducedMotion } from './runtime/reduced-motion.js';
import { assertImplementsContract } from './runtime/animation-contract.js';
import { equationStudies } from './animations/shared/equation-catalog.js';
import { studies } from './animations/shared/study-catalog.js';
import { rk4Step } from './math/rk4.js';

// AETHER gallery host. Owns the single shared WebGLRenderer (expensive to
// create) and canvas; each published animation under src/animations/ owns its
// own scene/camera and is loaded/disposed on demand through the contract in
// src/runtime/animation-contract.js. The catalogue itself comes from
// public/manifest.json, built by scripts/build-manifest.mjs from every
// meta.json a human has accepted into src/animations/.

const canvas = document.querySelector('#stage');
const audioElement = document.querySelector('#track');
const startButton = document.querySelector('#start');
const muteButton = document.querySelector('#mute');
const prevButton = document.querySelector('#prev');
const nextButton = document.querySelector('#next');
const titleEl = document.querySelector('#animation-title');
const galleryToggle = document.querySelector('#gallery-toggle');
const galleryPanel = document.querySelector('.catalogue-panel');
const galleryGrid = document.querySelector('#gallery-grid');
const filmstrip = document.querySelector('#filmstrip');
const catalogueCount = document.querySelector('#catalogue-count');
const studyClass = document.querySelector('#study-class');
const studyDescription = document.querySelector('#study-description');
const studyIndex = document.querySelector('#study-index');
const speedInput = document.querySelector('#visual-speed');
const scaleInput = document.querySelector('#visual-scale');
const glowInput = document.querySelector('#visual-glow');
const colourInput = document.querySelector('#visual-colour');
const gallerySearch = document.querySelector('#gallery-search');
const studyTags = document.querySelector('#study-tags');
const studyState = document.querySelector('#study-state');
const researchPanel = document.querySelector('#research-panel');
const volumeInput = document.querySelector('#audio-volume');
const meterBars = [...document.querySelectorAll('.audio-meter i')];
const runtimeConsole = document.querySelector('#runtime-console');
const sourceConsole = document.querySelector('#source-console');
const sourceToggle = document.querySelector('#source-console-toggle');
const systemMessage = document.querySelector('#system-message');
const navToggle = document.querySelector('#nav-toggle');
const primaryNavigation = document.querySelector('#primary-navigation');
const localSourceAccess = ['localhost', '127.0.0.1'].includes(window.location.hostname);
let activeFilter = 'all';
let lastConsoleUpdate = 0;

const bundledPlaylist = [
  { title: 'Vastness', artist: 'Andrew Ev', url: './audio/vastness-andrew-ev.mp3' },
  { title: 'Voxscape', artist: 'Eugenio Mininni', url: './audio/voxscape-eugenio-mininni.mp3' },
  { title: 'Cyberpunk City', artist: 'Alejandro Magaña (A. M.)', url: './audio/cyberpunk-city-alejandro-magana.mp3' },
  { title: 'Rest Now', artist: 'Eugenio Mininni', url: './audio/rest-now-eugenio-mininni.mp3' },
  { title: 'Spiritual Moment', artist: 'Diego Nava', url: './audio/spiritual-moment-diego-nava.mp3' },
  { title: 'Xanthos', artist: 'Eugenio Mininni', url: './audio/xanthos-eugenio-mininni.mp3' },
  { title: 'Opalescent', artist: 'Eugenio Mininni', url: './audio/opalescent-eugenio-mininni.mp3' }
];

const reducedMotion = prefersReducedMotion();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.debug.checkShaderErrors = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
const nativeRender = renderer.render.bind(renderer);
let fallbackYaw = 0;
let fallbackPitch = 0;
let fallbackZoom = 1;
renderer.render = (scene, camera) => {
  if (!currentAnimation?.resetView && camera?.isCamera) {
    const position = camera.position.clone();
    const quaternion = camera.quaternion.clone();
    camera.position.multiplyScalar(fallbackZoom);
    camera.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), fallbackPitch);
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), fallbackYaw);
    camera.lookAt(0, 0, 0);
    nativeRender(scene, camera);
    camera.position.copy(position);
    camera.quaternion.copy(quaternion);
    return;
  }
  nativeRender(scene, camera);
};

// Deliberately cap DPR so a 3x/4x phone screen does not multiply fragment cost without limit.
const targetPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(targetPixelRatio);

// Every animation module is bundled as its own chunk and lazily fetched only
// when selected — import.meta.glob lets Vite resolve these dynamic paths at
// build time while keeping the load itself deferred.
const animationLoaders = import.meta.glob('/src/animations/*/*/animation.js');

let manifest = { animations: [] };
let currentIndex = 0;
let currentAnimation = null;
let analyser = null;
let previousFrameTime = performance.now();
let width = window.innerWidth;
let height = window.innerHeight;
let localPlaylist = [...bundledPlaylist];
let activeTrackIndex = -1;
let audioPlaying = false;
let mobileLayout = window.matchMedia('(max-width:720px)').matches;
let sharedTopologySampler = null;

function reportSystemMessage(message, kind = 'notice') {
  if (!systemMessage) return;
  systemMessage.textContent = message;
  systemMessage.dataset.kind = kind;
  systemMessage.hidden = !message;
  if (message) window.setTimeout(() => { if (systemMessage.textContent === message) systemMessage.hidden = true; }, 6500);
}

function seededValue(seed) {
  const source = String(seed);
  let state = 2166136261;
  for (let i = 0; i < source.length; i += 1) state = Math.imul(state ^ source.charCodeAt(i), 16777619) >>> 0;
  return () => ((state = Math.imul(state ^ state >>> 15, 1 | state) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
}

function equationPreviewPoints(entry, count = 1000) {
  const config = equationStudies[`a${entry.order}`];
  if (!config) return null;
  let state = [...config.initial], time = 0;
  const points = [];
  for (let i = 0; i < count + 700; i += 1) {
    state = config.kind === 'map' ? config.iterate(state) : rk4Step(state, time, config.dt, config.derivative); time += config.dt;
    if (i >= 700) { const point = config.project ? config.project(state) : state; if (point.slice(0, 3).every(Number.isFinite)) points.push(point.slice(0, 3)); }
  }
  return points;
}

function topologyPreviewPoints(entry, count = 900) {
  const key = `a${String(entry.order).padStart(3, '0')}`;
  const config = studies[key];
  if (!config || !sharedTopologySampler) return null;
  const random = seededValue(`${entry.seed}:preview`);
  return Array.from({ length: count }, (_, index) => {
    const [x, y, z] = sharedTopologySampler(config.topology, random, index, count);
    return [x * .86 + z * .34, y * .82 - z * .27, 0];
  });
}

function drawPointPreview(context, points, width, height, hue, dot) {
  const finite = points.filter((point) => point.slice(0, 2).every(Number.isFinite));
  if (!finite.length) return false;
  const xs = finite.map((point) => point[0]), ys = finite.map((point) => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6), spanY = Math.max(maxY - minY, 1e-6);
  finite.forEach((point, index) => {
    const x = width * (.08 + .84 * (point[0] - minX) / spanX);
    const y = height * (.88 - .76 * (point[1] - minY) / spanY);
    dot(x, y, 68 + (index % 5) * 4, .42 + (index % 7) * .06, index % 17 === 0 ? 1.8 : 1.05);
  });
  return true;
}

function drawStudyPreview(target, entry) {
  const context = target.getContext('2d');
  const width = target.width;
  const height = target.height;
  const random = seededValue(entry.seed || entry.order);
  const hue = (entry.order * 47) % 360;
  context.fillStyle = '#02050d';
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(width * .5, height * .5, 0, width * .5, height * .5, width * .55);
  glow.addColorStop(0, `hsla(${hue},90%,55%,.28)`);
  glow.addColorStop(1, 'transparent');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  const tags = `${entry.visual?.topology || ''} ${entry.classification || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
  context.globalCompositeOperation = 'lighter';
  const stroke = (light = 68, alpha = .72) => { context.strokeStyle = `hsla(${hue},95%,${light}%,${alpha})`; context.lineWidth = 1.2; };
  const dot = (x, y, light = 72, alpha = .8, size = 1.5) => { context.fillStyle = `hsla(${hue + random() * 55},95%,${light}%,${alpha})`; context.fillRect(x, y, size, size); };
  const equationPoints = equationPreviewPoints(entry);
  if (equationPoints) {
    const xs = equationPoints.map((point) => point[0]), ys = equationPoints.map((point) => point[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    stroke(75, .7); context.lineWidth = .8; context.beginPath();
    equationPoints.forEach((point, i) => {
      const x = width * (.08 + .84 * (point[0] - minX) / Math.max(maxX - minX, 1e-6));
      const y = height * (.88 - .76 * (point[1] - minY) / Math.max(maxY - minY, 1e-6));
      i ? context.lineTo(x, y) : context.moveTo(x, y);
      if (i % 31 === 0) dot(x, y, 86, .9, 1.3);
    });
    context.stroke();
  } else if (drawPointPreview(context, topologyPreviewPoints(entry) || [], width, height, hue, dot)) {
    // Shared studies use the same deterministic topology sampler as the live WebGL scene.
  } else if (/fountain/.test(tags)) {
    for (let stream = 0; stream < 15; stream += 1) {
      const direction = (stream / 14 - .5) * width * .65;
      stroke(68 + stream % 3 * 8, .55);
      context.beginPath();
      for (let i = 0; i <= 28; i += 1) {
        const t = i / 28, x = width / 2 + direction * t, y = height * .84 - height * 1.55 * t + height * 1.28 * t * t;
        i ? context.lineTo(x, y) : context.moveTo(x, y);
        if (i % 4 === 0) dot(x, y, 82, .9, 1.6);
      }
      context.stroke();
    }
  } else if (/binary-stellar|binary-star/.test(tags)) {
    stroke(75, .6); context.beginPath(); context.ellipse(width / 2, height / 2, width * .38, height * .29, -.16, 0, Math.PI * 2); context.stroke();
    [[.32,.57,190],[.68,.43,35]].forEach(([x,y,shift]) => {
      const star = context.createRadialGradient(width*x,height*y,0,width*x,height*y,width*.13);
      star.addColorStop(0,'rgba(255,255,255,1)'); star.addColorStop(.13,`hsla(${hue+shift},100%,78%,.95)`); star.addColorStop(1,'transparent'); context.fillStyle=star; context.fillRect(0,0,width,height);
    });
  } else if (/colliding-stellar|stellar-collision/.test(tags)) {
    for(let i=0;i<230;i+=1){const side=i%2?-1:1,x=width/2+side*(18+random()*width*.28),y=height/2+(random()-.5)*height*.38*(1-Math.abs(x-width/2)/(width*.36));dot(x,y,75,.65,1.2)}
    stroke(82,.8); context.beginPath(); context.moveTo(width*.3,height*.5); context.bezierCurveTo(width*.43,height*.38,width*.57,height*.62,width*.7,height*.5); context.stroke();
  } else if (/supernova|ejecta-shell/.test(tags)) {
    for(let ring=1;ring<6;ring+=1){stroke(72+ring*3,.75-ring*.09);context.beginPath();context.arc(width/2,height/2,ring*width*.062,0,Math.PI*2);context.stroke()}
    for(let ray=0;ray<34;ray+=1){const a=random()*Math.PI*2,r=width*(.1+random()*.38);dot(width/2+Math.cos(a)*r,height/2+Math.sin(a)*r*.56,88,.85,1.5)}
  } else if (/compact-binary|neutron|kilonova/.test(tags)) {
    stroke(78,.55);context.beginPath();context.ellipse(width/2,height/2,width*.31,height*.16,0,0,Math.PI*2);context.stroke();
    [[.42,.5],[.58,.5]].forEach(([x,y])=>{const core=context.createRadialGradient(width*x,height*y,0,width*x,height*y,width*.09);core.addColorStop(0,'white');core.addColorStop(.2,`hsl(${hue},100%,72%)`);core.addColorStop(1,'transparent');context.fillStyle=core;context.fillRect(0,0,width,height)});
  } else if (/bipolar-relativistic|jet/.test(tags)) {
    for(let i=0;i<160;i+=1){const side=i%2?-1:1,y=height/2+side*random()*height*.48,x=width/2+(random()-.5)*(4+Math.abs(y-height/2)*.16);dot(x,y,78,.7,1.2)}
    const core=context.createRadialGradient(width/2,height/2,0,width/2,height/2,width*.13);core.addColorStop(0,'white');core.addColorStop(.2,`hsl(${hue},100%,70%)`);core.addColorStop(1,'transparent');context.fillStyle=core;context.fillRect(0,0,width,height);
  } else if (/tidal|disruption/.test(tags)) {
    for(let strand=0;strand<7;strand+=1){stroke(68+strand*3,.6);context.beginPath();for(let i=0;i<=60;i+=1){const t=i/60,x=width*.08+t*width*.84,y=height*.53+Math.sin(t*7+strand*.3)*height*(.08+t*.09)+(strand-3)*1.5;i?context.lineTo(x,y):context.moveTo(x,y)}context.stroke()}
  } else if (/bipolar-nebular|nebula/.test(tags)) {
    for(let i=0;i<260;i+=1){const side=i%2?-1:1,a=random()*Math.PI*2,r=Math.pow(random(),.55);dot(width/2+Math.cos(a)*r*width*.18,height/2+side*(12+r*height*.34)+Math.sin(a)*r*8,75,.45,1.5)}
  } else if (/magnetic-field|dipole|magnetar/.test(tags)) {
    for(let ring=0;ring<9;ring+=1){stroke(68+ring*2,.55);context.beginPath();context.ellipse(width/2,height/2,width*(.1+ring*.035),height*(.34-ring*.018),ring%2?.18:-.18,0,Math.PI*2);context.stroke()}
  } else if (/cosmic-filament|cosmic-web|causal|branch|l-system/.test(tags)) {
    const nodes=Array.from({length:20},()=>({x:random()*width,y:random()*height}));stroke(68,.38);nodes.forEach((a,i)=>nodes.slice(i+1).forEach(b=>{const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<width*.24){context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke()}}));nodes.forEach(a=>dot(a.x,a.y,85,.9,2));
  } else if (/(galax|spiral-galaxy|accretion)/.test(tags)) {
    for (let i = 0; i < 260; i += 1) {
      const arm = i % (2 + entry.order % 4);
      const radius = Math.pow(random(), .65) * width * .43;
      const angle = radius * .075 + arm * Math.PI + random() * .8;
      const x = width / 2 + Math.cos(angle) * radius;
      const y = height / 2 + Math.sin(angle) * radius * .35;
      context.fillStyle = `hsla(${hue + random() * 65},95%,${60 + random() * 30}%,${.25 + random() * .7})`;
      context.fillRect(x, y, 1 + random() * 1.5, 1 + random() * 1.5);
    }
  } else if (/(wave|ripple|membrane|ocean|chirp|interference)/.test(tags)) {
    for(let line=0;line<12;line+=1){stroke(64+line*2,.25+line*.035);context.beginPath();for(let x=0;x<=width;x+=3){const y=height/2+Math.sin(x*.075+line*.55)*height*.18+(line-6)*3;x?context.lineTo(x,y):context.moveTo(x,y)}context.stroke()}
  } else if (/(cube|lattice|grid|cellular|tesseract)/.test(tags)) {
    stroke(72,.58);for(let i=0;i<9;i+=1){const inset=8+i*5;context.strokeRect(inset,inset*.55,width-inset*2,height-inset*1.1)}
  } else if (/(mobius|klein|torus|knot|rose|ring|lissajous|helix|surface|geometry|topolog|fractal|math)/.test(tags)) {
    context.strokeStyle = `hsla(${hue},95%,68%,.72)`;
    context.lineWidth = 1;
    for (let ring = 0; ring < 7; ring += 1) {
      context.beginPath();
      for (let i = 0; i <= 180; i += 1) {
        const t = i / 180 * Math.PI * 2;
        const n = 2 + entry.order % 7;
        const radius = 14 + ring * 7 + 5 * Math.sin(t * n + ring);
        const x = width / 2 + Math.cos(t) * radius * 1.65;
        const y = height / 2 + Math.sin(t) * radius * .72;
        i ? context.lineTo(x, y) : context.moveTo(x, y);
      }
      context.stroke();
    }
  } else {
    for (let line = 0; line < 18; line += 1) {
      context.beginPath();
      context.strokeStyle = `hsla(${hue + line * 3},95%,65%,${.18 + line / 30})`;
      for (let x = 0; x <= width; x += 3) {
        const y = height / 2 + Math.sin(x * .045 + line * .5) * (8 + line) + (line - 9) * 2;
        x ? context.lineTo(x, y) : context.moveTo(x, y);
      }
      context.stroke();
    }
  }
  context.globalCompositeOperation = 'source-over';
}

function updateResearch(entry) {
  if (studyTags) {
    studyTags.replaceChildren(...(entry.tags || []).slice(0, 5).map((tag) => {
      const chip = document.createElement('span'); chip.textContent = tag; return chip;
    }));
  }
  const physics = entry.physics;
  const equationModel = Boolean(entry.equation);
  studyState.textContent = physics || equationModel ? 'MODELLED STUDY' : 'VISUAL STUDY';
  researchPanel.hidden = !physics && !equationModel;
  if (!physics && !equationModel) return;
  document.querySelector('#study-model-detail').textContent = entry.equation || physics?.model || physics?.method || 'Documented computational model';
  const units = entry.numerics || (physics?.units && typeof physics.units === 'object' ? Object.entries(physics.units).map(([key, value]) => `${key}: ${value}`).join(' · ') : (physics?.units || 'nondimensional simulation units'));
  document.querySelector('#study-units').textContent = units;
  document.querySelector('#study-caveat').textContent = physics?.caveat || physics?.limitations || (equationModel
    ? 'The deterministic trajectory is integrated once at load and replayed as a luminous state-space path; it is a numerical visualisation, not a forecast or measurement.'
    : 'A numerical visualisation of the stated mathematical system; it is not a literal forecast or measurement.');
  const references = document.querySelector('#study-references');
  references.replaceChildren(...(entry.references || []).map((reference) => {
    const link = document.createElement('a');
    link.target = '_blank'; link.rel = 'noreferrer';
    link.href = reference.url || (reference.doi ? `https://doi.org/${reference.doi}` : '#');
    link.textContent = `↗ ${reference.title || reference.doi || 'Reference'}`;
    return link;
  }));
}

function buildRuntime(seed) {
  return {
    THREE,
    renderer,
    canvas,
    seed,
    random: makePRNG(seed),
    reducedMotion
  };
}

async function loadAnimation(index) {
  const entry = manifest.animations[index];
  if (!entry) return;

  const modulePath = `/${entry.path}/animation.js`;
  const loader = animationLoaders[modulePath];
  if (!loader) {
    console.error(`No bundled animation module for ${modulePath}`);
    reportSystemMessage(`The module for ${entry.title} is unavailable in this build.`, 'error');
    return;
  }

  if (currentAnimation) {
    currentAnimation.dispose();
    currentAnimation = null;
  }

  let animation;
  try {
    const mod = await loader();
    animation = assertImplementsContract(mod.createAnimation(buildRuntime(entry.seed)));
    animation.resize({ width, height, pixelRatio: targetPixelRatio });
  } catch (error) {
    reportSystemMessage(`${entry.title} could not start. Choose another study or refresh the page.`, 'error');
    console.error(`AETHER animation load failed: ${entry.slug}`, error);
    return;
  }

  currentAnimation = animation;
  currentIndex = index;
  document.querySelectorAll('.gallery-card[aria-current="true"]').forEach((card) => card.removeAttribute('aria-current'));
  galleryGrid?.querySelector(`[data-index="${index}"]`)?.setAttribute('aria-current', 'true');
  filmstrip?.querySelectorAll('.filmstrip-card').forEach((card) => card.classList.toggle('active', Number(card.dataset.index) === index));
  if (titleEl) titleEl.textContent = entry.title;
  if (studyClass) studyClass.textContent = String(entry.classification ?? 'COMPUTATIONAL STUDY').replaceAll('_', ' ');
  if (studyDescription) studyDescription.textContent = entry.description ?? `An interactive AETHER study exploring ${entry.tags?.slice(0, 3).join(', ') || 'computational motion'}.`;
  if (studyIndex) studyIndex.textContent = `${String(index + 1).padStart(2, '0')} / ${manifest.animations.length}`;
  updateResearch(entry);
  if (runtimeConsole) runtimeConsole.textContent = `[A${String(entry.order).padStart(3, '0')}] ${entry.title}\nmodule loaded\nseed ${entry.seed}\nrenderer WebGL · audio reactive`;
  if (sourceConsole) { sourceConsole.hidden = true; sourceConsole.textContent = ''; }
  if (sourceToggle) sourceToggle.textContent = 'Open local source';
  const controls = currentAnimation.getControls?.();
  if (controls) {
    speedInput.value = controls.speed;
    scaleInput.value = controls.scale;
    colourInput.value = controls.paletteA;
    if (Number.isFinite(controls.glow)) glowInput.value = controls.glow;
    syncControlLabels();
  }
  if (localPlaylist.length > 1 && document.querySelector('#audio-shuffle')?.checked) {
    const trackIndex = audioPlaying
      ? (activeTrackIndex + 1 + Math.floor(Math.random() * (localPlaylist.length - 1))) % localPlaylist.length
      : index % localPlaylist.length;
    if (audioPlaying) playLocalTrack(trackIndex);
    else selectPlaylistTrack(trackIndex);
  }
}

function selectPlaylistTrack(index) {
  if (!localPlaylist.length) return null;
  activeTrackIndex = (index + localPlaylist.length) % localPlaylist.length;
  const track = localPlaylist[activeTrackIndex];
  audioElement.src = track.url;
  const label = track.file ? `${track.file.name} · local only` : `${track.title} — ${track.artist}`;
  document.querySelector('#audio-name').textContent = `${label} · ${activeTrackIndex + 1}/${localPlaylist.length}`;
  return track;
}

async function playLocalTrack(index) {
  if (!selectPlaylistTrack(index)) return;
  if (analyser?.kind !== 'media') {
    await analyser?.dispose?.();
    analyser = await createAudioAnalyser(audioElement);
  }
  try {
    await analyser.resume();
    await audioElement.play();
    audioPlaying = true;
  } catch (error) {
    audioPlaying = false;
    reportSystemMessage('Audio could not start. Interact with the page, then press Play again.', 'error');
    console.error('AETHER audio playback failed', error);
    return;
  }
  startButton.textContent = '❚❚';
  startButton.setAttribute('aria-label', 'Pause');
}

function renderCatalogue() {
  galleryGrid.replaceChildren();
  filmstrip.replaceChildren();
  catalogueCount.textContent = manifest.animations.length;
  manifest.animations.forEach((entry, index) => {
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'gallery-card'; card.dataset.index = index;
    card.style.setProperty('--hue', String((entry.order * 47) % 360));
    card.dataset.tags = `${entry.classification ?? ''} ${(entry.tags ?? []).join(' ')}`.toLowerCase();
    const preview = document.createElement('canvas'); preview.width = 220; preview.height = 124; preview.dataset.previewIndex = index; preview.setAttribute('aria-hidden', 'true');
    drawStudyPreview(preview, entry);
    const number = document.createElement('span'); number.className = 'gallery-number'; number.textContent = `A${String(entry.order).padStart(3, '0')}`;
    const heading = document.createElement('strong'); heading.textContent = entry.title;
    const tags = document.createElement('small'); tags.textContent = entry.tags.slice(0, 2).join(' · ');
    card.append(preview, number, heading, tags);
    card.addEventListener('click', () => { loadAnimation(index); closePanels(); });
    galleryGrid.appendChild(card);
    const thumb = document.createElement('button');
    thumb.type = 'button'; thumb.className = 'filmstrip-card'; thumb.dataset.index = index; thumb.title = entry.title;
    const thumbnail = document.createElement('canvas'); thumbnail.width = 180; thumbnail.height = 94; thumbnail.dataset.previewIndex = index;
    drawStudyPreview(thumbnail, entry); thumb.appendChild(thumbnail);
    thumb.addEventListener('click', () => loadAnimation(index));
    filmstrip.appendChild(thumb);
  });
  import('./animations/shared/study-engine.js').then((module) => {
    sharedTopologySampler = module.sampleTopology;
    document.querySelectorAll('canvas[data-preview-index]').forEach((preview) => {
      const entry = manifest.animations[Number(preview.dataset.previewIndex)];
      if (studies[`a${String(entry?.order).padStart(3, '0')}`]) drawStudyPreview(preview, entry);
    });
  }).catch((error) => console.error('AETHER shared preview sampler failed', error));
}

function applyCatalogueFilter() {
  const query = gallerySearch?.value.trim().toLowerCase() || '';
  galleryGrid.querySelectorAll('.gallery-card').forEach((card) => {
    const searchable = `${card.dataset.tags} ${card.textContent}`.toLowerCase();
    card.hidden = !classifyCard(card, activeFilter) || !searchable.includes(query);
  });
}

function openPanel() {
  galleryPanel.classList.add('open');
  galleryToggle.setAttribute('aria-expanded', 'true');
}

function closePanels() {
  if (!window.matchMedia('(max-width:720px)').matches) return;
  galleryPanel.classList.remove('open');
  galleryToggle.setAttribute('aria-expanded', 'false');
}

function syncControlLabels() {
  document.querySelector('#speed-output').value = `${(Number(speedInput.value) / 0.08).toFixed(2)}×`;
  document.querySelector('#scale-output').value = `${Number(scaleInput.value).toFixed(2)}×`;
  document.querySelector('#glow-output').value = `${Number(glowInput.value).toFixed(2)}×`;
}

function applyVisualControls() {
  syncControlLabels();
  currentAnimation?.setControls?.({
    speed: Number(speedInput.value),
    scale: Number(scaleInput.value),
    glow: Number(glowInput.value),
    paletteA: colourInput.value
  });
  if (!currentAnimation?.getControls) canvas.style.filter = `brightness(${glowInput.value}) saturate(${Math.max(1, Number(glowInput.value))})`;
}

function classifyCard(card, filter) {
  if (filter === 'all') return true;
  const tags = card.dataset.tags;
  if (filter === 'astro') return /(astro|cosm|galax|stellar|gravity|nebula|star)/.test(tags);
  if (filter === 'math') return /(math|geometry|topolog|fractal|surface|wave)/.test(tags);
  return /(particle|field|fluid|swarm|shader)/.test(tags);
}

function resize() {
  const isMobile = window.matchMedia('(max-width:720px)').matches;
  if (isMobile !== mobileLayout) {
    mobileLayout = isMobile;
    galleryPanel.classList.remove('open');
  }
  galleryToggle.setAttribute('aria-expanded', String(!isMobile || galleryPanel.classList.contains('open')));
  const bounds = canvas.getBoundingClientRect();
  width = Math.max(1, bounds.width);
  height = Math.max(1, bounds.height);
  renderer.setSize(width, height, false);
  currentAnimation?.resize({ width, height, pixelRatio: targetPixelRatio });
}
window.addEventListener('resize', resize);

// The deterministic export path for the currently active animation: same
// seed + source + time + audio -> same frame. Playwright invokes this
// directly from scripts/render-frames.mjs, one animation per export run.
export function renderAt(timeSeconds, audio = { bass: 0, mid: 0, high: 0, onset: 0, rms: 0 }) {
  if (!currentAnimation) return;
  currentAnimation.update({ time: timeSeconds, delta: 1 / 30, audio });
  currentAnimation.render();
}
window.renderAt = renderAt;

function frame(now) {
  const delta = Math.min((now - previousFrameTime) / 1000, 0.1);
  previousFrameTime = now;
  const audio = analyser ? analyser.sample() : { bass: 0, mid: 0, high: 0, onset: 0, rms: 0 };
  if (runtimeConsole && now - lastConsoleUpdate > 500) {
    const entry = manifest.animations[currentIndex];
    runtimeConsole.textContent = `[A${String(entry?.order || 0).padStart(3, '0')}] ${entry?.title || 'AETHER'}\nframe ${(now / 1000).toFixed(2)} s\nviewport ${Math.round(width)} × ${Math.round(height)} px\naudio rms ${(audio.rms || 0).toFixed(3)} · bass ${(audio.bass || 0).toFixed(3)}\nrender active · deterministic seed`;
    lastConsoleUpdate = now;
  }
  meterBars.forEach((bar, index) => {
    const energy = audioPlaying ? Math.max(audio.rms || 0, audio.bass || 0, .08) : .035;
    bar.style.setProperty('--meter', `${5 + energy * (12 + (index % 5) * 8)}px`);
  });
  renderAt(now / 1000, audio);
  requestAnimationFrame(frame);
}

async function init() {
  try {
    const response = await fetch('./manifest.json');
    if (!response.ok) throw new Error(`manifest request returned ${response.status}`);
    manifest = await response.json();
  } catch (error) {
    manifest = { animations: [] };
    reportSystemMessage('The study catalogue could not be loaded. Refresh the page to try again.', 'error');
    console.error('AETHER catalogue load failed', error);
  }

  if (manifest.animations.length === 0) {
    console.warn('public/manifest.json has no published animations. Run `npm run manifest` after adding one to src/animations/.');
    if (titleEl) titleEl.textContent = 'No published animations yet';
    reportSystemMessage('No published studies are available in this build.', 'error');
    return;
  }

  resize();
  renderCatalogue();
  await loadAnimation(0);
  requestAnimationFrame(frame);
}

prevButton?.addEventListener('click', () => {
  if (manifest.animations.length === 0) return;
  const next = (currentIndex - 1 + manifest.animations.length) % manifest.animations.length;
  loadAnimation(next);
});

nextButton?.addEventListener('click', () => {
  if (manifest.animations.length === 0) return;
  const next = (currentIndex + 1) % manifest.animations.length;
  loadAnimation(next);
});

galleryToggle?.addEventListener('click', () => galleryPanel.classList.contains('open') ? closePanels() : openPanel());
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePanels();
  if (event.target.matches('textarea, input')) return;
  if (event.key.toLowerCase() === 'g') openPanel();
  if (event.key === 'ArrowRight') nextButton?.click();
  if (event.key === 'ArrowLeft') prevButton?.click();
});

startButton.addEventListener('click', async () => {
  if (audioPlaying) {
    if (analyser?.kind === 'procedural') await analyser.suspend?.();
    else audioElement.pause();
    audioPlaying = false;
    startButton.textContent = '▶';
    startButton.setAttribute('aria-label', 'Play');
    return;
  }
  if (!analyser) {
    analyser = audioElement.src ? await createAudioAnalyser(audioElement) : await createProceduralAudioAnalyser();
  }
  try {
    await analyser.resume();
    if (audioElement.src) await audioElement.play();
    else document.querySelector('#audio-name').textContent = 'Procedural AETHER soundscape · select files to replace it';
    audioPlaying = true;
  } catch (error) {
    audioPlaying = false;
    reportSystemMessage('Audio could not start. Check browser audio permission and try again.', 'error');
    console.error('AETHER audio start failed', error);
    return;
  }
  startButton.textContent = '❚❚';
  startButton.setAttribute('aria-label', 'Pause');
});

muteButton.addEventListener('click', () => {
  audioElement.muted = !audioElement.muted;
  analyser?.setMuted?.(audioElement.muted);
  muteButton.setAttribute('aria-pressed', String(audioElement.muted));
  muteButton.textContent = audioElement.muted ? 'Unmute' : 'Mute';
});

document.querySelectorAll('#category-filters button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('#category-filters button').forEach((item) => item.classList.toggle('active', item === button));
  activeFilter = button.dataset.filter;
  applyCatalogueFilter();
}));
gallerySearch?.addEventListener('input', applyCatalogueFilter);
document.querySelector('#focus-search')?.addEventListener('click', () => { openPanel(); gallerySearch?.focus(); });

[speedInput, scaleInput, glowInput, colourInput].forEach((input) => input?.addEventListener('input', applyVisualControls));
document.querySelector('#reset-visuals')?.addEventListener('click', () => {
  speedInput.value = 0.08; scaleInput.value = 1; glowInput.value = 1; colourInput.value = '#45dfff';
  fallbackYaw = 0; fallbackPitch = 0; fallbackZoom = 1;
  canvas.style.filter = ''; currentAnimation?.resetView?.(); applyVisualControls();
});
document.querySelector('#reset-camera')?.addEventListener('click', () => {
  fallbackYaw = 0; fallbackPitch = 0; fallbackZoom = 1; currentAnimation?.resetView?.();
});
document.querySelector('#fullscreen')?.addEventListener('click', async () => {
  try { await document.querySelector('#viewer')?.requestFullscreen?.(); }
  catch (error) { reportSystemMessage('Fullscreen is unavailable in this browser context.', 'error'); console.error('AETHER fullscreen failed', error); }
});
document.querySelector('#screenshot')?.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `AETHER-${manifest.animations[currentIndex]?.slug ?? 'study'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

const aboutDialog = document.querySelector('#about-dialog');
document.querySelector('#about-toggle')?.addEventListener('click', () => aboutDialog.showModal());
document.querySelector('#about-close')?.addEventListener('click', () => aboutDialog.close());
const laboratoryDialog = document.querySelector('#laboratory-dialog');
document.querySelector('#laboratory-toggle')?.addEventListener('click', () => laboratoryDialog.showModal());
document.querySelector('#laboratory-close')?.addEventListener('click', () => laboratoryDialog.close());
navToggle?.addEventListener('click', () => {
  const open = primaryNavigation.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
primaryNavigation?.addEventListener('click', () => {
  primaryNavigation.classList.remove('open');
  navToggle?.setAttribute('aria-expanded', 'false');
});

audioElement.volume = Number(volumeInput?.value ?? .7);
volumeInput?.addEventListener('input', () => {
  audioElement.volume = Number(volumeInput.value);
  document.querySelector('#volume-output').value = `${Math.round(audioElement.volume * 100)}%`;
});

if (localSourceAccess && sourceToggle) {
  sourceToggle.hidden = false;
  document.querySelector('#source-lock').textContent = 'Local development access · not included in the public interface';
  sourceToggle.addEventListener('click', async () => {
    if (!sourceConsole.hidden) { sourceConsole.hidden = true; sourceToggle.textContent = 'Open local source'; return; }
    const entry = manifest.animations[currentIndex];
    sourceConsole.textContent = 'Loading selected animation source…'; sourceConsole.hidden = false;
    const response = await fetch(`./${entry.path}/animation.js`);
    sourceConsole.textContent = response.ok ? await response.text() : 'Source is available from the local project workspace.';
    sourceToggle.textContent = 'Close local source';
  });
}

document.querySelector('#audio-upload')?.addEventListener('change', async (event) => {
  localPlaylist.filter((track) => track.file).forEach((track) => URL.revokeObjectURL(track.url));
  localPlaylist = [...(event.target.files ?? [])].map((file) => ({ file, url: URL.createObjectURL(file) }));
  if (!localPlaylist.length) return;
  await playLocalTrack(Math.floor(Math.random() * localPlaylist.length));
});

audioElement.addEventListener('ended', () => {
  if (localPlaylist.length > 1) playLocalTrack(activeTrackIndex + 1);
});

const clockEl = document.querySelector('#observatory-clock');
const dateEl = document.querySelector('#observatory-date');
function updateObservatoryClock() {
  const now = new Date();
  if (clockEl) clockEl.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  if (dateEl) dateEl.textContent = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZoneName: 'short' }).format(now);
}
updateObservatoryClock();
setInterval(updateObservatoryClock, 1000);

let fallbackDragging = false;
let fallbackPointerX = 0;
let fallbackPointerY = 0;
canvas.addEventListener('pointerdown', (event) => { if (currentAnimation?.resetView) return; fallbackDragging = true; fallbackPointerX = event.clientX; fallbackPointerY = event.clientY; });
canvas.addEventListener('pointermove', (event) => { if (!fallbackDragging || currentAnimation?.resetView) return; fallbackYaw += (event.clientX - fallbackPointerX) * .006; fallbackPitch = Math.max(-1.2, Math.min(1.2, fallbackPitch + (event.clientY - fallbackPointerY) * .006)); fallbackPointerX = event.clientX; fallbackPointerY = event.clientY; });
canvas.addEventListener('pointerup', () => { fallbackDragging = false; });
canvas.addEventListener('pointerleave', () => { fallbackDragging = false; });
canvas.addEventListener('wheel', (event) => { if (currentAnimation?.resetView) return; event.preventDefault(); fallbackZoom = Math.max(.45, Math.min(2.2, fallbackZoom + event.deltaY * .0008)); }, { passive: false });
canvas.addEventListener('dblclick', () => { fallbackYaw = 0; fallbackPitch = 0; fallbackZoom = 1; currentAnimation?.resetView?.(); });

init();
