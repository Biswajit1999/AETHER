const vertexShader = `
precision highp float;
attribute float aPhase;
attribute float aBand;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uMotion;
uniform float uScale;
uniform float uMode;
uniform float uSpeed;
varying float vPhase;
varying float vEnergy;
varying float vSide;
void main() {
  vec3 p = position;
  float clock = uTime * uSpeed * uMotion;
  if (uMode > 0.5 && uMode < 1.5) {
    float life = fract(aBand + clock * 0.42);
    float angle = aPhase * 81.6814;
    float launch = 0.75 + fract(aPhase * 117.31) * 1.05;
    p = vec3(cos(angle) * launch * life, -1.05 + 4.7 * life - 4.4 * life * life, sin(angle) * launch * life);
  } else if (uMode > 1.5 && uMode < 2.5) {
    float angle = clock * 1.7;
    float side = sign(position.x);
    vec3 local = position - vec3(side * 0.72, 0.0, 0.0);
    p = local + vec3(side * (0.58 + 0.14 * cos(angle)), side * 0.34 * sin(angle), 0.0);
  } else if (uMode > 2.5 && uMode < 3.5) {
    float side = sign(p.x);
    vec3 local = p - vec3(side * 0.82, 0.0, 0.0);
    float separation = 0.18 + 0.92 * abs(cos(clock * 0.42));
    p = local + vec3(side * separation, 0.12 * sin(clock + aPhase * 6.28), 0.0);
  } else if (uMode > 3.5 && uMode < 4.5) {
    float blast = fract(aBand * 0.18 + clock * 0.18);
    p = normalize(p + vec3(0.0001)) * (0.1 + blast * 1.85);
  } else if (uMode > 4.5 && uMode < 5.5) {
    float angle = clock * 2.4;
    float cOrbit = cos(angle), sOrbit = sin(angle);
    p.xz = mat2(cOrbit, -sOrbit, sOrbit, cOrbit) * p.xz;
    p *= 0.88 + 0.16 * sin(clock * 3.0 + aPhase * 18.0);
  } else if (uMode > 5.5 && uMode < 6.5) {
    float direction = sign(p.y);
    float flow = fract(abs(p.y) * 0.42 + aBand + clock * 0.52);
    p.y = direction * (0.12 + flow * 2.25);
    p.xz *= 0.35 + flow * 1.15;
  } else if (uMode > 6.5 && uMode < 7.5) {
    p.y += 0.2 * sin(clock * 1.4 + p.x * 3.0 + aPhase * 6.28);
    p.z += 0.16 * sin(clock + p.x * 2.1);
  } else if (uMode > 7.5 && uMode < 8.5) {
    p *= 0.88 + 0.14 * sin(clock * 1.3 + aPhase * 9.0);
  } else if (uMode > 8.5 && uMode < 9.5) {
    float angle = clock * 2.2 + p.y * 0.25;
    float cField = cos(angle), sField = sin(angle);
    p.xz = mat2(cField, -sField, sField, cField) * p.xz;
  } else if (uMode > 9.5) {
    p *= 0.82 + 0.18 * smoothstep(-1.0, 1.0, sin(clock * 0.8 + aPhase * 12.0));
  }
  float pulse = sin(aPhase * 18.8496 + uTime * (0.35 + aBand)) * (0.025 + uBass * 0.13);
  p += normalize(p + vec3(0.0001)) * pulse * uMotion;
  float twist = (uTime * 0.045 + uMid * 0.22) * uMotion;
  float c = cos(twist), s = sin(twist);
  p.xz = mat2(c, -s, s, c) * p.xz;
  vec4 mv = modelViewMatrix * vec4(p * uScale, 1.0);
  float binaryCore = uMode > 1.5 && uMode < 2.5 ? exp(-12.0 * min(length(position - vec3(-0.72,0.0,0.0)), length(position - vec3(0.72,0.0,0.0)))) : 0.0;
  gl_PointSize = clamp((2.4 + uHigh * 8.0 + aBand * 1.8 + binaryCore * 15.0) * (2.6 / -mv.z), 1.0, 24.0);
  gl_Position = projectionMatrix * mv;
  vPhase = aPhase;
  vEnergy = clamp(uBass * 0.45 + uMid * 0.35 + uHigh * 0.2, 0.0, 1.0);
  vSide = step(0.0, position.x);
}`;

const fragmentShader = `
precision highp float;
uniform float uTime;
uniform float uMode;
uniform vec3 uPaletteA;
uniform vec3 uPaletteB;
varying float vPhase;
varying float vEnergy;
varying float vSide;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q);
  float alpha = 1.0 - smoothstep(0.12, 0.5, r);
  float core = 1.0 - smoothstep(0.0, 0.1, r);
  float mixValue = uMode > 1.5 && uMode < 2.5 ? vSide : 0.5 + 0.5 * sin(vPhase * 12.566 + uTime * 0.14);
  vec3 colour = mix(uPaletteA, uPaletteB, mixValue) * 0.58;
  colour += core * (0.12 + vEnergy * 0.3);
  gl_FragColor = vec4(colour, alpha * 0.16);
}`;

export function sampleTopology(kind, random, index, count) {
  const t = index / count;
  const tau = Math.PI * 2;
  const u = random() * tau;
  const v = random() * tau;
  const n = () => random() * 2 - 1;
  switch (kind) {
    case 'mobius': {
      const w = n() * 0.55;
      return [(1 + w * Math.cos(u / 2)) * Math.cos(u), w * Math.sin(u / 2), (1 + w * Math.cos(u / 2)) * Math.sin(u)];
    }
    case 'klein': {
      const r = 1.25 + 0.35 * Math.cos(v);
      return [r * Math.cos(u), 0.55 * Math.sin(v), r * Math.sin(u) + 0.22 * Math.sin(u * 2)];
    }
    case 'torus-knot': {
      const a = t * tau * 7;
      const r = 1 + 0.32 * Math.cos(3 * a);
      return [r * Math.cos(2 * a) + n() * 0.04, 0.32 * Math.sin(3 * a) + n() * 0.04, r * Math.sin(2 * a) + n() * 0.04];
    }
    case 'gyroid': {
      let x, y, z, g;
      do { x = n() * Math.PI; y = n() * Math.PI; z = n() * Math.PI; g = Math.sin(x)*Math.cos(y)+Math.sin(y)*Math.cos(z)+Math.sin(z)*Math.cos(x); } while (Math.abs(g) > 0.13);
      return [x / 2.4, y / 2.4, z / 2.4];
    }
    case 'galaxy': {
      const arm = index % 5;
      const radius = Math.pow(random(), 0.55) * 1.65;
      const a = arm / 5 * tau + radius * 3.9 + n() * 0.16;
      return [radius * Math.cos(a), n() * 0.1 * (1.7 - radius), radius * Math.sin(a)];
    }
    case 'membrane': {
      const x = n() * 1.65, z = n() * 1.65;
      return [x, 0.28 * Math.sin(x * 3.2) * Math.cos(z * 3.2), z];
    }
    case 'vortex': {
      const a = u, tube = 0.24 + n() * 0.1, ring = 1.05;
      return [(ring + tube * Math.cos(v)) * Math.cos(a), tube * Math.sin(v), (ring + tube * Math.cos(v)) * Math.sin(a)];
    }
    case 'flower': {
      const radius = Math.sqrt(random()) * 1.5, a = u;
      return [radius * Math.cos(a), 0.34 * Math.sin(7 * a) * (1 - radius / 1.6), radius * Math.sin(a)];
    }
    case 'dna': {
      const a = t * tau * 9, strand = index % 2 ? 1 : -1;
      return [0.68 * Math.cos(a + (strand < 0 ? Math.PI : 0)), (t - 0.5) * 3, 0.68 * Math.sin(a + (strand < 0 ? Math.PI : 0))];
    }
    case 'clifford': {
      const a = u, b = v;
      return [Math.cos(a) * (1 + 0.42 * Math.cos(b)), Math.sin(a) * (1 + 0.42 * Math.cos(b)), 0.42 * Math.sin(b + a * 2)];
    }
    case 'harmonic': {
      const phi = Math.acos(n()), theta = u, radius = 1 + 0.25 * Math.sin(5 * theta) * Math.sin(3 * phi);
      return [radius*Math.sin(phi)*Math.cos(theta), radius*Math.cos(phi), radius*Math.sin(phi)*Math.sin(theta)];
    }
    case 'cube': {
      const face = index % 6, a = n() * 1.1, b = n() * 1.1;
      return face===0?[1.1,a,b]:face===1?[-1.1,a,b]:face===2?[a,1.1,b]:face===3?[a,-1.1,b]:face===4?[a,b,1.1]:[a,b,-1.1];
    }
    case 'cone': {
      const y = n() * 1.35, radius = (1.35 - y) * 0.48;
      return [radius * Math.cos(u), y, radius * Math.sin(u)];
    }
    case 'helix': {
      const a = t * tau * 14;
      return [(0.85 + n()*0.08)*Math.cos(a), (t-0.5)*3, (0.85+n()*0.08)*Math.sin(a)];
    }
    case 'ocean': {
      const x=n()*1.7,z=n()*1.7; return [x,0.18*Math.sin(x*4+z*2)+0.12*Math.cos(z*5),z];
    }
    case 'accretion': {
      const radius=0.25+Math.pow(random(),0.55)*1.45,a=u+radius*2; return [radius*Math.cos(a),n()*0.07/(radius+0.25),radius*Math.sin(a)];
    }
    case 'neural': {
      const cluster=index%12,a=cluster/12*tau,r=Math.pow(random(),2)*1.2; return [Math.cos(a)*0.85+n()*r*0.28,n()*0.7,Math.sin(a)*0.85+n()*r*0.28];
    }
    case 'crystal': {
      const phi=Math.acos(n()),theta=u,radius=0.45+Math.round(random()*4)*0.25; return [radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta)];
    }
    case 'superformula': {
      const m=7, a=1,b=1,n1=.3,n2=1.7,n3=1.7;
      const rr=Math.pow(Math.pow(Math.abs(Math.cos(m*u/4)/a),n2)+Math.pow(Math.abs(Math.sin(m*u/4)/b),n3),-1/n1);
      return [rr*Math.cos(u),n()*0.6,rr*Math.sin(u)];
    }
    case 'lissajous': {
      const a=t*tau*12; return [1.2*Math.sin(3*a+.4),1.0*Math.sin(4*a),1.2*Math.sin(5*a+.8)];
    }
    case 'shell': {
      const a=t*tau*4.2,r=.12*Math.exp(.08*a); return [r*Math.cos(a),n()*.10+r*.25,r*Math.sin(a)];
    }
    case 'rose': {
      const r=1.35*Math.cos(5*u); return [r*Math.cos(u),n()*.18,r*Math.sin(u)];
    }
    case 'fountain': {
      const life=random(),a=u,speed=.5+random(); return [Math.cos(a)*speed*life,1.8*life-2.1*life*life,Math.sin(a)*speed*life];
    }
    case 'rings': {
      const ring=index%9,r=.35+ring*.14; return [r*Math.cos(u),n()*.05+(ring-4)*.12,r*Math.sin(u)];
    }
    case 'galaxy-merger': {
      const galaxy=index%2, arm=index%4, radius=Math.pow(random(),.62)*1.18;
      const a=arm/4*tau+radius*4.8+n()*(.12+radius*.05)+(galaxy?Math.PI:0);
      const core=Math.exp(-radius*3.2), discY=n()*(.035+radius*.075);
      let x=radius*Math.cos(a), y=discY, z=radius*Math.sin(a);
      const tilt=galaxy?.46:-.28, ct=Math.cos(tilt),st=Math.sin(tilt);
      const ty=y*ct-z*st; z=y*st+z*ct; y=ty;
      const offset=galaxy?.76:-.76;
      if(radius>.78 && random()>.72){const tail=(radius-.78)*2.7; x+=galaxy?tail:-tail; z+=(galaxy?-1:1)*tail*.45; y+=n()*.12*tail;}
      return [offset+x,y,z+(galaxy?.2:-.2)+core*n()*.05];
    }
    case 'binary-stars': {
      const star=index%2, phi=Math.acos(n()), theta=u, radius=Math.pow(random(),.42)*.38;
      return [(star?.72:-.72)+radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta)];
    }
    case 'stellar-collision': {
      const side=index%2?1:-1, progress=random(), spread=Math.pow(progress,1.8);
      return [side*(1.25-progress*1.15)+n()*.22*spread,n()*.65*spread,n()*.65*spread];
    }
    case 'supernova': {
      const phi=Math.acos(n()),theta=u,shell=.3+Math.pow(random(),.22)*1.3;
      return [shell*Math.sin(phi)*Math.cos(theta),shell*Math.cos(phi),shell*Math.sin(phi)*Math.sin(theta)];
    }
    case 'neutron-merger': {
      const core=index%3<2,side=index%2?1:-1;
      if(core){const phi=Math.acos(n()),theta=u,r=.18*Math.pow(random(),.4);return [side*.48+r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta)];}
      const radius=.35+random()*1.35;return [radius*Math.cos(u),n()*.09,radius*Math.sin(u)];
    }
    case 'jets': {
      const jet=index%2?1:-1,y=jet*(.2+Math.pow(random(),.6)*1.7),radius=.03+Math.abs(y)*.12;
      return [n()*radius,y,n()*radius];
    }
    case 'tidal': {
      const tail=t*3.4-1.7;return [tail,.25*Math.sin(tail*3)+n()*.12*(1-Math.abs(t-.5)),.3*Math.cos(tail*2)+n()*.1];
    }
    case 'nebula': {
      const lobe=index%2?1:-1,phi=Math.acos(n()),theta=u,r=Math.pow(random(),.45)*1.4;
      return [r*Math.sin(phi)*Math.cos(theta)*.55,lobe*Math.abs(r*Math.cos(phi))*1.2,r*Math.sin(phi)*Math.sin(theta)*.55];
    }
    case 'magnetar': {
      const line=index%18,a=line/18*tau,s=t*2-1,r=.25+1.1*(1-s*s);
      return [r*Math.cos(a),s*1.5,r*Math.sin(a)];
    }
    case 'cosmic-web': {
      const filament=index%24,a=filament/24*tau,s=n()*1.6;
      const bend=.35*Math.sin(s*2+filament);return [s*Math.cos(a)+bend,n()*.07,s*Math.sin(a)+bend];
    }
    case 'sphere':
    default: {
      const phi=Math.acos(n()),theta=u,radius=Math.pow(random(),.35)*1.3; return [radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta)];
    }
  }
}

const topologyModes = {
  fountain: 1,
  'binary-stars': 2,
  'stellar-collision': 3,
  supernova: 4,
  'neutron-merger': 5,
  jets: 6,
  tidal: 7,
  nebula: 8,
  magnetar: 9,
  'cosmic-web': 10
};

function solveKepler(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

export function createStudy(runtime, config) {
  const { THREE, renderer, random, reducedMotion } = runtime;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.background);
  const camera = new THREE.PerspectiveCamera(config.fov ?? 48, 1, 0.01, 100);
  camera.position.set(0.35, 0.75, config.distance ?? 4.2);
  if (config.topology === 'binary-stars') camera.position.set(0, 0, config.distance ?? 4.2);
  const orbitControls = new OrbitControls(camera, runtime.canvas);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.055;
  orbitControls.enablePan = false;
  orbitControls.minDistance = 1.8;
  orbitControls.maxDistance = 8;
  orbitControls.autoRotate = true;
  orbitControls.autoRotateSpeed = config.cameraSpeed ? config.cameraSpeed * 24 : 0.35;
  orbitControls.zoomToCursor = true;
  orbitControls.saveState();
  const mobile = window.matchMedia('(pointer: coarse)').matches;
  const count = mobile ? 22000 : 52000;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const bands = new Float32Array(count);
  for (let i=0;i<count;i+=1) {
    const p=sampleTopology(config.topology,random,i,count);
    positions.set(p,i*3); phases[i]=i/count; bands[i]=random();
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
  geometry.setAttribute('aBand',new THREE.BufferAttribute(bands,1));
  const controls={speed:config.speed??.08,scale:config.scale??1,glow:config.bloom??1.35,paletteA:config.palette[0],paletteB:config.palette[1],background:config.background};
  const mode = topologyModes[config.topology] ?? 0;
  const uniforms={uTime:{value:0},uBass:{value:0},uMid:{value:0},uHigh:{value:0},uMotion:{value:reducedMotion?.12:1},uScale:{value:controls.scale},uMode:{value:mode},uSpeed:{value:Math.max(1.5,controls.speed*28)},uPaletteA:{value:new THREE.Color(controls.paletteA)},uPaletteB:{value:new THREE.Color(controls.paletteB)}};
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const points=new THREE.Points(geometry,material); scene.add(points);
  let binaryGeometry = null;
  let binaryMaterials = [];
  const binaryCores = [];
  let orbitGeometry = null;
  let orbitMaterial = null;
  let haloGeometry = null;
  let haloMaterials = [];
  if (mode === 2) {
    points.visible = false;
    binaryGeometry = new THREE.SphereGeometry(.16, 22, 16);
    haloGeometry = new THREE.SphereGeometry(.36, 22, 16);
    binaryMaterials = [
      new THREE.MeshBasicMaterial({color:controls.paletteA,transparent:true,opacity:.95,depthTest:false}),
      new THREE.MeshBasicMaterial({color:controls.paletteB,transparent:true,opacity:.95,depthTest:false})
    ];
    haloMaterials = [
      new THREE.MeshBasicMaterial({color:controls.paletteA,transparent:true,opacity:.2,depthTest:false,blending:THREE.AdditiveBlending}),
      new THREE.MeshBasicMaterial({color:controls.paletteB,transparent:true,opacity:.2,depthTest:false,blending:THREE.AdditiveBlending})
    ];
    binaryMaterials.forEach((coreMaterial,index) => { const system = new THREE.Group(); const halo = new THREE.Mesh(haloGeometry,haloMaterials[index]); const core = new THREE.Mesh(binaryGeometry,coreMaterial); halo.renderOrder=3;core.renderOrder=4;system.add(halo,core);binaryCores.push(system);scene.add(system); });
    const binary = config.binary ?? {massA:1,massB:1,semiMajorAxis:1.45,eccentricity:.2};
    const orbitPoints = Array.from({length:129},(_,i)=>{const E=i/128*Math.PI*2;return new THREE.Vector3(binary.semiMajorAxis*(Math.cos(E)-binary.eccentricity),binary.semiMajorAxis*Math.sqrt(1-binary.eccentricity**2)*Math.sin(E),0)});
    orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    orbitMaterial = new THREE.LineBasicMaterial({color:0x46658c,transparent:true,opacity:.36,depthTest:false});
    scene.add(new THREE.Line(orbitGeometry,orbitMaterial));
  }
  const starCount=mobile?700:1800, starPositions=new Float32Array(starCount*3);
  for(let i=0;i<starCount;i+=1){const radius=7+random()*12,phi=Math.acos(random()*2-1),theta=random()*Math.PI*2;starPositions.set([radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta)],i*3);}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
  const starMaterial=new THREE.PointsMaterial({color:0x789dcc,size:.018,transparent:true,opacity:.62,depthWrite:false});scene.add(new THREE.Points(starGeometry,starMaterial));
  const composer=new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  composer.addPass(new RenderPass(scene,camera));
  const bloomPass=new UnrealBloomPass(new THREE.Vector2(1,1),(config.bloom??1.35)*.04,.16,.86);
  composer.addPass(bloomPass);composer.addPass(new OutputPass());
  return {
    update({time,delta,audio}) { uniforms.uTime.value=time; uniforms.uBass.value=audio.bass??0; uniforms.uMid.value=audio.mid??0; uniforms.uHigh.value=audio.high??0; uniforms.uSpeed.value=Math.max(1.5,controls.speed*28); points.rotation.y=mode?0:time*controls.speed*uniforms.uMotion.value; points.rotation.x=mode?0:Math.sin(time*controls.speed*.7)*.12*uniforms.uMotion.value; if(mode===2){const binary=config.binary??{massA:1,massB:1,semiMajorAxis:1.45,eccentricity:.2};const totalMass=binary.massA+binary.massB;const meanMotion=Math.sqrt(totalMass/(binary.semiMajorAxis**3));const meanAnomaly=(time*Math.max(.15,controls.speed*5)*meanMotion)%(Math.PI*2);const E=solveKepler(meanAnomaly,binary.eccentricity);const x=binary.semiMajorAxis*(Math.cos(E)-binary.eccentricity),y=binary.semiMajorAxis*Math.sqrt(1-binary.eccentricity**2)*Math.sin(E);binaryCores[0].position.set(-binary.massB/totalMass*x,-binary.massB/totalMass*y,.08);binaryCores[1].position.set(binary.massA/totalMass*x,binary.massA/totalMass*y,.08);binaryCores.forEach((core)=>core.scale.setScalar(1+(audio.bass??0)*.5));} bloomPass.strength=controls.glow*.04+(audio.rms??0)*.08; orbitControls.update(delta); },
    resize({width,height}) { camera.aspect=width/height; camera.updateProjectionMatrix(); composer.setSize(width,height); },
    render() { composer.render(); },
    getControls() { return {...controls,paletteA:`#${uniforms.uPaletteA.value.getHexString()}`,paletteB:`#${uniforms.uPaletteB.value.getHexString()}`,background:`#${scene.background.getHexString()}`}; },
    setControls(next) { if(Number.isFinite(next.speed)) controls.speed=Math.max(0,Math.min(.4,next.speed)); if(Number.isFinite(next.scale)){controls.scale=Math.max(.35,Math.min(2,next.scale));uniforms.uScale.value=controls.scale;} if(Number.isFinite(next.glow)){controls.glow=Math.max(.3,Math.min(2.5,next.glow));bloomPass.strength=controls.glow*.04;} if(next.paletteA) uniforms.uPaletteA.value.set(next.paletteA); if(next.paletteB) uniforms.uPaletteB.value.set(next.paletteB); if(next.background) scene.background.set(next.background); },
    resetView() { orbitControls.reset(); },
    dispose() { orbitControls.dispose();composer.dispose();geometry.dispose();material.dispose();starGeometry.dispose();starMaterial.dispose();binaryGeometry?.dispose();haloGeometry?.dispose();binaryMaterials.forEach((item)=>item.dispose());haloMaterials.forEach((item)=>item.dispose());orbitGeometry?.dispose();orbitMaterial?.dispose();scene.clear(); }
  };
}
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
